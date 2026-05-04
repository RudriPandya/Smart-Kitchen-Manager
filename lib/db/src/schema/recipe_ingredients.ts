import { pgTable, serial, integer, real, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { recipesTable } from "./recipes";
import { ingredientsTable } from "./ingredients";

export const recipeIngredientsTable = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").references(() => recipesTable.id).notNull(),
  ingredientId: integer("ingredient_id").references(() => ingredientsTable.id),
  ingredientName: text("ingredient_name").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  isOptional: boolean("is_optional").notNull().default(false),
});

export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredientsTable).omit({ id: true });
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;
export type RecipeIngredient = typeof recipeIngredientsTable.$inferSelect;
