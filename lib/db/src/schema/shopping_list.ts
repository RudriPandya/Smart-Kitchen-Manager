import { pgTable, serial, integer, real, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shoppingListTable = pgTable("shopping_list", {
  id: serial("id").primaryKey(),
  ingredientId: integer("ingredient_id"),
  name: text("name").notNull(),
  quantity: real("quantity"),
  unit: text("unit"),
  reason: text("reason"),
  isChecked: boolean("is_checked").notNull().default(false),
  isManual: boolean("is_manual").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShoppingItemSchema = createInsertSchema(shoppingListTable).omit({ id: true, createdAt: true });
export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
export type ShoppingItem = typeof shoppingListTable.$inferSelect;
