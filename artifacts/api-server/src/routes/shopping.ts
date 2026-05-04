import { Router } from "express";
import { db } from "@workspace/db";
import { shoppingListTable, kitchenStockTable, recipeIngredientsTable, activityLogTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function formatShoppingItem(item: typeof shoppingListTable.$inferSelect) {
  return {
    id: item.id,
    ingredientId: item.ingredientId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    reason: item.reason,
    isChecked: item.isChecked,
    isManual: item.isManual,
    createdAt: item.createdAt,
  };
}

router.get("/shopping", async (req, res) => {
  try {
    const items = await db.select().from(shoppingListTable).orderBy(shoppingListTable.createdAt);
    res.json(items.map(formatShoppingItem));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list shopping items" });
  }
});

router.post("/shopping", async (req, res) => {
  try {
    const { name, quantity, unit, ingredientId, reason } = req.body;
    const [item] = await db.insert(shoppingListTable).values({
      name,
      quantity: quantity ?? null,
      unit: unit ?? null,
      ingredientId: ingredientId ?? null,
      reason: reason ?? null,
      isChecked: false,
      isManual: true,
    }).returning();
    res.status(201).json(formatShoppingItem(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create shopping item" });
  }
});

router.delete("/shopping/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(shoppingListTable).where(eq(shoppingListTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete shopping item" });
  }
});

router.patch("/shopping/:id/check", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isChecked } = req.body;
    const [item] = await db.update(shoppingListTable)
      .set({ isChecked })
      .where(eq(shoppingListTable.id, id))
      .returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(formatShoppingItem(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update shopping item" });
  }
});

router.post("/shopping/clear-checked", async (req, res) => {
  try {
    const deleted = await db.delete(shoppingListTable)
      .where(eq(shoppingListTable.isChecked, true))
      .returning();
    res.json({ removed: deleted.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to clear checked items" });
  }
});

router.post("/shopping/restock", async (req, res) => {
  try {
    const checkedItems = await db.select().from(shoppingListTable)
      .where(eq(shoppingListTable.isChecked, true));

    let restocked = 0;
    for (const item of checkedItems) {
      if (item.ingredientId) {
        const [existing] = await db.select().from(kitchenStockTable)
          .where(eq(kitchenStockTable.ingredientId, item.ingredientId));
        if (existing) {
          await db.update(kitchenStockTable)
            .set({ quantity: existing.quantity + (item.quantity ?? 1), updatedAt: new Date() })
            .where(eq(kitchenStockTable.id, existing.id));
          restocked++;
        }
      } else {
        const [existingByName] = await db.select().from(kitchenStockTable)
          .where(eq(kitchenStockTable.ingredientName, item.name));
        if (existingByName) {
          await db.update(kitchenStockTable)
            .set({ quantity: existingByName.quantity + (item.quantity ?? 1), updatedAt: new Date() })
            .where(eq(kitchenStockTable.id, existingByName.id));
          restocked++;
        }
      }
    }

    await db.delete(shoppingListTable).where(eq(shoppingListTable.isChecked, true));
    await db.insert(activityLogTable).values({
      type: "restock",
      description: `Restocked ${restocked} item(s) from shopping list`,
    });

    res.json({ restocked });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to restock" });
  }
});

router.post("/shopping/generate", async (req, res) => {
  try {
    const { recipeId, includeLowStock } = req.body as { recipeId?: number; includeLowStock?: boolean };
    const added: (typeof shoppingListTable.$inferSelect)[] = [];

    // Add missing recipe ingredients to shopping list
    if (recipeId) {
      const stock = await db.select().from(kitchenStockTable);
      const inStockNames = stock
        .filter(s => s.quantity > 0)
        .map(s => s.ingredientName.toLowerCase());

      const recipeIngredients = await db
        .select()
        .from(recipeIngredientsTable)
        .where(eq(recipeIngredientsTable.recipeId, recipeId));

      const missing = recipeIngredients.filter(
        i => !i.isOptional && !inStockNames.includes(i.ingredientName.toLowerCase())
      );

      for (const ing of missing) {
        const existing = await db.select().from(shoppingListTable)
          .where(and(
            eq(shoppingListTable.name, ing.ingredientName),
            eq(shoppingListTable.isChecked, false)
          ));
        if (existing.length === 0) {
          const [created] = await db.insert(shoppingListTable).values({
            ingredientId: ing.ingredientId,
            name: ing.ingredientName,
            quantity: ing.quantity ?? 1,
            unit: ing.unit ?? null,
            reason: "Recipe ingredient",
            isChecked: false,
            isManual: false,
          }).returning();
          added.push(created);
        }
      }
    }

    // Also add low stock items if requested (default: only when no recipeId)
    if (includeLowStock !== false && !recipeId) {
      const stock = await db.select().from(kitchenStockTable);
      const lowItems = stock.filter(s => s.quantity <= s.lowThreshold);
      for (const item of lowItems) {
        const existing = await db.select().from(shoppingListTable)
          .where(and(
            eq(shoppingListTable.name, item.ingredientName),
            eq(shoppingListTable.isChecked, false)
          ));
        if (existing.length === 0) {
          const [created] = await db.insert(shoppingListTable).values({
            ingredientId: item.ingredientId,
            name: item.ingredientName,
            quantity: item.lowThreshold * 2,
            unit: item.unit,
            reason: item.quantity <= 0 ? "Out of stock" : "Low stock",
            isChecked: false,
            isManual: false,
          }).returning();
          added.push(created);
        }
      }
    }

    res.json(added.map(formatShoppingItem));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to generate shopping list" });
  }
});

export default router;
