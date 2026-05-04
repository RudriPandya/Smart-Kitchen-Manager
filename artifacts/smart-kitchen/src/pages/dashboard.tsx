import { useGetDashboardSummary, useGetRecentActivity, useGetLowStockItems } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, UtensilsCrossed, ShoppingCart, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();
  const { data: lowStock, isLoading: isLoadingLowStock } = useGetLowStockItems();

  if (isLoadingSummary || isLoadingActivity || isLoadingLowStock) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kitchen Overview</h1>
        <p className="text-muted-foreground mt-2">Here's what's happening in your kitchen today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.inStockCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">ingredients ready</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive shadow-sm hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low/Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.lowStockCount || 0) + (summary?.outOfStockCount || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">items need attention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-3 shadow-sm hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cookable Meals</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.canCookNow || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">recipes you can make now</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4 shadow-sm hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Shopping List</CardTitle>
            <ShoppingCart className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.shoppingListCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">items to buy</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock?.length === 0 ? (
              <p className="text-muted-foreground text-sm">All items are well stocked.</p>
            ) : (
              <div className="space-y-4">
                {lowStock?.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.ingredientName}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-destructive">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity.</p>
            ) : (
              <div className="space-y-4">
                {activity?.map(item => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full p-1 bg-muted">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.timestamp), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
