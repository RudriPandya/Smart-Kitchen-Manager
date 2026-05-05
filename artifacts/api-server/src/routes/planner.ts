import { Router } from "express";
import { db } from "@workspace/db";
import {
  mealPlansTable, recipesTable, recipeIngredientsTable, kitchenStockTable
} from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

const router = Router();

// GET /api/meal-plan?weekStart=YYYY-MM-DD
router.get("/meal-plan", async (req, res) => {
  try {
    const { weekStart } = req.query as { weekStart?: string };
    if (!weekStart) return res.status(400).json({ error: "weekStart required" });

    // Compute week end (6 days later)
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().slice(0, 10);

    const plans = await db.select().from(mealPlansTable)
      .where(and(gte(mealPlansTable.date, weekStart), lte(mealPlansTable.date, endStr)));

    res.json(plans);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get meal plan" });
  }
});

// POST /api/meal-plan
router.post("/meal-plan", async (req, res) => {
  try {
    const { date, mealType, recipeId, servings } = req.body as {
      date: string;
      mealType: string;
      recipeId: number;
      servings?: number;
    };

    if (!date || !mealType || !recipeId) {
      return res.status(400).json({ error: "date, mealType, and recipeId are required" });
    }

    // Fetch recipe name for denormalisation
    const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, recipeId));
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    const [plan] = await db.insert(mealPlansTable).values({
      date,
      mealType,
      recipeId,
      recipeName: recipe.name,
      servings: servings ?? recipe.servings,
    }).returning();

    res.status(201).json(plan);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add meal to plan" });
  }
});

// PATCH /api/meal-plan/:id  (update servings)
router.patch("/meal-plan/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { servings } = req.body as { servings: number };

    const [updated] = await db.update(mealPlansTable)
      .set({ servings })
      .where(eq(mealPlansTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Plan not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update meal plan" });
  }
});

// DELETE /api/meal-plan/:id
router.delete("/meal-plan/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(mealPlansTable).where(eq(mealPlansTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to remove meal from plan" });
  }
});

// GET /api/meal-plan/shopping-list?weekStart=YYYY-MM-DD
// Returns combined ingredients needed for the week minus what's in stock
router.get("/meal-plan/shopping-list", async (req, res) => {
  try {
    const { weekStart } = req.query as { weekStart?: string };
    if (!weekStart) return res.status(400).json({ error: "weekStart required" });

    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().slice(0, 10);

    const plans = await db.select().from(mealPlansTable)
      .where(and(gte(mealPlansTable.date, weekStart), lte(mealPlansTable.date, endStr)));

    if (plans.length === 0) return res.json({ items: [], totalIngredients: 0 });

    // Aggregate needed ingredients across all planned meals
    const needed: Record<string, { ingredientName: string; totalQty: number; unit: string }> = {};

    for (const plan of plans) {
      const recipeIngredients = await db.select().from(recipeIngredientsTable)
        .where(eq(recipeIngredientsTable.recipeId, plan.recipeId));

      const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, plan.recipeId));
      const scale = plan.servings / (recipe?.servings ?? plan.servings);

      for (const ri of recipeIngredients) {
        if (ri.isOptional) continue;
        const key = ri.ingredientName.toLowerCase();
        const qty = (ri.quantity ?? 0) * scale;
        if (!needed[key]) {
          needed[key] = { ingredientName: ri.ingredientName, totalQty: 0, unit: ri.unit ?? "" };
        }
        needed[key].totalQty += qty;
      }
    }

    // Compare against current stock
    const stock = await db.select().from(kitchenStockTable);
    const stockMap: Record<string, number> = {};
    for (const s of stock) {
      stockMap[s.ingredientName.toLowerCase()] = s.quantity;
    }

    const items = Object.values(needed).map(item => {
      const inStock = stockMap[item.ingredientName.toLowerCase()] ?? 0;
      const missing = Math.max(0, item.totalQty - inStock);
      return {
        ingredientName: item.ingredientName,
        needed: Math.round(item.totalQty * 10) / 10,
        inStock: Math.round(inStock * 10) / 10,
        missing: Math.round(missing * 10) / 10,
        unit: item.unit,
        status: inStock >= item.totalQty ? "have" : inStock > 0 ? "partial" : "missing",
      };
    });

    items.sort((a, b) => {
      const order = { missing: 0, partial: 1, have: 2 };
      return order[a.status] - order[b.status];
    });

    res.json({
      items,
      totalIngredients: items.length,
      missingCount: items.filter(i => i.status !== "have").length,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to generate shopping list" });
  }
});

export default router;
