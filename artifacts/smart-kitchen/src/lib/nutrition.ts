// Estimated nutrition data per ingredient per standard unit
// Values: { cal, protein (g), carbs (g), fat (g) }

type NutritionEntry = { cal: number; protein: number; carbs: number; fat: number };

// Nutrition per unit for each ingredient
const NUTRITION_DB: Record<string, Record<string, NutritionEntry>> = {
  // ─── Grains & Legumes ─────────────────────────────────────────────────────
  "rice":             { cup: { cal: 340, protein: 7, carbs: 74, fat: 0.5 } },
  "basmati rice":     { cup: { cal: 340, protein: 7, carbs: 74, fat: 0.5 } },
  "toor dal":         { cup: { cal: 350, protein: 22, carbs: 63, fat: 1.0 } },
  "moong dal":        { cup: { cal: 300, protein: 21, carbs: 56, fat: 1.0 } },
  "masoor dal":       { cup: { cal: 320, protein: 25, carbs: 58, fat: 1.0 } },
  "chana dal":        { cup: { cal: 360, protein: 22, carbs: 65, fat: 5.0 } },
  "kidney beans":     { cup: { cal: 225, protein: 15, carbs: 40, fat: 0.9 } },
  "chickpeas":        { cup: { cal: 269, protein: 15, carbs: 45, fat: 4.2 } },
  "wheat flour":      { cup: { cal: 455, protein: 13, carbs: 95, fat: 1.2 } },
  "maida":            { cup: { cal: 455, protein: 13, carbs: 95, fat: 1.2 } },
  "semolina":         { cup: { cal: 601, protein: 21, carbs: 122, fat: 1.7 } },
  "poha":             { cup: { cal: 200, protein: 4, carbs: 43, fat: 0.5 } },

  // ─── Vegetables ───────────────────────────────────────────────────────────
  "onions":           { pieces: { cal: 44, protein: 1.2, carbs: 10, fat: 0.1 }, cup: { cal: 64, protein: 1.8, carbs: 15, fat: 0.2 } },
  "onion":            { pieces: { cal: 44, protein: 1.2, carbs: 10, fat: 0.1 }, cup: { cal: 64, protein: 1.8, carbs: 15, fat: 0.2 } },
  "tomatoes":         { pieces: { cal: 22, protein: 1.1, carbs: 4.8, fat: 0.2 }, cup: { cal: 32, protein: 1.6, carbs: 7, fat: 0.3 } },
  "tomato":           { pieces: { cal: 22, protein: 1.1, carbs: 4.8, fat: 0.2 }, cup: { cal: 32, protein: 1.6, carbs: 7, fat: 0.3 } },
  "potatoes":         { pieces: { cal: 130, protein: 3, carbs: 30, fat: 0.1 }, cup: { cal: 132, protein: 3, carbs: 30, fat: 0.2 } },
  "potato":           { pieces: { cal: 130, protein: 3, carbs: 30, fat: 0.1 }, cup: { cal: 132, protein: 3, carbs: 30, fat: 0.2 } },
  "cauliflower":      { pieces: { cal: 25, protein: 2, carbs: 5, fat: 0.3 }, cup: { cal: 27, protein: 2.1, carbs: 5.3, fat: 0.3 } },
  "spinach":          { cup: { cal: 7, protein: 0.9, carbs: 1.1, fat: 0.1 } },
  "peas":             { cup: { cal: 117, protein: 8, carbs: 21, fat: 0.6 } },
  "carrots":          { cup: { cal: 52, protein: 1.2, carbs: 12, fat: 0.3 }, pieces: { cal: 25, protein: 0.6, carbs: 6, fat: 0.15 } },
  "carrot":           { cup: { cal: 52, protein: 1.2, carbs: 12, fat: 0.3 }, pieces: { cal: 25, protein: 0.6, carbs: 6, fat: 0.15 } },
  "capsicum":         { pieces: { cal: 30, protein: 1, carbs: 7, fat: 0.3 } },
  "bell pepper":      { pieces: { cal: 30, protein: 1, carbs: 7, fat: 0.3 } },
  "green beans":      { cup: { cal: 31, protein: 1.8, carbs: 7, fat: 0.1 } },
  "corn":             { cup: { cal: 132, protein: 4.7, carbs: 29, fat: 1.8 } },
  "broccoli":         { cup: { cal: 55, protein: 3.7, carbs: 11, fat: 0.6 } },
  "eggplant":         { pieces: { cal: 35, protein: 1.5, carbs: 8, fat: 0.2 } },
  "bitter gourd":     { pieces: { cal: 20, protein: 1, carbs: 4, fat: 0.2 } },
  "bottle gourd":     { pieces: { cal: 14, protein: 0.6, carbs: 3, fat: 0.1 } },
  "okra":             { cup: { cal: 31, protein: 1.9, carbs: 7, fat: 0.1 } },

  // ─── Aromatics ────────────────────────────────────────────────────────────
  "garlic":           { cloves: { cal: 4, protein: 0.2, carbs: 1, fat: 0 }, tsp: { cal: 10, protein: 0.4, carbs: 2, fat: 0 } },
  "ginger":           { inches: { cal: 5, protein: 0.1, carbs: 1.2, fat: 0 }, tsp: { cal: 2, protein: 0, carbs: 0.5, fat: 0 } },
  "green chili":      { pieces: { cal: 2, protein: 0.1, carbs: 0.5, fat: 0 } },
  "chili":            { pieces: { cal: 2, protein: 0.1, carbs: 0.5, fat: 0 } },

  // ─── Spices & Powders ─────────────────────────────────────────────────────
  "turmeric":         { tsp: { cal: 8, protein: 0.2, carbs: 1.4, fat: 0.2 } },
  "red chili powder": { tsp: { cal: 6, protein: 0.3, carbs: 1.3, fat: 0.3 } },
  "coriander powder": { tsp: { cal: 5, protein: 0.2, carbs: 1, fat: 0.2 } },
  "cumin seeds":      { tsp: { cal: 8, protein: 0.4, carbs: 1, fat: 0.5 } },
  "cumin":            { tsp: { cal: 8, protein: 0.4, carbs: 1, fat: 0.5 } },
  "mustard seeds":    { tsp: { cal: 10, protein: 0.5, carbs: 0.8, fat: 0.7 } },
  "garam masala":     { tsp: { cal: 8, protein: 0.3, carbs: 1.5, fat: 0.3 } },
  "salt":             { tsp: { cal: 0, protein: 0, carbs: 0, fat: 0 } },
  "black pepper":     { tsp: { cal: 6, protein: 0.3, carbs: 1.5, fat: 0.1 } },
  "cardamom":         { tsp: { cal: 6, protein: 0.2, carbs: 1.4, fat: 0.1 } },
  "cinnamon":         { tsp: { cal: 6, protein: 0.1, carbs: 1.8, fat: 0 } },
  "cloves":           { tsp: { cal: 7, protein: 0.1, carbs: 1.3, fat: 0.4 } },
  "bay leaves":       { pieces: { cal: 2, protein: 0, carbs: 0.5, fat: 0 } },
  "fenugreek":        { tsp: { cal: 12, protein: 0.8, carbs: 2, fat: 0.2 } },
  "ajwain":           { tsp: { cal: 9, protein: 0.4, carbs: 1.4, fat: 0.3 } },
  "asafoetida":       { tsp: { cal: 2, protein: 0, carbs: 0.5, fat: 0 } },

  // ─── Herbs ────────────────────────────────────────────────────────────────
  "coriander leaves": { cup: { cal: 4, protein: 0.4, carbs: 0.6, fat: 0.1 } },
  "cilantro":         { cup: { cal: 4, protein: 0.4, carbs: 0.6, fat: 0.1 } },
  "mint leaves":      { cup: { cal: 7, protein: 0.5, carbs: 1.1, fat: 0.1 } },
  "curry leaves":     { pieces: { cal: 0.5, protein: 0, carbs: 0.1, fat: 0 } },

  // ─── Dairy & Protein ──────────────────────────────────────────────────────
  "milk":             { cup: { cal: 149, protein: 8, carbs: 12, fat: 8 }, ml: { cal: 0.63, protein: 0.034, carbs: 0.05, fat: 0.034 } },
  "yogurt":           { cup: { cal: 100, protein: 17, carbs: 11, fat: 0.7 } },
  "curd":             { cup: { cal: 100, protein: 17, carbs: 11, fat: 0.7 } },
  "butter":           { tbsp: { cal: 100, protein: 0.1, carbs: 0, fat: 11 } },
  "ghee":             { tbsp: { cal: 112, protein: 0, carbs: 0, fat: 12.7 } },
  "cream":            { tbsp: { cal: 50, protein: 0.3, carbs: 0.4, fat: 5.5 } },
  "paneer":           { grams: { cal: 1.48, protein: 0.07, carbs: 0.02, fat: 0.12 }, cup: { cal: 296, protein: 14, carbs: 4, fat: 24 } },
  "cheese":           { grams: { cal: 4, protein: 0.25, carbs: 0, fat: 0.33 } },
  "eggs":             { pieces: { cal: 70, protein: 6, carbs: 0.6, fat: 5 } },
  "egg":              { pieces: { cal: 70, protein: 6, carbs: 0.6, fat: 5 } },

  // ─── Oils & Fats ──────────────────────────────────────────────────────────
  "oil":              { tbsp: { cal: 120, protein: 0, carbs: 0, fat: 14 } },
  "coconut oil":      { tbsp: { cal: 120, protein: 0, carbs: 0, fat: 14 } },
  "mustard oil":      { tbsp: { cal: 124, protein: 0, carbs: 0, fat: 14 } },

  // ─── Fruits ───────────────────────────────────────────────────────────────
  "lemon":            { pieces: { cal: 20, protein: 0.5, carbs: 6, fat: 0.2 } },
  "lime":             { pieces: { cal: 20, protein: 0.5, carbs: 7, fat: 0.1 } },
  "banana":           { pieces: { cal: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
  "mango":            { pieces: { cal: 99, protein: 1.4, carbs: 25, fat: 0.6 } },
  "coconut":          { cup: { cal: 283, protein: 2.7, carbs: 12, fat: 27 } },
  "coconut milk":     { cup: { cal: 445, protein: 4.6, carbs: 6, fat: 48 } },

  // ─── Nuts & Seeds ─────────────────────────────────────────────────────────
  "cashews":          { cup: { cal: 786, protein: 21, carbs: 44, fat: 63 } },
  "peanuts":          { cup: { cal: 828, protein: 38, carbs: 24, fat: 72 } },
  "almonds":          { cup: { cal: 824, protein: 30, carbs: 31, fat: 71 } },
  "sesame seeds":     { tbsp: { cal: 52, protein: 1.6, carbs: 2.1, fat: 4.5 } },
  "flax seeds":       { tbsp: { cal: 37, protein: 1.3, carbs: 2, fat: 3 } },

  // ─── Sugars & Sweeteners ──────────────────────────────────────────────────
  "sugar":            { cup: { cal: 774, protein: 0, carbs: 200, fat: 0 }, tsp: { cal: 16, protein: 0, carbs: 4, fat: 0 } },
  "jaggery":          { cup: { cal: 380, protein: 0.4, carbs: 98, fat: 0.1 } },
  "honey":            { tbsp: { cal: 64, protein: 0.1, carbs: 17, fat: 0 } },

  // ─── Pantry / Other ───────────────────────────────────────────────────────
  "water":            { cup: { cal: 0, protein: 0, carbs: 0, fat: 0 } },
  "tamarind":         { tbsp: { cal: 30, protein: 0.4, carbs: 7.5, fat: 0.1 } },
  "tomato puree":     { cup: { cal: 82, protein: 3.5, carbs: 17, fat: 0.8 } },
  "bread":            { pieces: { cal: 79, protein: 2.7, carbs: 15, fat: 1 } },
  "naan":             { pieces: { cal: 262, protein: 9, carbs: 45, fat: 5 } },
  "roti":             { pieces: { cal: 104, protein: 3, carbs: 20, fat: 2 } },
};

// Canonical unit name mapping (normalize variations)
const UNIT_ALIASES: Record<string, string> = {
  // plural/singular
  "cups": "cup", "tbsps": "tbsp", "tablespoon": "tbsp", "tablespoons": "tbsp",
  "teaspoon": "tsp", "teaspoons": "tsp", "tsps": "tsp",
  "piece": "pieces", "pc": "pieces", "pcs": "pieces",
  "clove": "cloves",
  "inch": "inches",
  "gram": "grams", "g": "grams",
  "kg": "grams", // handled separately with multiplier
  "liter": "cup",  // rough
  "ml": "ml",
};

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

function getNutrition(ingredientName: string, quantity: number, unit: string): NutritionEntry | null {
  const key = ingredientName.toLowerCase().trim();
  const normUnit = normalizeUnit(unit);

  const entry = NUTRITION_DB[key];
  if (!entry) return null;

  let perUnit = entry[normUnit];

  // Try fallback units if exact match not found
  if (!perUnit) {
    // Try common fallbacks
    const fallbackOrder = ["cup", "tbsp", "tsp", "pieces", "grams", "cloves", "inches", "ml"];
    for (const fb of fallbackOrder) {
      if (entry[fb]) { perUnit = entry[fb]; break; }
    }
  }
  if (!perUnit) return null;

  // Handle kg → grams
  let multiplier = quantity;
  if (normalizeUnit(unit) === "grams" && unit.toLowerCase() === "kg") {
    multiplier = quantity * 1000;
  }

  return {
    cal: perUnit.cal * multiplier,
    protein: perUnit.protein * multiplier,
    carbs: perUnit.carbs * multiplier,
    fat: perUnit.fat * multiplier,
  };
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function computeRecipeNutrition(
  ingredients: { ingredientName: string; quantity: number | null; unit: string | null }[],
  servings: number,
  scaleFactor = 1
): NutritionTotals {
  let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

  for (const ing of ingredients) {
    if (!ing.quantity || !ing.unit) continue;
    const n = getNutrition(ing.ingredientName, ing.quantity * scaleFactor, ing.unit);
    if (!n) continue;
    totalCal += n.cal;
    totalProtein += n.protein;
    totalCarbs += n.carbs;
    totalFat += n.fat;
  }

  const div = servings > 0 ? servings : 1;
  return {
    calories: Math.round(totalCal / div),
    protein: Math.round(totalProtein / div),
    carbs: Math.round(totalCarbs / div),
    fat: Math.round(totalFat / div),
  };
}
