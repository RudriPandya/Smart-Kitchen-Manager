import { useGetMealSuggestions, useGenerateShoppingList } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Sparkles, ShoppingCart, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";

export default function Suggestions() {
  const { data: suggestions, isLoading } = useGetMealSuggestions();
  const generateList = useGenerateShoppingList();
  
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateShopping = (recipeId: number) => {
    generateList.mutate({ data: { recipeId } });
  };

  const handleAiSuggest = async () => {
    if (!aiPrompt) return;
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
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
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

      <Card className="bg-gradient-to-br from-primary/10 to-sidebar border-primary/20 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Ask the AI Chef
              </h3>
              <p className="text-sm text-muted-foreground">Craving something specific? Describe what you want and we'll suggest a recipe using your ingredients.</p>
            </div>
            <div className="w-full md:w-auto flex gap-2 flex-1 max-w-md">
              <Input 
                placeholder="E.g., A spicy pasta dish with garlic..." 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSuggest()}
                className="bg-background"
              />
              <Button onClick={handleAiSuggest} disabled={isGenerating || !aiPrompt}>
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suggest"}
              </Button>
            </div>
          </div>
          
          {aiResponse && (
            <div className="mt-6 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-primary/10 prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">{aiResponse}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold font-serif tracking-tight">Top Matches</h2>
        
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {suggestions?.map((suggestion) => (
              <Card 
                key={suggestion.recipe.id} 
                className={`overflow-hidden border-2 transition-all hover-elevate ${
                  suggestion.canCookNow 
                    ? 'border-green-500/30 bg-green-50/10 dark:bg-green-950/10' 
                    : suggestion.matchPercent > 50 
                      ? 'border-orange-500/30' 
                      : 'border-border'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        <Link href={`/recipes/${suggestion.recipe.id}`} className="hover:text-primary transition-colors">
                          {suggestion.recipe.name}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1">{suggestion.recipe.cuisineType}</CardDescription>
                    </div>
                    <Badge variant={suggestion.canCookNow ? "default" : "secondary"} className="text-lg py-1 px-2 font-bold">
                      {suggestion.matchPercent}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Have ({suggestion.haveIngredients.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {suggestion.haveIngredients.map(ing => (
                        <span key={ing} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {suggestion.missingIngredients.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-orange-500" /> Missing ({suggestion.missingIngredients.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.missingIngredients.map(ing => (
                          <span key={ing} className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded-full">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/30 pt-4 flex justify-between items-center">
                  {suggestion.canCookNow ? (
                    <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Ready to cook!
                    </span>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleGenerateShopping(suggestion.recipe.id)}
                      className="gap-2"
                      disabled={generateList.isPending}
                    >
                      {generateList.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                      Add missing to cart
                    </Button>
                  )}
                  <Link href={`/recipes/${suggestion.recipe.id}`}>
                    <Button size="sm">View Recipe</Button>
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
