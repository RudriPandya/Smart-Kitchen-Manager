import { useListStock, useUpdateStockItem, useDeleteStockItem } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus, Trash2 } from "lucide-react";
import { useState } from "sweep"; // Whoops wait I can just use react
import { useQueryClient } from "@tanstack/react-query";
import { getListStockQueryKey } from "@workspace/api-client-react";
import * as React from "react";

export default function Stock() {
  const { data: stock, isLoading } = useListStock();
  const updateItem = useUpdateStockItem();
  const deleteItem = useDeleteStockItem();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");

  const handleUpdate = (id: number, quantity: number, unit: string) => {
    updateItem.mutate({ id, data: { quantity, unit } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListStockQueryKey() })
    });
  };

  const handleDelete = (id: number) => {
    deleteItem.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListStockQueryKey() })
    });
  };

  const filteredStock = stock?.filter(item => item.ingredientName.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Stock</h1>
          <p className="text-muted-foreground mt-1">Manage your pantry and ingredients.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Ingredient
        </Button>
      </div>

      <div className="flex items-center space-x-2 bg-card p-2 rounded-lg border shadow-sm">
        <Search className="h-5 w-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search ingredients..." 
          className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredStock.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${item.status === 'in_stock' ? 'bg-primary' : item.status === 'low' ? 'bg-chart-2' : 'bg-destructive'}`} />
                  <div>
                    <h3 className="font-medium text-lg">{item.ingredientName}</h3>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-muted rounded-md p-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" onClick={() => handleUpdate(item.id, Math.max(0, item.quantity - 1), item.unit)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-12 text-center">{item.quantity} {item.unit}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" onClick={() => handleUpdate(item.id, item.quantity + 1, item.unit)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredStock.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No items found in stock.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
