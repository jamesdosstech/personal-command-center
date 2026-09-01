import { Injectable, inject, signal } from '@angular/core';
import { FavoriteLink } from '../models/favorite-link.model';
import { DataStoreService } from './data-store.service';

const STORAGE_KEY = 'favorites';

function defaultFavorites(): FavoriteLink[] {
  return [
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
  ];
}

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly dataStore = inject(DataStoreService);

  private readonly favoritesState = signal<FavoriteLink[]>([]);

  readonly favorites = this.favoritesState.asReadonly();

  readonly loading = signal(true);

  constructor() {
    this.dataStore.get<FavoriteLink[]>(STORAGE_KEY).subscribe((value) => {
      // `null` means the key has never been saved before (first run) -
      // an explicit empty array means the user deleted everything, which
      // we should respect rather than re-seeding defaults.
      const initial = value ?? defaultFavorites();

      this.favoritesState.set(initial);
      this.loading.set(false);

      if (value === null) {
        this.saveFavorites(initial);
      }
    });
  }

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

  private saveFavorites(favorites: FavoriteLink[]): void {
    this.dataStore.set(STORAGE_KEY, favorites).subscribe();
  }
}
