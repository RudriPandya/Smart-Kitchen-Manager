import { useState } from "react";
import { useGetRecipe, getGetRecipeQueryKey, getListStockQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, Users, Leaf, ChefHat, Loader2, CheckCircle2, Minus, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function formatQty(n: number): string {
  if (n === 0) return "0";
  if (Number.isInteger(n)) return String(n);
  // Show up to 2 decimal places, remove trailing zeros
  return parseFloat(n.toFixed(2)).toString();
}

export default function RecipeDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCooking, setIsCooking] = useState(false);
  const [cooked, setCooked] = useState(false);
  const [selectedServings, setSelectedServings] = useState<number | null>(null);

  const { data: recipe, isLoading } = useGetRecipe(id, {
    query: { enabled: !!id, queryKey: getGetRecipeQueryKey(id) }
  });

  // When recipe loads, initialise selectedServings
  const baseServings = recipe?.servings ?? 4;
  const servings = selectedServings ?? baseServings;
  const scale = baseServings > 0 ? servings / baseServings : 1;

  const handleServingsChange = (delta: number) => {
    const base = selectedServings ?? baseServings;
    setSelectedServings(Math.max(1, Math.min(20, base + delta)));
  };

  const handleCook = async () => {
    setIsCooking(true);
    try {
      const res = await fetch(`/api/recipes/${id}/cook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servings })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCooked(true);
      queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({
        title: `Enjoy your ${recipe?.name}! 🍽️`,
        description: `Cooked for ${servings} ${servings === 1 ? "person" : "people"}. ${data.deducted.length} ingredient(s) deducted from pantry.`,
      });
      setTimeout(() => setCooked(false), 4000);
    } catch {
      toast({ title: "Error", description: "Could not update pantry.", variant: "destructive" });
    } finally {
      setIsCooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Recipe not found.</p>
        <Link href="/recipes"><Button className="mt-4">Back to recipes</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Back + Cook button */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/recipes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to recipes
        </Link>
        <Button
          onClick={handleCook}
          disabled={isCooking || cooked}
          size="lg"
          className={`gap-2 shadow-md transition-all ${cooked ? "bg-green-600 hover:bg-green-700" : ""}`}
        >
          {isCooking ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Cooking…</>
          ) : cooked ? (
            <><CheckCircle2 className="w-4 h-4" /> Pantry Updated!</>
          ) : (
            <><ChefHat className="w-4 h-4" /> Cook This Meal</>
          )}
        </Button>
      </div>

      {/* Hero image */}
      {recipe.imageUrl && (
        <div className="w-full h-72 md:h-96 rounded-2xl overflow-hidden shadow-lg border border-border/50">
          <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Title & badges */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/10 text-primary border-0 text-sm py-1 px-3">
            {recipe.cuisineType}
          </Badge>
          {recipe.isVegetarian && (
            <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-sm py-1">
              <Leaf className="w-3.5 h-3.5 mr-1.5" /> Vegetarian
            </Badge>
          )}
          {recipe.isAiGenerated && (
            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 text-sm py-1">
              <ChefHat className="w-3.5 h-3.5 mr-1.5" /> AI Generated
            </Badge>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-tight">{recipe.name}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">{recipe.description}</p>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 py-5 border-y border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Prep Time</p>
            <p className="text-lg font-bold">{recipe.prepTimeMins} mins</p>
          </div>
        </div>

        {/* Serving selector */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Servings</p>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => handleServingsChange(-1)}
                disabled={servings <= 1}
                className="w-6 h-6 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-lg font-bold min-w-[1.5rem] text-center">{servings}</span>
              <button
                onClick={() => handleServingsChange(1)}
                disabled={servings >= 20}
                className="w-6 h-6 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
              </button>
              <span className="text-sm text-muted-foreground">{servings === 1 ? "person" : "people"}</span>
            </div>
          </div>
        </div>

        {scale !== 1 && (
          <div className="flex items-center">
            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              {scale > 1 ? `×${formatQty(scale)} scaled up` : `÷${formatQty(1/scale)} scaled down`}
            </Badge>
          </div>
        )}
      </div>

      {/* Ingredients + Instructions */}
      <div className="grid md:grid-cols-[2fr_3fr] gap-8 lg:gap-12 pt-2">

        {/* Ingredients */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-serif">Ingredients</h2>
            {scale !== 1 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                for {servings} {servings === 1 ? "person" : "people"}
              </span>
            )}
          </div>

          <Card className="overflow-hidden border-border/60">
            <CardContent className="p-0">
              <ul className="divide-y divide-border/40">
                {recipe.ingredients?.map((ing) => {
                  const scaledQty = ing.quantity != null ? ing.quantity * scale : null;
                  return (
                    <li key={ing.id} className={`flex justify-between items-center px-4 py-3 ${ing.isOptional ? "opacity-70" : ""}`}>
                      <span className="font-medium text-sm">
                        {ing.ingredientName}
                        {ing.isOptional && (
                          <span className="ml-1.5 text-xs text-muted-foreground font-normal">(optional)</span>
                        )}
                      </span>
                      <span className={`text-sm font-semibold ml-4 shrink-0 ${scale !== 1 ? "text-primary" : "text-muted-foreground"}`}>
                        {scaledQty != null ? formatQty(scaledQty) : "—"} {ing.unit}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Cook button in sidebar */}
          <Button
            onClick={handleCook}
            disabled={isCooking || cooked}
            className={`w-full gap-2 h-12 text-base ${cooked ? "bg-green-600 hover:bg-green-700" : ""}`}
          >
            {isCooking ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Cooking…</>
            ) : cooked ? (
              <><CheckCircle2 className="w-4 h-4" /> Done! Pantry Updated</>
            ) : (
              <><ChefHat className="w-4 h-4" /> Cook for {servings} {servings === 1 ? "Person" : "People"}</>
            )}
          </Button>

          {scale !== 1 && (
            <p className="text-xs text-center text-muted-foreground">
              Ingredients scaled from base recipe ({baseServings} {baseServings === 1 ? "serving" : "servings"})
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-serif">Instructions</h2>
          <div className="space-y-3">
            {recipe.instructions
              ? recipe.instructions.split(/\n+/).filter(Boolean).map((step, i) => {
                  // Check if the line starts with a number already
                  const isNumbered = /^\d+\./.test(step.trim());
                  if (isNumbered) {
                    const [num, ...rest] = step.trim().split(/\.\s*/);
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {num}
                        </div>
                        <p className="text-foreground/85 leading-relaxed pt-0.5">{rest.join(". ")}</p>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-foreground/85 leading-relaxed pt-0.5">{step}</p>
                    </div>
                  );
                })
              : <p className="text-muted-foreground">No instructions available.</p>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
