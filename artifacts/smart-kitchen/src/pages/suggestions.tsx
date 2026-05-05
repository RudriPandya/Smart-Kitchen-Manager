import { useState } from "react";
import {
  useGetMealSuggestions,
  useGenerateShoppingList,
  getListShoppingItemsQueryKey,
  getListStockQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Sparkles, ShoppingCart, CheckCircle2, XCircle, Loader2, ChefHat, UtensilsCrossed, Clock, Users } from "lucide-react";
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
  const [filterMode, setFilterMode] = useState<"all" | "can_cook" | "missing_1_2">("all");

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
      const res = await fetch(`/api/recipes/${recipeId}/cook`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
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

      if (!res.ok) throw new Error("Failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) setAiResponse(prev => prev + data.content);
              } catch { /* ignore */ }
            }
          }
        }
      }
    } catch {
      setAiResponse("Sorry, the AI Chef is unavailable right now. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredSuggestions = (suggestions ?? []).filter(s => {
    if (filterMode === "can_cook") return s.canCookNow;
    if (filterMode === "missing_1_2") return !s.canCookNow && s.missingIngredients.length <= 2;
    return true;
  });

  const canCookCount = suggestions?.filter(s => s.canCookNow).length ?? 0;
  const almostCount = suggestions?.filter(s => !s.canCookNow && s.missingIngredients.length <= 2).length ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif">Meal Suggestions</h1>
        <p className="text-muted-foreground mt-1">Smart ideas based on what's in your pantry right now.</p>
      </div>

      {/* AI Chef Section */}
      <Card className="bg-gradient-to-br from-primary/8 to-transparent border-primary/20 shadow-sm overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Ask the AI Chef
              </h3>
              <p className="text-sm text-muted-foreground">
                Craving something specific? Describe what you want and your AI sous-chef will suggest ideas using your pantry.
              </p>
            </div>
            <div className="w-full md:w-auto flex gap-2 flex-1 max-w-md">
              <Input
                placeholder="E.g., something spicy and quick..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isGenerating && handleAiSuggest()}
                className="bg-background"
                disabled={isGenerating}
              />
              <Button onClick={handleAiSuggest} disabled={isGenerating || !aiPrompt.trim()} className="shrink-0 gap-1.5">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Suggest</>}
              </Button>
            </div>
          </div>

          {isGenerating && !aiResponse && (
            <div className="flex items-center gap-3 p-4 bg-background/60 rounded-xl border border-primary/10 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              Your AI Chef is thinking up meal ideas…
            </div>
          )}

          {aiResponse && (
            <div className="p-5 bg-background/80 backdrop-blur-sm rounded-xl border border-primary/10 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-3">
                <ChefHat className="w-4 h-4" />
                AI Chef Suggestions
                {isGenerating && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 prose prose-sm max-w-none">{aiResponse}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestion Filters */}
      {!isLoading && (suggestions?.length ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-serif tracking-tight">Top Matches</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Recipes ranked by how many ingredients you already have.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${filterMode === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
            >
              All ({suggestions?.length})
            </button>
            <button
              onClick={() => setFilterMode("can_cook")}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all flex items-center gap-1 ${filterMode === "can_cook" ? "bg-green-600 text-white border-green-600" : "border-border text-muted-foreground hover:border-green-400"}`}
            >
              <CheckCircle2 className="w-3 h-3" /> Cook Now ({canCookCount})
            </button>
            <button
              onClick={() => setFilterMode("missing_1_2")}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all flex items-center gap-1 ${filterMode === "missing_1_2" ? "bg-orange-500 text-white border-orange-500" : "border-border text-muted-foreground hover:border-orange-400"}`}
            >
              <ShoppingCart className="w-3 h-3" /> Almost There ({almostCount})
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
          <UtensilsCrossed className="w-12 h-12 text-muted" />
          <p className="font-medium">No recipes in this category</p>
          <p className="text-sm">Try a different filter or add more ingredients to your pantry.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredSuggestions.map((suggestion) => (
            <Card
              key={suggestion.recipe.id}
              className={`overflow-hidden border-2 transition-all hover:shadow-lg ${
                suggestion.canCookNow
                  ? "border-green-400/50 bg-green-50/30"
                  : suggestion.matchPercent > 50
                    ? "border-orange-300/40"
                    : "border-border"
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
                    <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                      <span>{suggestion.recipe.cuisineType}</span>
                      {suggestion.recipe.isVegetarian && (
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-xs py-0">Veg</Badge>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {suggestion.recipe.prepTimeMins}m
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" /> {suggestion.recipe.servings}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge
                    className={`shrink-0 text-base font-bold px-2.5 py-1 ${
                      suggestion.canCookNow
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : suggestion.matchPercent > 50
                          ? "bg-orange-400 hover:bg-orange-500 text-white"
                          : ""
                    }`}
                    variant={suggestion.canCookNow || suggestion.matchPercent > 50 ? "default" : "secondary"}
                  >
                    {suggestion.matchPercent}%
                  </Badge>
                </div>

                {/* Match progress bar */}
                <div className="w-full bg-muted rounded-full h-1.5 mt-3">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      suggestion.canCookNow ? "bg-green-500" : suggestion.matchPercent > 50 ? "bg-orange-400" : "bg-muted-foreground/40"
                    }`}
                    style={{ width: `${suggestion.matchPercent}%` }}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {suggestion.haveIngredients.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Have ({suggestion.haveIngredients.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {suggestion.haveIngredients.map(ing => (
                        <span key={ing} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{ing}</span>
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
                        <span key={ing} className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">{ing}</span>
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
                      {generateList.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                      Add to cart
                    </Button>
                  )}
                </div>
                <Link href={`/recipes/${suggestion.recipe.id}`}>
                  <Button size="sm" variant="ghost" className="text-primary hover:text-primary text-xs">
                    View Recipe →
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
