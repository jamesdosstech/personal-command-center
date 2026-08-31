import { Injectable, signal } from '@angular/core';
import { FavoriteLink } from '../models/favorite-link.model';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly storageKey = 'personal-command-center-favorites';

  private readonly favoritesState = signal<FavoriteLink[]>(
    this.loadFavorites().length
      ? this.loadFavorites()
      : [
          {
            id: crypto.randomUUID(),
            name: 'YouTube',
            url: 'https://youtube.com',
            category: 'entertainment',
            description: 'Videos, music and DJ sets',
            icon: '▶️',
            createdAt: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            name: 'GitHub',
            url: 'https://github.com',
            category: 'development',
            description: 'Code and projects',
            icon: '💻',
            createdAt: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            name: 'Beatport',
            url: 'https://beatport.com',
            category: 'music',
            description: 'Electronic music',
            icon: '🎧',
            createdAt: new Date().toISOString(),
          },
        ]
  );

  readonly favorites = this.favoritesState.asReadonly();

  addFavorite(favorite: FavoriteLink): void {
    const updated = [...this.favorites(), favorite];

    this.favoritesState.set(updated);
    this.saveFavorites(updated);
  }

  removeFavorite(id: string): void {
    const updated = this.favorites().filter((favorite) => favorite.id !== id);

    this.favoritesState.set(updated);
    this.saveFavorites(updated);
  }

  updateFavorite(updatedFavorite: FavoriteLink): void {
    const updated = this.favorites().map((favorite) =>
      favorite.id === updatedFavorite.id ? updatedFavorite : favorite
    );

    this.favoritesState.set(updated);
    this.saveFavorites(updated);
  }

  private loadFavorites(): FavoriteLink[] {
    const stored = localStorage.getItem(this.storageKey);

    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored) as FavoriteLink[];
    } catch {
      return [];
    }
  }

  private saveFavorites(favorites: FavoriteLink[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(favorites));
  }
}
