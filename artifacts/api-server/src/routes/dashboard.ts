import { Router } from "express";
import { db } from "@workspace/db";
import { kitchenStockTable, recipesTable, recipeIngredientsTable, shoppingListTable, activityLogTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

function getStatus(quantity: number, lowThreshold: number) {
  if (quantity <= 0) return "out";
  if (quantity <= lowThreshold) return "low";
  return "in_stock";
}

router.get("/dashboard/summary", async (req, res) => {
  try {
    const stock = await db.select().from(kitchenStockTable);
    const recipes = await db.select().from(recipesTable);
    const shopping = await db.select().from(shoppingListTable);

    const inStockNames = stock
      .filter(s => s.quantity > 0)
      .map(s => s.ingredientName.toLowerCase());

    let canCookNow = 0;
    for (const recipe of recipes) {
      const recipeIngredients = await db
        .select()
        .from(recipeIngredientsTable)
        .where(eq(recipeIngredientsTable.recipeId, recipe.id));

      const required = recipeIngredients.filter(i => !i.isOptional);
      if (required.length === 0) continue;
      const allHave = required.every(i => inStockNames.includes(i.ingredientName.toLowerCase()));
      if (allHave) canCookNow++;
    }

    const categoryCounts: Record<string, number> = {};
    for (const s of stock) {
      categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    }

    res.json({
      totalIngredients: stock.length,
      inStockCount: stock.filter(s => getStatus(s.quantity, s.lowThreshold) === "in_stock").length,
      lowStockCount: stock.filter(s => getStatus(s.quantity, s.lowThreshold) === "low").length,
      outOfStockCount: stock.filter(s => getStatus(s.quantity, s.lowThreshold) === "out").length,
      totalRecipes: recipes.length,
      canCookNow,
      shoppingListCount: shopping.filter(s => !s.isChecked).length,
      categoryBreakdown: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

router.get("/dashboard/activity", async (req, res) => {
  try {
    const activity = await db.select().from(activityLogTable)
      .orderBy(desc(activityLogTable.timestamp))
      .limit(20);
    res.json(activity.map(a => ({
      id: a.id,
      type: a.type,
      description: a.description,
      timestamp: a.timestamp,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get activity" });
  }
});

router.get("/dashboard/low-stock", async (req, res) => {
  try {
    const stock = await db.select().from(kitchenStockTable);
    const lowItems = stock
      .filter(s => s.quantity <= s.lowThreshold)
      .map(s => ({
        id: s.id,
        ingredientId: s.ingredientId,
        ingredientName: s.ingredientName,
        category: s.category,
        quantity: s.quantity,
        unit: s.unit,
        lowThreshold: s.lowThreshold,
        status: getStatus(s.quantity, s.lowThreshold),
        updatedAt: s.updatedAt,
      }));
    res.json(lowItems);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get low stock items" });
  }
});

export default router;
