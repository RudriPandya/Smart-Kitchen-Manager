import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ingredientsTable } from "./ingredients";

export const kitchenStockTable = pgTable("kitchen_stock", {
  id: serial("id").primaryKey(),
  ingredientId: integer("ingredient_id").references(() => ingredientsTable.id),
  ingredientName: text("ingredient_name").notNull(),
  category: text("category").notNull().default("Other"),
  quantity: real("quantity").notNull().default(0),
  unit: text("unit").notNull(),
  lowThreshold: real("low_threshold").notNull().default(1),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKitchenStockSchema = createInsertSchema(kitchenStockTable).omit({ id: true, updatedAt: true });
export type InsertKitchenStock = z.infer<typeof insertKitchenStockSchema>;
export type KitchenStock = typeof kitchenStockTable.$inferSelect;
