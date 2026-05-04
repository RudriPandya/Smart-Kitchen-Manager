import { Router } from "express";
import { db } from "@workspace/db";
import { kitchenStockTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";

function getStatus(quantity: number, lowThreshold: number): "in_stock" | "low" | "out" {
  if (quantity <= 0) return "out";
  if (quantity <= lowThreshold) return "low";
  return "in_stock";
}

function formatStock(item: typeof kitchenStockTable.$inferSelect) {
  return {
    id: item.id,
    ingredientId: item.ingredientId,
    ingredientName: item.ingredientName,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    lowThreshold: item.lowThreshold,
    status: getStatus(item.quantity, item.lowThreshold),
    updatedAt: item.updatedAt,
  };
}

const router = Router();

router.get("/stock", async (req, res) => {
  try {
    const { status, category } = req.query as { status?: string; category?: string };
    const rows = await db.select().from(kitchenStockTable);
    let results = rows.map(formatStock);
    if (status) results = results.filter(r => r.status === status);
    if (category) results = results.filter(r => r.category === category);
    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list stock" });
  }
});

router.post("/stock", async (req, res) => {
  try {
    const { ingredientId, ingredientName, category, quantity, unit, lowThreshold } = req.body;
    const [item] = await db.insert(kitchenStockTable).values({
      ingredientId: ingredientId ?? null,
      ingredientName: ingredientName ?? "Unknown",
      category: category ?? "Other",
      quantity: quantity ?? 0,
      unit: unit ?? "units",
      lowThreshold: lowThreshold ?? 1,
    }).returning();
    await db.insert(activityLogTable).values({
      type: "stock_added",
      description: `Added ${item.ingredientName} to kitchen stock`,
    });
    res.status(201).json(formatStock(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create stock item" });
  }
});

router.get("/stock/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [item] = await db.select().from(kitchenStockTable).where(eq(kitchenStockTable.id, id));
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(formatStock(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get stock item" });
  }
});

router.put("/stock/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quantity, unit, lowThreshold } = req.body;
    const updates: Partial<typeof kitchenStockTable.$inferInsert> = { updatedAt: new Date() };
    if (quantity !== undefined) updates.quantity = quantity;
    if (unit !== undefined) updates.unit = unit;
    if (lowThreshold !== undefined) updates.lowThreshold = lowThreshold;
    const [item] = await db.update(kitchenStockTable).set(updates).where(eq(kitchenStockTable.id, id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(formatStock(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update stock item" });
  }
});

router.delete("/stock/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(kitchenStockTable).where(eq(kitchenStockTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    await db.insert(activityLogTable).values({
      type: "stock_removed",
      description: `Removed ${deleted.ingredientName} from kitchen stock`,
    });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete stock item" });
  }
});

router.patch("/stock/:id/quantity", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { delta } = req.body;
    const [current] = await db.select().from(kitchenStockTable).where(eq(kitchenStockTable.id, id));
    if (!current) return res.status(404).json({ error: "Not found" });
    const newQty = Math.max(0, current.quantity + delta);
    const [item] = await db.update(kitchenStockTable)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(kitchenStockTable.id, id))
      .returning();
    await db.insert(activityLogTable).values({
      type: "quantity_updated",
      description: `Updated ${item.ingredientName} quantity: ${current.quantity} → ${newQty} ${item.unit}`,
    });
    res.json(formatStock(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update quantity" });
  }
});

export default router;
