import { useListRecipes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, Clock, Users, Leaf, ChefHat, Heart, Filter, X } from "lucide-react";
import { useState, useEffect } from "react";
import { isFavorite, toggleFavorite, getFavorites } from "@/lib/favorites";
import { useToast } from "@/hooks/use-toast";

const TIME_FILTERS = [
  { label: "Any time", max: Infinity },
  { label: "Under 20m", max: 20 },
  { label: "Under 30m", max: 30 },
  { label: "Under 60m", max: 60 },
];

export default function Recipes() {
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState<string>("all");
  const [vegOnly, setVegOnly] = useState(false);
  const [timeFilter, setTimeFilter] = useState(0);
  const [favOnly, setFavOnly] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: recipes, isLoading } = useListRecipes();

  useEffect(() => { setFavorites(getFavorites()); }, []);

  const cuisines = ["all", ...Array.from(new Set(recipes?.map(r => r.cuisineType) ?? []))].filter(Boolean);

  const filtered = (recipes ?? []).filter(r => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisineType.toLowerCase().includes(search.toLowerCase());
    const matchCuisine = cuisineFilter === "all" || r.cuisineType === cuisineFilter;
    const matchVeg = !vegOnly || r.isVegetarian;
    const matchTime = r.prepTimeMins <= TIME_FILTERS[timeFilter].max;
    const matchFav = !favOnly || favorites.includes(r.id);
    return matchSearch && matchCuisine && matchVeg && matchTime && matchFav;
  });

  const hasFilters = search || cuisineFilter !== "all" || vegOnly || timeFilter !== 0 || favOnly;

  const handleToggleFav = (e: React.MouseEvent, id: number, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleFavorite(id);
    setFavorites(next);
    toast({ title: next.includes(id) ? `Added to favourites ❤️` : "Removed from favourites", description: name });
  };

  const clearFilters = () => {
    setSearch(""); setCuisineFilter("all"); setVegOnly(false); setTimeFilter(0); setFavOnly(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">Recipes</h1>
          <p className="text-muted-foreground mt-1">Your personal cookbook collection. {recipes?.length ?? 0} recipes total.</p>
        </div>
        {favorites.length > 0 && (
          <Button
            variant={favOnly ? "default" : "outline"}
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => setFavOnly(!favOnly)}
          >
            <Heart className={`w-4 h-4 ${favOnly ? "fill-current" : ""}`} />
            Favourites ({favorites.length})
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-card p-2 rounded-xl border shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
        <Input
          placeholder="Search recipes or cuisine..."
          className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground mr-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
          <Filter className="w-3.5 h-3.5" />
          Filters:
        </div>

        {/* Cuisine */}
        <div className="flex flex-wrap gap-1.5">
          {cuisines.map(c => (
            <button
              key={c}
              onClick={() => setCuisineFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                cuisineFilter === c
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "all" ? "All Cuisines" : c}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Prep time */}
        {TIME_FILTERS.map((tf, i) => (
          <button
            key={tf.label}
            onClick={() => setTimeFilter(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              timeFilter === i
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {tf.label}
          </button>
        ))}

        <div className="w-px h-5 bg-border mx-1" />

        {/* Veg toggle */}
        <button
          onClick={() => setVegOnly(!vegOnly)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
            vegOnly
              ? "bg-green-600 text-white border-green-600 shadow-sm"
              : "bg-card border-border hover:border-green-400 text-muted-foreground hover:text-green-700"
          }`}
        >
          <Leaf className="w-3 h-3" />
          Veg Only
        </button>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30 transition-all flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Results count */}
      {hasFilters && !isLoading && (
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {recipes?.length ?? 0} recipes
        </p>
      )}

      {/* Recipe Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="col-span-full text-center py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <ChefHat className="w-12 h-12 text-muted" />
          <p className="font-medium">No recipes found</p>
          <p className="text-sm">Try adjusting your filters</p>
          {hasFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((recipe) => {
            const favd = favorites.includes(recipe.id);
            return (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                <Card className="h-full flex flex-col cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 group overflow-hidden relative">
                  {/* Favourite button */}
                  <button
                    onClick={(e) => handleToggleFav(e, recipe.id, recipe.name)}
                    className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                      favd
                        ? "bg-rose-50 border-rose-300 text-rose-500"
                        : "bg-white/80 backdrop-blur-sm border-transparent hover:border-rose-300 hover:text-rose-400 text-muted-foreground opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${favd ? "fill-rose-500" : ""}`} />
                  </button>

                  {recipe.imageUrl && (
                    <div className="h-44 w-full overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                      />
                    </div>
                  )}

                  <CardHeader className={`${recipe.imageUrl ? "pt-4" : ""} pb-2`}>
                    <div className="flex justify-between items-start mb-2 gap-2 pr-6">
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-xs shrink-0">
                        {recipe.cuisineType}
                      </Badge>
                      {recipe.isVegetarian && (
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-xs shrink-0">
                          <Leaf className="w-3 h-3 mr-1" /> Veg
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {recipe.name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-grow pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
                  </CardContent>

                  <CardFooter className="pt-0 flex gap-4 text-sm text-muted-foreground border-t border-border/50 p-4 bg-muted/20">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{recipe.prepTimeMins}m</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{recipe.servings} servings</span>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
