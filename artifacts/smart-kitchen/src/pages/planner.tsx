import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import {
  ChevronLeft, ChevronRight, Plus, X, ShoppingCart, Leaf,
  Clock, Users, Sparkles, CheckCircle2, AlertCircle, Minus,
  UtensilsCrossed, CalendarDays
} from "lucide-react";
import {
  format, startOfWeek, addWeeks, subWeeks, addDays, isSameDay, isToday
} from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Recipe {
  id: number;
  name: string;
  cuisineType: string;
  prepTimeMins: number;
  servings: number;
  isVegetarian: boolean;
}

interface MealPlan {
  id: number;
  date: string;
  mealType: string;
  recipeId: number;
  recipeName: string;
  servings: number;
}

interface ShoppingItem {
  ingredientName: string;
  needed: number;
  inStock: number;
  missing: number;
  unit: string;
  status: "have" | "partial" | "missing";
}

interface ShoppingList {
  items: ShoppingItem[];
  totalIngredients: number;
  missingCount: number;
}

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Status badge styles
const STATUS_STYLE: Record<string, string> = {
  have: "bg-green-50 border-green-200 text-green-700",
  partial: "bg-amber-50 border-amber-200 text-amber-700",
  missing: "bg-red-50 border-red-200 text-red-700",
};

