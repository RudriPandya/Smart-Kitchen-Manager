import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  cuisineType: text("cuisine_type").notNull().default("Global"),
  prepTimeMins: integer("prep_time_mins").notNull().default(30),
  servings: integer("servings").notNull().default(2),
  isVegetarian: boolean("is_vegetarian").notNull().default(false),
  instructions: text("instructions").notNull().default(""),
  imageUrl: text("image_url"),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecipeSchema = createInsertSchema(recipesTable).omit({ id: true, createdAt: true });
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipesTable.$inferSelect;
