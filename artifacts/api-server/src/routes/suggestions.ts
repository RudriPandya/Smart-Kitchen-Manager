import { Router } from "express";
import { db } from "@workspace/db";
import { recipesTable, recipeIngredientsTable, kitchenStockTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

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
