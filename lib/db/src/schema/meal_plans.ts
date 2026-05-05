import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mealPlansTable = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner
  recipeId: integer("recipe_id").notNull(),
  recipeName: text("recipe_name").notNull(),
  servings: integer("servings").notNull().default(2),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMealPlanSchema = createInsertSchema(mealPlansTable).omit({ id: true, createdAt: true });
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlansTable.$inferSelect;
