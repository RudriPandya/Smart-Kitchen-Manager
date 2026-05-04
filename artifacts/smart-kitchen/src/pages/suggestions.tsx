import { useState } from "react";
import { useGetMealSuggestions, useGenerateShoppingList, getListShoppingItemsQueryKey, getListStockQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Sparkles, ShoppingCart, CheckCircle2, XCircle, Loader2, ChefHat, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Suggestions() {
  const { data: suggestions, isLoading } = useGetMealSuggestions();
  const generateList = useGenerateShoppingList();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [cookingId, setCookingId] = useState<number | null>(null);

  const handleGenerateShopping = (recipeId: number, recipeName: string) => {
    generateList.mutate({ data: { recipeId } }, {
      onSuccess: (items) => {
        queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() });
        toast({
          title: "Shopping list updated",
          description: items.length > 0
            ? `Added ${items.length} missing ingredient(s) for ${recipeName} to your shopping list.`
            : `All ingredients for ${recipeName} are already on your shopping list.`,
        });
      }
    });
  };

  const handleCook = async (recipeId: number, recipeName: string) => {
    setCookingId(recipeId);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/cook`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
      queryClient.invalidateQueries({ queryKey: getDashboardSummaryQueryKey() });
      toast({
        title: `Cooking ${recipeName}! 🍳`,
        description: `Deducted ${data.deducted.length} ingredient(s) from your pantry.`,
      });
    } catch {
      toast({ title: "Error", description: "Could not update pantry.", variant: "destructive" });
    } finally {
      setCookingId(null);
    }
  };

  const handleAiSuggest = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiResponse("");

    try {
      const res = await fetch("/api/suggestions/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      if (!res.ok) throw new Error("Failed to get suggestions");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setAiResponse(prev => prev + data.content);
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (e) {
      setAiResponse("Sorry, the AI Chef is unavailable right now. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meal Suggestions</h1>
        <p className="text-muted-foreground mt-1">Smart ideas based on what's in your pantry right now.</p>
      </div>

      {/* AI Chef Section */}
      <Card className="bg-gradient-to-br from-primary/10 to-sidebar border-primary/20 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Ask the AI Chef
              </h3>
              <p className="text-sm text-muted-foreground">Craving something specific? Describe what you want and your AI sous-chef will create suggestions using your ingredients.</p>
            </div>
            <div className="w-full md:w-auto flex gap-2 flex-1 max-w-md">
              <Input
                placeholder="E.g., Something spicy and quick..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleAiSuggest()}
                className="bg-background"
                disabled={isGenerating}
              />
              <Button onClick={handleAiSuggest} disabled={isGenerating || !aiPrompt.trim()} className="shrink-0">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suggest"}
              </Button>
            </div>
          </div>

          {/* Streaming / response */}
          {isGenerating && !aiResponse && (
            <div className="flex items-center gap-3 p-4 bg-background/60 rounded-lg border border-primary/10 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              Your AI Chef is thinking up meal ideas…
            </div>
          )}

          {aiResponse && (
            <div className="p-4 bg-background/70 backdrop-blur-sm rounded-lg border border-primary/10 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary mb-3">
                <ChefHat className="w-4 h-4" />
                AI Chef's Suggestions
                {isGenerating && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{aiResponse}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pantry-Based Suggestions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold font-serif tracking-tight">Top Matches</h2>
        <p className="text-sm text-muted-foreground">Recipes ranked by how many ingredients you already have.</p>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : suggestions?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
            <UtensilsCrossed className="w-12 h-12 text-muted" />
            <p>No matching recipes found. Try adding more ingredients to your pantry.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {suggestions?.map((suggestion) => (
              <Card
                key={suggestion.recipe.id}
                className={`overflow-hidden border-2 transition-all hover:shadow-md ${
                  suggestion.canCookNow
                    ? 'border-green-500/40 bg-green-50/20 dark:bg-green-950/10'
                    : suggestion.matchPercent > 50
                      ? 'border-orange-400/30'
                      : 'border-border'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-xl leading-tight">
                        <Link href={`/recipes/${suggestion.recipe.id}`} className="hover:text-primary transition-colors">
                          {suggestion.recipe.name}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        {suggestion.recipe.cuisineType}
                        {suggestion.recipe.isVegetarian && (
                          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-xs py-0">Veg</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <Badge
                      className={`shrink-0 text-base font-bold px-2.5 py-1 ${
                        suggestion.canCookNow
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : suggestion.matchPercent > 50
                            ? 'bg-orange-400 hover:bg-orange-500 text-white'
                            : ''
                      }`}
                      variant={suggestion.canCookNow || suggestion.matchPercent > 50 ? "default" : "secondary"}
                    >
                      {suggestion.matchPercent}%
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {suggestion.haveIngredients.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Have ({suggestion.haveIngredients.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.haveIngredients.map(ing => (
                          <span key={ing} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestion.missingIngredients.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Missing ({suggestion.missingIngredients.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.missingIngredients.map(ing => (
                          <span key={ing} className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="bg-muted/20 border-t pt-3 pb-3 flex justify-between items-center gap-2 flex-wrap">
                  <div className="flex gap-2">
                    {suggestion.canCookNow ? (
                      <Button
                        size="sm"
                        className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleCook(suggestion.recipe.id, suggestion.recipe.name)}
                        disabled={cookingId === suggestion.recipe.id}
                      >
                        {cookingId === suggestion.recipe.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <ChefHat className="w-3.5 h-3.5" />}
                        Cook This!
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateShopping(suggestion.recipe.id, suggestion.recipe.name)}
                        className="gap-1.5"
                        disabled={generateList.isPending}
                      >
                        {generateList.isPending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <ShoppingCart className="w-3.5 h-3.5" />}
                        Add to cart
                      </Button>
                    )}
                  </div>
                  <Link href={`/recipes/${suggestion.recipe.id}`}>
                    <Button size="sm" variant="ghost" className="text-primary hover:text-primary">
                      View Recipe →
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
