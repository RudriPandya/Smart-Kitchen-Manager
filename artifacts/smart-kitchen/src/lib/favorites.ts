const KEY = "sous_chef_favorites";

export function getFavorites(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function toggleFavorite(id: number): number[] {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  const next = idx === -1 ? [...favs, id] : favs.filter(f => f !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function isFavorite(id: number): boolean {
  return getFavorites().includes(id);
}
