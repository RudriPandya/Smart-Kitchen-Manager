import { Router } from "express";
import { db } from "@workspace/db";
import { recipesTable, recipeIngredientsTable, kitchenStockTable, activityLogTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

function parseRecipeName(description: string): string | null {
  const match = description.match(/^Cooked (.+?)(?:\s+for \d+ (?:person|people))?\s+—/);
  return match ? match[1].trim() : null;
}

router.get("/suggestions", async (req, res) => {
  try {
    const { vegetarian, cuisine, maxTime } = req.query as {
      vegetarian?: string;
      cuisine?: string;
      maxTime?: string;
    };

    const stock = await db.select().from(kitchenStockTable);
    const inStockNames = stock
      .filter(s => s.quantity > 0)
      .map(s => s.ingredientName.toLowerCase());

    let recipes = await db.select().from(recipesTable);
    if (vegetarian === "true") recipes = recipes.filter(r => r.isVegetarian);
    if (cuisine) recipes = recipes.filter(r => r.cuisineType.toLowerCase() === cuisine.toLowerCase());
    if (maxTime) recipes = recipes.filter(r => r.prepTimeMins <= parseInt(maxTime));

    const suggestions = [];
    for (const recipe of recipes) {
      const recipeIngredients = await db
        .select()
        .from(recipeIngredientsTable)
        .where(eq(recipeIngredientsTable.recipeId, recipe.id));

      const required = recipeIngredients.filter(i => !i.isOptional);
      const have = required.filter(i => inStockNames.includes(i.ingredientName.toLowerCase()));
      const missing = required.filter(i => !inStockNames.includes(i.ingredientName.toLowerCase()));

      if (required.length === 0) continue;

      const matchScore = have.length / required.length;
      if (matchScore === 0) continue;

      suggestions.push({
        recipe: {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          cuisineType: recipe.cuisineType,
          prepTimeMins: recipe.prepTimeMins,
          servings: recipe.servings,
          isVegetarian: recipe.isVegetarian,
          imageUrl: recipe.imageUrl,
          isAiGenerated: recipe.isAiGenerated,
          createdAt: recipe.createdAt,
        },
        matchScore,
        matchPercent: Math.round(matchScore * 100),
        haveIngredients: have.map(i => i.ingredientName),
        missingIngredients: missing.map(i => i.ingredientName),
        canCookNow: missing.length === 0,
      });
    }

    suggestions.sort((a, b) => b.matchScore - a.matchScore);
    res.json(suggestions);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get suggestions" });
  }
});

// Smart "next meal" suggestions based on cooking history
router.get("/suggestions/next-meal", async (req, res) => {
  try {
    // 1. Get recent cooking history
    const recentActivity = await db.select().from(activityLogTable)
      .orderBy(desc(activityLogTable.timestamp))
      .limit(50);

    const cookedEntries = recentActivity.filter(a => a.type === "cooked");

    // Build history: recipe name → last cooked date + count
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const recentRecipes: Record<string, { lastCooked: Date; count: number }> = {};
    for (const entry of cookedEntries) {
      const name = parseRecipeName(entry.description);
      if (!name) continue;
      if (!recentRecipes[name]) {
        recentRecipes[name] = { lastCooked: entry.timestamp, count: 0 };
      }
      recentRecipes[name].count++;
    }

    // Cuisine frequency in last 7 days
    const cuisineFreq: Record<string, number> = {};
    const allRecipes = await db.select().from(recipesTable);
    for (const [recipeName, info] of Object.entries(recentRecipes)) {
      if (info.lastCooked >= sevenDaysAgo) {
        const recipe = allRecipes.find(r => r.name.toLowerCase() === recipeName.toLowerCase());
        if (recipe) {
          cuisineFreq[recipe.cuisineType] = (cuisineFreq[recipe.cuisineType] ?? 0) + 1;
        }
      }
    }

    // 2. Get ingredient-based suggestions
    const stock = await db.select().from(kitchenStockTable);
    const inStockNames = stock
      .filter(s => s.quantity > 0)
      .map(s => s.ingredientName.toLowerCase());

    const scoredSuggestions = [];
    for (const recipe of allRecipes) {
      const recipeIngredients = await db
        .select()
        .from(recipeIngredientsTable)
        .where(eq(recipeIngredientsTable.recipeId, recipe.id));

      const required = recipeIngredients.filter(i => !i.isOptional);
      if (required.length === 0) continue;
      const have = required.filter(i => inStockNames.includes(i.ingredientName.toLowerCase()));
      const missing = required.filter(i => !inStockNames.includes(i.ingredientName.toLowerCase()));
      const matchScore = have.length / required.length;
      if (matchScore === 0) continue;

      // History-based scoring
      const historyEntry = recentRecipes[recipe.name];
      const lastCooked = historyEntry?.lastCooked;
      const recentCount = historyEntry?.count ?? 0;

      let varietyScore = 100; // Base

      // Penalise if cooked in last 3 days
      if (lastCooked && lastCooked >= threeDaysAgo) varietyScore -= 80;
      // Penalise if cooked in last 7 days (but not 3)
      else if (lastCooked && lastCooked >= sevenDaysAgo) varietyScore -= 40;
      // Penalise repeated meals
      varietyScore -= recentCount * 10;

      // Boost underrepresented cuisines
      const cuisineCount = cuisineFreq[recipe.cuisineType] ?? 0;
      const maxCuisineCount = Math.max(...Object.values(cuisineFreq), 1);
      const cuisineBoost = ((maxCuisineCount - cuisineCount) / maxCuisineCount) * 30;
      varietyScore += cuisineBoost;

      // Ingredient match bonus
      varietyScore += matchScore * 50;

      // Build reason string
      let reason = "";
      if (!lastCooked) {
        reason = `You've never cooked this before`;
      } else if (lastCooked < sevenDaysAgo) {
        reason = `Last cooked ${Math.ceil((now.getTime() - lastCooked.getTime()) / 86400000)} days ago`;
      } else {
        reason = `Try something different today`;
      }
      if (cuisineCount === 0 && Object.keys(cuisineFreq).length > 0) {
        reason = `Great ${recipe.cuisineType} change of pace`;
      }

      scoredSuggestions.push({
        recipe: {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          cuisineType: recipe.cuisineType,
          prepTimeMins: recipe.prepTimeMins,
          servings: recipe.servings,
          isVegetarian: recipe.isVegetarian,
          imageUrl: recipe.imageUrl,
        },
        matchPercent: Math.round(matchScore * 100),
        missingCount: missing.length,
        missingIngredients: missing.map(i => i.ingredientName),
        canCookNow: missing.length === 0,
        varietyScore,
        reason,
      });
    }

    scoredSuggestions.sort((a, b) => b.varietyScore - a.varietyScore);
    res.json(scoredSuggestions.slice(0, 5));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get next-meal suggestions" });
  }
});

router.post("/suggestions/ai", async (req, res) => {
  try {
    const stock = await db.select().from(kitchenStockTable);
    const inStockItems = stock
      .filter(s => s.quantity > 0)
      .map(s => `${s.ingredientName} (${s.quantity} ${s.unit})`);

    const userPrompt = (req.body as { prompt?: string }).prompt || "";

    const prompt = `You are a friendly AI sous-chef. I have these ingredients available in my kitchen:

${inStockItems.join(", ")}

${userPrompt ? `My request: ${userPrompt}` : "Please suggest creative and delicious meals I can cook."}

Suggest 3 to 5 meals. For each meal, present it clearly with:
- **Meal name** and cuisine type
- A short appetizing description (1-2 sentences)
- ✅ Key ingredients I already have
- 🛒 Any extra ingredients needed (keep to minimum)
- ⏱ Approximate prep time
- Whether it's vegetarian

Write in a warm, friendly tone — like a chef giving personal recommendations. Do NOT return JSON or code. Just write naturally.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err);
    res.write(`data: ${JSON.stringify({ error: "AI suggestions failed" })}\n\n`);
    res.end();
  }
});

export default router;
