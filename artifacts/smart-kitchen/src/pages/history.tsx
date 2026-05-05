import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  ChevronLeft, ChevronRight, CalendarDays, ChefHat, Clock,
  UtensilsCrossed, Sparkles, ArrowRight, Users
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isToday, addMonths, subMonths, isSameMonth } from "date-fns";

interface MealEntry {
  id: number;
  recipeName: string;
  servings?: number;
  timestamp: string;
}

interface DayHistory {
  date: string;
  meals: MealEntry[];
}

interface NextMealSuggestion {
  recipe: {
    id: number;
    name: string;
    description: string;
    cuisineType: string;
    prepTimeMins: number;
    servings: number;
    isVegetarian: boolean;
    imageUrl?: string;
  };
  matchPercent: number;
  missingCount: number;
  missingIngredients: string[];
  canCookNow: boolean;
  reason: string;
}

// Cuisine colour map
const CUISINE_COLORS: Record<string, string> = {
  "Indian": "bg-orange-100 text-orange-700 border-orange-200",
  "Indo-Chinese": "bg-red-100 text-red-700 border-red-200",
  "Continental": "bg-blue-100 text-blue-700 border-blue-200",
  "Italian": "bg-green-100 text-green-700 border-green-200",
  "Mexican": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Asian": "bg-purple-100 text-purple-700 border-purple-200",
};
function cuisineClass(c: string) {
  return CUISINE_COLORS[c] ?? "bg-muted text-foreground/70 border-border";
}

const DOT_COLORS = [
  "bg-primary", "bg-orange-400", "bg-rose-400",
  "bg-emerald-500", "bg-blue-400", "bg-violet-500",
];

export default function History() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [nextMeals, setNextMeals] = useState<NextMealSuggestion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingNext, setLoadingNext] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/cooking-history")
      .then(r => r.json())
      .then(data => { setHistory(data); setLoadingHistory(false); })
      .catch(() => setLoadingHistory(false));

    fetch("/api/suggestions/next-meal")
      .then(r => r.json())
      .then(data => { setNextMeals(Array.isArray(data) ? data : []); setLoadingNext(false); })
      .catch(() => setLoadingNext(false));
  }, []);

  // Build date → meals lookup
  const historyByDate: Record<string, MealEntry[]> = {};
  for (const d of history) {
    historyByDate[d.date] = d.meals;
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart); // 0 = Sun

  const totalCooked = history.reduce((s, d) => s + d.meals.length, 0);
  const uniqueRecipes = new Set(history.flatMap(d => d.meals.map(m => m.recipeName))).size;
  const thisMonthEntries = history.filter(d => {
    const [y, m] = d.date.split("-").map(Number);
    return y === currentMonth.getFullYear() && m === (currentMonth.getMonth() + 1);
  });

  // Selected day meals
  const selectedDateStr = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedMeals = selectedDateStr ? historyByDate[selectedDateStr] ?? [] : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif">Cooking History</h1>
        <p className="text-muted-foreground mt-1">Your meal calendar and smart suggestions for what's next.</p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCooked}</p>
              <p className="text-xs text-muted-foreground">Meals cooked</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueRecipes}</p>
              <p className="text-xs text-muted-foreground">Unique recipes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{thisMonthEntries.length}</p>
              <p className="text-xs text-muted-foreground">Days this month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

        {/* ── Calendar ── */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-2.5 h-8 rounded-lg text-xs font-medium hover:bg-muted transition-colors border border-border/50"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: startDow }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {days.map(day => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const meals = historyByDate[dateStr] ?? [];
                  const hasMeals = meals.length > 0;
                  const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                  const todayDay = isToday(day);
                  const inCurrentMonth = isSameMonth(day, currentMonth);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`
                        relative flex flex-col items-center justify-start p-1.5 rounded-xl min-h-[64px] transition-all text-left w-full
                        ${isSelected ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30" : ""}
                        ${todayDay && !isSelected ? "ring-2 ring-primary/40 bg-primary/5" : ""}
                        ${hasMeals && !isSelected ? "hover:bg-primary/10 cursor-pointer" : ""}
                        ${!hasMeals && !isSelected ? "hover:bg-muted/50 cursor-default" : ""}
                        ${!inCurrentMonth ? "opacity-30" : ""}
                      `}
                    >
                      <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                        ${todayDay && !isSelected ? "bg-primary text-primary-foreground" : ""}
                        ${isSelected ? "text-primary-foreground" : ""}
                      `}>
                        {format(day, "d")}
                      </span>

                      {/* Meal dots / pills */}
                      {hasMeals && (
                        <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                          {meals.slice(0, 3).map((meal, i) => (
                            <span
                              key={meal.id}
                              className={`w-2 h-2 rounded-full ${isSelected ? "bg-primary-foreground/80" : DOT_COLORS[i % DOT_COLORS.length]}`}
                              title={meal.recipeName}
                            />
                          ))}
                          {meals.length > 3 && (
                            <span className={`text-[9px] font-bold ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              +{meals.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Meal cooked</div>
                <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full ring-2 ring-primary/40 bg-primary/5 text-center text-[10px] leading-5 font-bold">•</div> Today</div>
              </div>
            </CardContent>
          </Card>

          {/* Selected day detail */}
          {selectedDay && (
            <Card className="border-primary/30 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  {format(selectedDay, "EEEE, MMMM d")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {selectedMeals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No meals cooked on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedMeals.map(meal => (
                      <div key={meal.id} className="flex items-center justify-between bg-background rounded-lg px-3 py-2.5 border border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🍳</span>
                          <div>
                            <p className="text-sm font-medium">{meal.recipeName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(meal.timestamp), "h:mm a")}
                              {meal.servings && (
                                <><Users className="w-3 h-3 ml-1" /> {meal.servings} people</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right panel: Next Meal + Recent log ── */}
        <div className="space-y-6">

          {/* Next Meal Suggestions */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                What to Cook Next
              </CardTitle>
              <p className="text-xs text-muted-foreground">Personalised picks based on your cooking history</p>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {loadingNext ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                </div>
              ) : nextMeals.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <ChefHat className="w-8 h-8 mx-auto mb-2 text-muted" />
                  <p className="text-sm">Cook more meals to get personalised suggestions!</p>
                </div>
              ) : (
                nextMeals.map(s => (
                  <Link key={s.recipe.id} href={`/recipes/${s.recipe.id}`}>
                    <div className="group flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                            {s.recipe.name}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs shrink-0 py-0 ${s.canCookNow ? "border-green-200 text-green-700 bg-green-50" : "border-orange-200 text-orange-700 bg-orange-50"}`}
                          >
                            {s.matchPercent}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${cuisineClass(s.recipe.cuisineType)}`}>
                            {s.recipe.cuisineType}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" /> {s.recipe.prepTimeMins}m
                          </span>
                        </div>
                        <p className="text-xs text-primary/80 mt-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 shrink-0" /> {s.reason}
                        </p>
                        {s.missingCount > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Missing: {s.missingIngredients.slice(0, 3).join(", ")}
                            {s.missingCount > 3 && ` +${s.missingCount - 3} more`}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent cooking log */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Recent Cooking
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingHistory ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No cooking history yet. Start cooking!</p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 8).flatMap(d =>
                    d.meals.map(meal => (
                      <div key={meal.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">🍳</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{meal.recipeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(meal.timestamp), "MMM d, h:mm a")}
                            {meal.servings && ` · ${meal.servings} people`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
