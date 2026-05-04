import { useState } from "react";
import { useGetRecipe, getGetRecipeQueryKey, getListStockQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Users, Leaf, ChefHat, Loader2, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function RecipeDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCooking, setIsCooking] = useState(false);
  const [cooked, setCooked] = useState(false);

  const { data: recipe, isLoading } = useGetRecipe(id, {
    query: { enabled: !!id, queryKey: getGetRecipeQueryKey(id) }
  });

  const handleCook = async () => {
    setIsCooking(true);
    try {
      const res = await fetch(`/api/recipes/${id}/cook`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCooked(true);
      queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
      queryClient.invalidateQueries({ queryKey: getDashboardSummaryQueryKey() });
      toast({
        title: `Enjoy your ${recipe?.name}! 🍽️`,
        description: `${data.deducted.length} ingredient(s) deducted from your pantry.`,
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
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return <div className="text-center py-12">Recipe not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link href="/recipes" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to recipes
        </Link>

        <Button
          onClick={handleCook}
          disabled={isCooking || cooked}
          className={`gap-2 transition-all ${cooked ? 'bg-green-600 hover:bg-green-700' : ''}`}
          size="lg"
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

      {recipe.imageUrl && (
        <div className="w-full h-[400px] rounded-2xl overflow-hidden shadow-lg border">
          <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 text-sm py-1">
            {recipe.cuisineType}
          </Badge>
          {recipe.isVegetarian && (
            <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-sm py-1">
              <Leaf className="w-4 h-4 mr-1.5" /> Vegetarian
            </Badge>
          )}
          {recipe.isAiGenerated && (
            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 text-sm py-1">
              <ChefHat className="w-4 h-4 mr-1.5" /> AI Generated
            </Badge>
          )}
        </div>

        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-tight text-foreground">{recipe.name}</h1>
          <p className="text-xl text-muted-foreground mt-4 leading-relaxed">{recipe.description}</p>
        </div>

        <div className="flex flex-wrap gap-6 py-6 border-y border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Prep Time</p>
              <p className="text-lg font-semibold">{recipe.prepTimeMins} mins</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Servings</p>
              <p className="text-lg font-semibold">{recipe.servings}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_2fr] gap-12 pt-4">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-serif">Ingredients</h2>
            <ul className="space-y-3">
              {recipe.ingredients?.map((ing) => (
                <li key={ing.id} className="flex justify-between items-center pb-3 border-b border-border/40 last:border-0">
                  <span className="font-medium text-foreground/90">
                    {ing.ingredientName}
                    {ing.isOptional && <span className="text-muted-foreground font-normal text-sm ml-1">(optional)</span>}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {ing.quantity} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              onClick={handleCook}
              disabled={isCooking || cooked}
              className={`w-full gap-2 ${cooked ? 'bg-green-600 hover:bg-green-700' : ''}`}
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

          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-serif">Instructions</h2>
            <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed text-foreground/90">
              <p className="whitespace-pre-wrap leading-relaxed">{recipe.instructions}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
