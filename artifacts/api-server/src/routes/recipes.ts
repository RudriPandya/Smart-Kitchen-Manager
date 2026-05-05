import { Router } from "express";
import { db } from "@workspace/db";
import { recipesTable, recipeIngredientsTable, ingredientsTable, kitchenStockTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function formatRecipe(r: typeof recipesTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    cuisineType: r.cuisineType,
    prepTimeMins: r.prepTimeMins,
    servings: r.servings,
    isVegetarian: r.isVegetarian,
    imageUrl: r.imageUrl,
    isAiGenerated: r.isAiGenerated,
    createdAt: r.createdAt,
  };
}

router.get("/recipes", async (req, res) => {
  try {
    const { cuisine, vegetarian, maxTime } = req.query as { cuisine?: string; vegetarian?: string; maxTime?: string };
    let rows = await db.select().from(recipesTable);
    if (cuisine) rows = rows.filter(r => r.cuisineType.toLowerCase() === cuisine.toLowerCase());
    if (vegetarian === "true") rows = rows.filter(r => r.isVegetarian);
    if (maxTime) rows = rows.filter(r => r.prepTimeMins <= parseInt(maxTime));
    res.json(rows.map(formatRecipe));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list recipes" });
  }
});

router.post("/recipes", async (req, res) => {
  try {
    const { name, description, cuisineType, prepTimeMins, servings, isVegetarian, instructions, ingredients } = req.body;
    const [recipe] = await db.insert(recipesTable).values({
      name, description, cuisineType, prepTimeMins, servings, isVegetarian, instructions,
    }).returning();

    if (ingredients && Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        const [existing] = await db.select().from(ingredientsTable).where(
          eq(ingredientsTable.name, ing.ingredientName)
        );
        await db.insert(recipeIngredientsTable).values({
          recipeId: recipe.id,
          ingredientId: existing?.id ?? null,
          ingredientName: ing.ingredientName,
          quantity: ing.quantity,
          unit: ing.unit,
          isOptional: ing.isOptional ?? false,
        });
      }
    }

    res.status(201).json(formatRecipe(recipe));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create recipe" });
  }
});

router.get("/recipes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, id));
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    const ingredients = await db.select().from(recipeIngredientsTable).where(eq(recipeIngredientsTable.recipeId, id));

    res.json({
      ...formatRecipe(recipe),
      instructions: recipe.instructions,
      ingredients: ingredients.map(i => ({
        id: i.id,
        ingredientId: i.ingredientId,
        ingredientName: i.ingredientName,
        quantity: i.quantity,
        unit: i.unit,
        isOptional: i.isOptional,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get recipe" });
  }
});

// Cook a recipe: deduct scaled ingredient quantities from kitchen stock
router.post("/recipes/:id/cook", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { servings: requestedServings } = req.body as { servings?: number };

    const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, id));
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    // Scale factor based on requested vs base servings
    const scale = requestedServings && recipe.servings > 0
      ? requestedServings / recipe.servings
      : 1;

    const recipeIngredients = await db
      .select()
      .from(recipeIngredientsTable)
      .where(eq(recipeIngredientsTable.recipeId, id));

    const deducted: { ingredientName: string; deducted: number; unit: string }[] = [];
    const notFound: string[] = [];

    for (const ing of recipeIngredients) {
      if (ing.isOptional) continue;

      const [stockItem] = await db.select().from(kitchenStockTable)
        .where(eq(kitchenStockTable.ingredientName, ing.ingredientName));

      if (stockItem) {
        const deductAmount = Math.round(((ing.quantity ?? 1) * scale) * 100) / 100;
        const newQty = Math.max(0, stockItem.quantity - deductAmount);
        await db.update(kitchenStockTable)
          .set({ quantity: newQty, updatedAt: new Date() })
          .where(eq(kitchenStockTable.id, stockItem.id));
        deducted.push({ ingredientName: ing.ingredientName, deducted: deductAmount, unit: ing.unit ?? stockItem.unit });
      } else {
        notFound.push(ing.ingredientName);
      }
    }

    const servingsNote = requestedServings ? ` for ${requestedServings} ${requestedServings === 1 ? "person" : "people"}` : "";
    await db.insert(activityLogTable).values({
      type: "cooked",
      description: `Cooked ${recipe.name}${servingsNote} — deducted ${deducted.length} ingredient(s) from stock`,
    });

    res.json({ success: true, recipeName: recipe.name, servings: requestedServings ?? recipe.servings, scale, deducted, notFound });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to cook recipe" });
  }
});

export default router;
