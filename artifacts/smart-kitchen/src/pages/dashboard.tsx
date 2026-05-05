import { useState, useEffect } from "react";
import { useGetDashboardSummary, useGetRecentActivity, useGetLowStockItems } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  AlertTriangle, CheckCircle2, UtensilsCrossed, ShoppingCart,
  Clock, Package, ChefHat, TrendingUp, Sparkles, ArrowRight, Leaf
} from "lucide-react";
import { format } from "date-fns";

interface NextMeal {
  recipe: { id: number; name: string; cuisineType: string; prepTimeMins: number; isVegetarian: boolean };
  matchPercent: number;
  canCookNow: boolean;
  reason: string;
  missingCount: number;
}

const activityIcons: Record<string, string> = {
  cooked: "🍳", restock: "📦", stock_added: "➕", stock_removed: "🗑️", quantity_updated: "✏️",
};

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();
  const { data: lowStock, isLoading: isLoadingLowStock } = useGetLowStockItems();
  const [nextMeals, setNextMeals] = useState<NextMeal[]>([]);
  const [loadingNext, setLoadingNext] = useState(true);

  useEffect(() => {
    fetch("/api/suggestions/next-meal")
      .then(r => r.json())
      .then(data => { setNextMeals(Array.isArray(data) ? data.slice(0, 3) : []); setLoadingNext(false); })
      .catch(() => setLoadingNext(false));
  }, []);

  if (isLoadingSummary) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const totalIngredients = summary?.totalIngredients ?? 0;
  const inStock = summary?.inStockCount ?? 0;
  const lowOutCount = (summary?.lowStockCount ?? 0) + (summary?.outOfStockCount ?? 0);
  const cookable = summary?.canCookNow ?? 0;
  const shopping = summary?.shoppingListCount ?? 0;
  const stockPct = totalIngredients > 0 ? Math.round((inStock / totalIngredients) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">Kitchen Overview</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening in your kitchen today.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border">
          <Clock className="w-3.5 h-3.5" />
          {format(new Date(), "EEEE, MMM d")}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/stock">
          <Card className="group cursor-pointer hover:shadow-md hover:border-primary/40 transition-all duration-200 border-l-4 border-l-primary">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">In Stock</span>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold">{inStock}</div>
              <p className="text-xs text-muted-foreground mt-1">{stockPct}% of pantry ready</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stock">
          <Card className={`group cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${lowOutCount > 0 ? "border-l-destructive" : "border-l-green-400"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Need Attention</span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${lowOutCount > 0 ? "bg-destructive/10 group-hover:bg-destructive/20" : "bg-green-50"}`}>
                  <AlertTriangle className={`w-4 h-4 ${lowOutCount > 0 ? "text-destructive" : "text-green-500"}`} />
                </div>
              </div>
              <div className="text-3xl font-bold">{lowOutCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{lowOutCount === 0 ? "All stocked up!" : "items low or out"}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/suggestions">
          <Card className="group cursor-pointer hover:shadow-md hover:border-amber-400/50 transition-all duration-200 border-l-4 border-l-amber-400">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Can Cook Now</span>
                <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="text-3xl font-bold">{cookable}</div>
              <p className="text-xs text-muted-foreground mt-1">recipes with ingredients</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/shopping">
          <Card className={`group cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${shopping > 0 ? "border-l-blue-400" : "border-l-muted"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Shopping List</span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${shopping > 0 ? "bg-blue-50 group-hover:bg-blue-100" : "bg-muted"}`}>
                  <ShoppingCart className={`w-4 h-4 ${shopping > 0 ? "text-blue-500" : "text-muted-foreground"}`} />
                </div>
              </div>
              <div className="text-3xl font-bold">{shopping}</div>
              <p className="text-xs text-muted-foreground mt-1">items to buy</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Pantry Breakdown */}
      {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Pantry Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.categoryBreakdown
                .sort((a, b) => b.count - a.count)
                .map(({ category, count }) => (
                  <div key={category} className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-full text-sm border border-border/40">
                    <span className="font-medium text-foreground/80">{category}</span>
                    <Badge variant="secondary" className="text-xs h-4 px-1.5 bg-background">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What to Cook Next */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              What to Cook Next
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Personalised picks based on your cooking history</p>
          </div>
          <Link href="/history">
            <span className="text-xs text-primary hover:underline cursor-pointer font-medium">See history →</span>
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingNext ? (
            <div className="grid sm:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : nextMeals.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2 text-center">
              <ChefHat className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Cook some meals to get personalised next-meal suggestions!</p>
              <Link href="/suggestions">
                <span className="text-xs text-primary hover:underline cursor-pointer">Browse ideas →</span>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              {nextMeals.map(s => (
                <Link key={s.recipe.id} href={`/recipes/${s.recipe.id}`}>
                  <div className="group h-full flex flex-col justify-between p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-background/80 hover:shadow-sm transition-all cursor-pointer bg-background/50">
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {s.recipe.name}
                        </p>
                        <Badge variant="outline" className={`text-xs shrink-0 py-0 ${s.canCookNow ? "border-green-200 text-green-700 bg-green-50" : "border-orange-200 text-orange-600 bg-orange-50"}`}>
                          {s.matchPercent}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{s.recipe.cuisineType}</span>
                        {s.recipe.isVegetarian && <Leaf className="w-3 h-3 text-green-600" />}
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{s.recipe.prepTimeMins}m</span>
                      </div>
                    </div>
                    <p className="text-xs text-primary/80 flex items-center gap-1 mt-auto">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      {s.reason}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Low Stock Alerts
            </CardTitle>
            {(lowStock?.length ?? 0) > 0 && (
              <Link href="/shopping">
                <span className="text-xs text-primary hover:underline cursor-pointer font-medium">Add to cart →</span>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingLowStock ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : lowStock?.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-primary/40" />
                <p className="text-sm text-muted-foreground">All items are well stocked!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStock?.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === "out" ? "bg-destructive" : "bg-orange-400"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.ingredientName}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-sm font-bold ${item.status === "out" ? "text-destructive" : "text-orange-500"}`}>
                        {item.quantity} {item.unit}
                      </span>
                      <Badge variant="outline" className={`text-xs ${item.status === "out" ? "border-destructive/30 text-destructive bg-destructive/5" : "border-orange-200 text-orange-600 bg-orange-50"}`}>
                        {item.status === "out" ? "Out" : "Low"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
            <Link href="/history">
              <span className="text-xs text-primary hover:underline cursor-pointer font-medium">Full history →</span>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : activity?.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center gap-2">
                <ChefHat className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activity?.map(item => (
                  <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-base flex-shrink-0">
                      {activityIcons[item.type] ?? "•"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(item.timestamp), "MMM d, h:mm a")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/suggestions">
          <Card className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group border-dashed border-2">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Find a Meal</p>
                <p className="text-xs text-muted-foreground">Based on your pantry</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/chat">
          <Card className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group border-dashed border-2">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ChefHat className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Ask AI Chef</p>
                <p className="text-xs text-muted-foreground">Get recipe advice</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/stock">
          <Card className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group border-dashed border-2">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Update Pantry</p>
                <p className="text-xs text-muted-foreground">Add or remove items</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
