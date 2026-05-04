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
    const prompt = `I have these ingredients in my kitchen: ${inStockItems.join(", ")}.

${userPrompt ? `Additional request: ${userPrompt}` : ""}

Please suggest 5 creative and delicious meals I can cook with these ingredients. For each meal provide:
1. Meal name
2. Key ingredients used (from my list)
3. Any missing ingredients needed (keep it minimal)
4. Brief 2-line description
5. Approximate prep time in minutes
6. Cuisine type
7. Whether it's vegetarian (true/false)

Format your response as a JSON array with this structure:
[{"name": "...", "description": "...", "usedIngredients": [...], "missingIngredients": [...], "prepTimeMins": N, "cuisineType": "...", "isVegetarian": true/false}]

Return ONLY the JSON array, no other text.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, fullContent: fullResponse })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err);
    res.write(`data: ${JSON.stringify({ error: "AI suggestions failed" })}\n\n`);
    res.end();
  }
});

export default router;
