import { 
  useListShoppingItems, 
  useCheckShoppingItem, 
  useClearCheckedShoppingItems,
  useCreateShoppingItem,
  useRestockFromShopping,
  getListShoppingItemsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, CheckSquare, Trash2, Plus, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Shopping() {
  const { data: items, isLoading } = useListShoppingItems();
  const checkItem = useCheckShoppingItem();
  const clearChecked = useClearCheckedShoppingItems();
  const createItem = useCreateShoppingItem();
  const restock = useRestockFromShopping();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newItemName, setNewItemName] = useState("");

  const handleCheck = (id: number, isChecked: boolean) => {
    checkItem.mutate({ id, data: { isChecked } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    createItem.mutate({ data: { name: newItemName } }, {
      onSuccess: () => {
        setNewItemName("");
        queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() });
      }
    });
  };

  const handleClear = () => {
    clearChecked.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() })
    });
  };

  const handleRestock = () => {
    restock.mutate(undefined, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListShoppingItemsQueryKey() });
        toast({
          title: "Restocked!",
          description: `Successfully added ${res.restocked} items to your pantry.`
        });
      }
    });
  };

  const pendingItems = items?.filter(i => !i.isChecked) || [];
  const checkedItems = items?.filter(i => i.isChecked) || [];

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shopping List</h1>
          <p className="text-muted-foreground mt-1">Everything you need for your upcoming meals.</p>
        </div>
        <div className="flex gap-2">
          {checkedItems.length > 0 && (
            <>
              <Button variant="outline" onClick={handleClear} disabled={clearChecked.isPending} className="gap-2">
                <Trash2 className="w-4 h-4" /> Clear
              </Button>
              <Button onClick={handleRestock} disabled={restock.isPending} className="gap-2">
                <ArrowRightLeft className="w-4 h-4" /> Restock Pantry
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="shadow-md">
        <CardContent className="p-0">
          <form onSubmit={handleAdd} className="flex gap-2 p-4 border-b border-border/50 bg-muted/20">
            <Input 
              placeholder="Add an item manually..." 
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="bg-background shadow-sm"
            />
            <Button type="submit" disabled={!newItemName.trim() || createItem.isPending}>
              <Plus className="w-4 h-4" />
            </Button>
          </form>

          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded bg-muted animate-pulse" />
                  <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : items?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <ShoppingBag className="w-12 h-12 mb-4 text-muted" />
              <p>Your shopping list is empty.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/40">
              {pendingItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group">
                  <Checkbox 
                    id={`item-${item.id}`} 
                    checked={item.isChecked}
                    onCheckedChange={(checked) => handleCheck(item.id, checked as boolean)}
                    className="h-5 w-5"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <label htmlFor={`item-${item.id}`} className="font-medium text-foreground cursor-pointer select-none">
                      {item.name}
                      {item.quantity && item.unit && (
                        <span className="ml-2 text-muted-foreground font-normal text-sm">
                          ({item.quantity} {item.unit})
                        </span>
                      )}
                    </label>
                    {item.reason && (
                      <Badge variant="secondary" className="text-xs font-normal bg-accent text-accent-foreground ml-4 hidden sm:inline-flex">
                        {item.reason}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {checkedItems.length > 0 && (
                <div className="bg-muted/10">
                  <div className="px-4 py-2 bg-muted/30 border-y border-border/40 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CheckSquare className="w-4 h-4" />
                    Completed Items
                  </div>
                  {checkedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors opacity-60">
                      <Checkbox 
                        id={`item-${item.id}`} 
                        checked={item.isChecked}
                        onCheckedChange={(checked) => handleCheck(item.id, checked as boolean)}
                        className="h-5 w-5"
                      />
                      <label htmlFor={`item-${item.id}`} className="font-medium line-through cursor-pointer select-none">
                        {item.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
