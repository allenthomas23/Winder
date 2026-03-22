import { useState, useEffect } from 'react';

const STORAGE_KEY = 'winder_favorites';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save(favs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(load);

  // Keep localStorage in sync whenever favorites changes
  useEffect(() => {
    save(favorites);
  }, [favorites]);

  function addFavorite(route, name) {
    const fav = {
      id: `fav_${Date.now()}`,
      sourceId: route.id,
      name: name || `Loop ${route.totalDistance.toFixed(1)} mi`,
      savedAt: new Date().toISOString(),
      coords: route.coords,
      totalDistance: route.totalDistance,
      avgCurviness: route.avgCurviness,
    };
    setFavorites((prev) => [fav, ...prev]);
    return fav.id;
  }

  function removeFavorite(id) {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }

  function renameFavorite(id, name) {
    setFavorites((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name } : f))
    );
  }

  return { favorites, addFavorite, removeFavorite, renameFavorite };
}
