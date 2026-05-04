import { Router } from "express";
import { db } from "@workspace/db";
import { ingredientsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";

const router = Router();

router.get("/ingredients", async (req, res) => {
  try {
    const { q, category } = req.query as { q?: string; category?: string };
    let query = db.select().from(ingredientsTable);
    const rows = await query;
    let results = rows;
    if (q) results = results.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));
    if (category) results = results.filter(i => i.category === category);
    res.json(results.map(i => ({
      id: i.id,
      name: i.name,
      category: i.category,
      defaultUnit: i.defaultUnit,
      createdAt: i.createdAt,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list ingredients" });
  }
});

router.post("/ingredients", async (req, res) => {
  try {
    const { name, category, defaultUnit } = req.body;
    const [ingredient] = await db.insert(ingredientsTable).values({ name, category, defaultUnit }).returning();
    res.status(201).json({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      defaultUnit: ingredient.defaultUnit,
      createdAt: ingredient.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create ingredient" });
  }
});

router.get("/ingredients/categories", async (req, res) => {
  try {
    const rows = await db.selectDistinct({ category: ingredientsTable.category }).from(ingredientsTable);
    res.json(rows.map(r => r.category).sort());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list categories" });
  }
});

export default router;
