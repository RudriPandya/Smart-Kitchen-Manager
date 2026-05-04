import { useState } from "react";
import { useListStock, useUpdateStockItem, useDeleteStockItem, useCreateStockItem, getListStockQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Minus, Trash2, Package } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS = {
  in_stock: "bg-primary",
  low: "bg-orange-400",
  out: "bg-destructive",
};

const STATUS_LABELS = {
  in_stock: "In Stock",
  low: "Low",
  out: "Out",
};

export default function Stock() {
  const { data: stock, isLoading } = useListStock();
  const updateItem = useUpdateStockItem();
  const deleteItem = useDeleteStockItem();
  const createItem = useCreateStockItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ ingredientName: "", category: "Other", quantity: 1, unit: "units", lowThreshold: 1 });

  const handleQuantityChange = (id: number, delta: number, currentQty: number, unit: string) => {
    const newQty = Math.max(0, currentQty + delta);
    updateItem.mutate({ id, data: { quantity: newQty, unit } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListStockQueryKey() })
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Remove ${name} from your pantry?`)) return;
    deleteItem.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
        toast({ title: "Removed", description: `${name} removed from pantry.` });
      }
    });
  };

  const handleAdd = () => {
    if (!newItem.ingredientName.trim()) return;
    createItem.mutate({ data: newItem }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStockQueryKey() });
        setAddOpen(false);
        setNewItem({ ingredientName: "", category: "Other", quantity: 1, unit: "units", lowThreshold: 1 });
        toast({ title: "Added", description: `${newItem.ingredientName} added to pantry.` });
      }
    });
  };

  const filteredStock = stock?.filter(item =>
    item.ingredientName.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const categories = [...new Set(filteredStock.map(i => i.category))].sort();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Stock</h1>
          <p className="text-muted-foreground mt-1">Manage your pantry and ingredients.</p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
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
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredStock.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
          <Package className="w-12 h-12 text-muted" />
          <p>No items found in stock.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">{category}</h2>
              <div className="grid gap-3">
                {filteredStock.filter(i => i.category === category).map((item) => (
                  <Card key={item.id} className="overflow-hidden hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] ?? "bg-muted"}`} />
                        <div>
                          <h3 className="font-medium">{item.ingredientName}</h3>
                          <Badge
                            variant="secondary"
                            className={`text-xs mt-0.5 ${item.status === "out" ? "text-destructive bg-destructive/10" : item.status === "low" ? "text-orange-600 bg-orange-50" : "text-primary bg-primary/10"}`}
                          >
                            {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-muted rounded-lg p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md"
                            onClick={() => handleQuantityChange(item.id, -1, item.quantity, item.unit)}
                            disabled={item.quantity <= 0}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="font-semibold min-w-[4.5rem] text-center text-sm">
                            {item.quantity} {item.unit}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md"
                            onClick={() => handleQuantityChange(item.id, 1, item.quantity, item.unit)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                          onClick={() => handleDelete(item.id, item.ingredientName)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ingredient to Pantry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Ingredient Name *</Label>
              <Input
                placeholder="e.g. Basmati Rice"
                value={newItem.ingredientName}
                onChange={e => setNewItem(p => ({ ...p, ingredientName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItem.quantity}
                  onChange={e => setNewItem(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input
                  placeholder="cups, grams, pieces..."
                  value={newItem.unit}
                  onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  placeholder="Grains, Vegetables..."
                  value={newItem.category}
                  onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItem.lowThreshold}
                  onChange={e => setNewItem(p => ({ ...p, lowThreshold: parseFloat(e.target.value) || 1 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newItem.ingredientName.trim() || createItem.isPending}>
              Add to Pantry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
