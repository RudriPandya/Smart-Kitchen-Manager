import { useListRecipes } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, Clock, Users, Leaf, ChefHat } from "lucide-react";
import { useState } from "react";

export default function Recipes() {
  const [search, setSearch] = useState("");
  const { data: recipes, isLoading } = useListRecipes();

  const filteredRecipes = recipes?.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisineType.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recipes</h1>
          <p className="text-muted-foreground mt-1">Your personal cookbook collection.</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-card p-2 rounded-lg border shadow-sm">
        <Search className="h-5 w-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search by name or cuisine..." 
          className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <Card className="h-full flex flex-col cursor-pointer hover:border-primary/50 hover-elevate transition-all group overflow-hidden">
                {recipe.imageUrl && (
                  <div className="h-40 w-full overflow-hidden bg-muted">
                    <img 
                      src={recipe.imageUrl} 
                      alt={recipe.name} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" 
                    />
                  </div>
                )}
                <CardHeader className={`${recipe.imageUrl ? 'pt-4' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                      {recipe.cuisineType}
                    </Badge>
                    {recipe.isVegetarian && (
                      <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                        <Leaf className="w-3 h-3 mr-1" /> Veg
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="line-clamp-2 leading-tight">{recipe.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {recipe.description}
                  </p>
                </CardContent>
                <CardFooter className="pt-0 flex gap-4 text-sm text-muted-foreground border-t border-border/50 mt-4 p-4 bg-muted/20">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{recipe.prepTimeMins}m</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{recipe.servings}</span>
                  </div>
                  {recipe.isAiGenerated && (
                    <div className="flex items-center gap-1.5 ml-auto text-primary/70">
                      <ChefHat className="w-4 h-4" />
                      <span className="text-xs font-medium">AI</span>
                    </div>
                  )}
                </CardFooter>
              </Card>
            </Link>
          ))}
          {filteredRecipes.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No recipes found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