function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function toDateStr(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function weekStartStr(weekStart: Date) {
  return toDateStr(weekStart);
}

export default function Planner() {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  );
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [loadingShopping, setLoadingShopping] = useState(false);
  const [showShopping, setShowShopping] = useState(false);

  // Recipe picker dialog state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ date: string; mealType: string } | null>(null);
  const [search, setSearch] = useState("");

  const days = weekDates(weekStart);
  const wsStr = weekStartStr(weekStart);

  // Fetch plans for this week
  const fetchPlans = useCallback(() => {
    setLoadingPlans(true);
    fetch(`/api/meal-plan?weekStart=${wsStr}`)
      .then(r => r.json())
      .then(data => { setPlans(Array.isArray(data) ? data : []); setLoadingPlans(false); })
      .catch(() => setLoadingPlans(false));
  }, [wsStr]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // Fetch recipe list once
  useEffect(() => {
    fetch("/api/recipes")
      .then(r => r.json())
      .then(data => setRecipes(Array.isArray(data) ? data : []));
  }, []);

  function openPicker(date: string, mealType: string) {
    setPickerTarget({ date, mealType });
    setSearch("");
    setPickerOpen(true);
  }

  async function addMeal(recipe: Recipe) {
    if (!pickerTarget) return;
    setPickerOpen(false);
    const res = await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: pickerTarget.date,
        mealType: pickerTarget.mealType.toLowerCase(),
        recipeId: recipe.id,
        servings: recipe.servings,
      }),
    });
    if (res.ok) {
      fetchPlans();
      setShowShopping(false);
      setShoppingList(null);
    }
  }

  async function removeMeal(id: number) {
    await fetch(`/api/meal-plan/${id}`, { method: "DELETE" });
    fetchPlans();
    setShowShopping(false);
    setShoppingList(null);
  }

  async function updateServings(id: number, servings: number) {
    if (servings < 1 || servings > 20) return;
    await fetch(`/api/meal-plan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servings }),
    });
    setPlans(prev => prev.map(p => p.id === id ? { ...p, servings } : p));
    setShoppingList(null);
  }

  async function generateShoppingList() {
    setLoadingShopping(true);
    setShowShopping(true);
    const res = await fetch(`/api/meal-plan/shopping-list?weekStart=${wsStr}`);
    const data = await res.json();
    setShoppingList(data);
    setLoadingShopping(false);
  }

  async function addMissingToCart() {
    if (!shoppingList) return;
    const missing = shoppingList.items.filter(i => i.status !== "have");
    let added = 0;
    for (const item of missing) {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientName: item.ingredientName,
          quantity: item.missing || item.needed,
          unit: item.unit,
          notes: "Weekly meal plan",
        }),
      });
      if (res.ok) added++;
    }
    toast({
      title: `Added ${added} item${added !== 1 ? "s" : ""} to shopping list`,
      description: "Head to Shopping to review your cart.",
    });
  }

  // Get plan(s) for a specific day+mealType
  function getPlansFor(date: Date, mealType: string): MealPlan[] {
    const ds = toDateStr(date);
    return plans.filter(p => p.date === ds && p.mealType === mealType.toLowerCase());
  }

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisineType.toLowerCase().includes(search.toLowerCase())
  );

  const totalMeals = plans.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">Weekly Planner</h1>
          <p className="text-muted-foreground mt-1">Plan your meals for the week and generate a shopping list.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-xs"
          >
            This Week
          </Button>
          <button
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-2 whitespace-nowrap">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats + Shopping */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-muted/50 border border-border/50 px-3 py-1.5 rounded-full text-sm">
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          <span>{totalMeals} meal{totalMeals !== 1 ? "s" : ""} planned</span>
        </div>
        {totalMeals > 0 && (
          <Button
            size="sm"
            onClick={generateShoppingList}
            className="ml-auto flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Generate Shopping List
          </Button>
        )}
      </div>

      {/* ── Planner Grid ── */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border/60">
              <th className="w-24 p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"></th>
              {days.map((day, i) => (
                <th key={i} className={`p-3 text-center ${isToday(day) ? "bg-primary/8" : ""}`}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase">{DAYS[i]}</div>
                  <div className={`text-lg font-bold mt-0.5 w-9 h-9 rounded-full mx-auto flex items-center justify-center
                    ${isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                    {format(day, "d")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map((mealType, mi) => (
              <tr key={mealType} className={mi < MEAL_TYPES.length - 1 ? "border-b border-border/40" : ""}>
                <td className="p-3 align-top">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{mealType}</div>
                </td>
                {days.map((day, di) => {
                  const cellPlans = getPlansFor(day, mealType);
                  const isCurrentDay = isToday(day);
                  return (
                    <td key={di} className={`p-2 align-top min-h-[100px] ${isCurrentDay ? "bg-primary/4" : ""}`}>
                      <div className="space-y-1.5 min-h-[80px]">
                        {loadingPlans ? (
                          <Skeleton className="h-16 w-full rounded-lg" />
                        ) : (
                          <>
                            {cellPlans.map(plan => (
                              <PlanCard
                                key={plan.id}
                                plan={plan}
                                recipe={recipes.find(r => r.id === plan.recipeId)}
                                onRemove={() => removeMeal(plan.id)}
                                onServingsChange={(s) => updateServings(plan.id, s)}
                              />
                            ))}
                            <button
                              onClick={() => openPicker(toDateStr(day), mealType)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/50
                                text-xs text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5
                                transition-all group"
                            >
                              <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                              Add
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {!loadingPlans && totalMeals === 0 && (
        <div className="flex flex-col items-center py-16 text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-semibold text-lg">No meals planned yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs">Click the + button in any cell to start adding meals to your week.</p>
          <Link href="/suggestions">
            <Button variant="outline" size="sm" className="mt-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Browse Ideas
            </Button>
          </Link>
        </div>
      )}

      {/* ── Recipe Picker Dialog ── */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Add to {pickerTarget?.mealType} — {pickerTarget?.date ? format(new Date(pickerTarget.date + "T12:00:00"), "EEE, MMM d") : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="relative mt-1">
            <Input
              placeholder="Search recipes or cuisine..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="pr-8"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
            {filteredRecipes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No recipes found.</p>
            )}
            {filteredRecipes.map(recipe => (
              <button
                key={recipe.id}
                onClick={() => addMeal(recipe)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl shrink-0">🍽️</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{recipe.name}</p>
                    {recipe.isVegetarian && <Leaf className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="bg-muted px-1.5 py-0.5 rounded-md">{recipe.cuisineType}</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{recipe.prepTimeMins}m</span>
                    <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{recipe.servings} servings</span>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Shopping List Dialog ── */}
      <Dialog open={showShopping} onOpenChange={setShowShopping}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Weekly Shopping List
            </DialogTitle>
          </DialogHeader>
          {loadingShopping ? (
            <div className="space-y-3 py-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !shoppingList || shoppingList.items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p className="font-semibold text-foreground">You have everything!</p>
              <p className="text-sm mt-1">All ingredients for this week are in your pantry.</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                  ✓ {shoppingList.items.filter(i => i.status === "have").length} have
                </Badge>
                <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-amber-50">
                  ~ {shoppingList.items.filter(i => i.status === "partial").length} partial
                </Badge>
                <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
                  ✗ {shoppingList.items.filter(i => i.status === "missing").length} missing
                </Badge>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto space-y-1.5 mt-2">
                {shoppingList.items.map(item => (
                  <div key={item.ingredientName}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm ${STATUS_STYLE[item.status]}`}>
                    <div className="flex items-center gap-2">
                      {item.status === "have"
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span className="font-medium">{item.ingredientName}</span>
                    </div>
                    <div className="text-right text-xs shrink-0 ml-2">
                      {item.status === "have"
                        ? <span>✓ in stock</span>
                        : <span>need {item.missing > 0 ? item.missing : item.needed} {item.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add missing to cart */}
              {shoppingList.missingCount > 0 && (
                <Button onClick={addMissingToCart} className="w-full gap-2 mt-2">
                  <ShoppingCart className="w-4 h-4" />
                  Add {shoppingList.missingCount} Missing Item{shoppingList.missingCount !== 1 ? "s" : ""} to Cart
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Plan Card component ──
function PlanCard({
  plan, recipe, onRemove, onServingsChange
}: {
  plan: MealPlan;
  recipe?: Recipe;
  onRemove: () => void;
  onServingsChange: (s: number) => void;
}) {
  return (
    <div className="group relative bg-background rounded-lg border border-primary/20 p-2 shadow-sm hover:shadow-md transition-all">
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-muted/80 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="w-3 h-3" />
      </button>

      <Link href={`/recipes/${plan.recipeId}`}>
        <p className="text-xs font-semibold leading-snug pr-4 hover:text-primary transition-colors line-clamp-2 cursor-pointer">
          {plan.recipeName}
        </p>
      </Link>

      {recipe && (
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{recipe.cuisineType}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{recipe.prepTimeMins}m</span>
          {recipe.isVegetarian && <Leaf className="w-2.5 h-2.5 text-green-500" />}
        </div>
      )}

      {/* Servings */}
      <div className="flex items-center gap-1 mt-1.5">
        <button
          onClick={() => onServingsChange(plan.servings - 1)}
          disabled={plan.servings <= 1}
          className="w-5 h-5 rounded flex items-center justify-center bg-muted hover:bg-muted/80 disabled:opacity-30 transition-colors"
        >
          <Minus className="w-2.5 h-2.5" />
        </button>
        <span className="text-[11px] font-medium min-w-[28px] text-center">
          {plan.servings} <span className="text-muted-foreground">ppl</span>
        </span>
        <button
          onClick={() => onServingsChange(plan.servings + 1)}
          disabled={plan.servings >= 20}
          className="w-5 h-5 rounded flex items-center justify-center bg-muted hover:bg-muted/80 disabled:opacity-30 transition-colors"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}
