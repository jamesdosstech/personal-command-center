import { Component, inject } from '@angular/core';
import { FavoritesService } from '../../core/services/favorites.service';
import {
  FavoriteCategory,
  FavoriteLink,
} from '../../core/models/favorite-link.model';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [FormsModule, TitleCasePipe],
  template: `
    <section class="favorites-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">YOUR INTERNET</p>
          <h1>Favorites</h1>
          <p class="subtitle">Everything you want one click away.</p>
        </div>

        <button class="add-button" type="button" (click)="openForm()">
          + Add Favorite
        </button>
      </header>

      @if (isFormOpen) {
      <div class="form-overlay">
        <div class="favorite-form">
          <div class="form-header">
            <div>
              <p class="eyebrow">NEW LINK</p>
              <h2>Add Favorite</h2>
            </div>

            <button class="close-button" type="button" (click)="closeForm()">
              ×
            </button>
          </div>

          <form (ngSubmit)="addFavorite()">
            <label>
              Name

              <input
                type="text"
                name="name"
                [(ngModel)]="newFavorite.name"
                placeholder="YouTube"
                required
              />
            </label>

            <label>
              URL

              <input
                type="url"
                name="url"
                [(ngModel)]="newFavorite.url"
                placeholder="https://youtube.com"
                required
              />
            </label>

            <label>
              Category

              <select name="category" [(ngModel)]="newFavorite.category">
                @for (category of categories; track category) {
                <option [value]="category">
                  {{ category | titlecase }}
                </option>
                }
              </select>
            </label>

            <label>
              Description

              <input
                type="text"
                name="description"
                [(ngModel)]="newFavorite.description"
                placeholder="Music and DJ sets"
              />
            </label>

            <label>
              Icon

              <input
                type="text"
                name="icon"
                [(ngModel)]="newFavorite.icon"
                placeholder="🎧"
                maxlength="4"
              />
            </label>

            <div class="form-actions">
              <button type="button" class="cancel-button" (click)="closeForm()">
                Cancel
              </button>

              <button type="submit" class="save-button">Save Favorite</button>
            </div>
          </form>
        </div>
      </div>
      } @if (favorites().length === 0) {

      <div class="empty-state">
        <span class="empty-icon">⭐</span>

        <h2>No favorites yet</h2>

        <p>
          Add your favorite websites and keep everything you use regularly in
          one place.
        </p>
      </div>

      } @else {

      <div class="favorites-grid">
        @for (favorite of favorites(); track favorite.id) {

        <article class="favorite-card">
          <a
            class="favorite-link"
            [href]="favorite.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="favorite-icon">
              {{ favorite.icon || '🔗' }}
            </span>

            <div class="favorite-content">
              <h2>{{ favorite.name }}</h2>

              @if (favorite.description) {
              <p>{{ favorite.description }}</p>
              }
            </div>
          </a>

          <button
            class="delete-button"
            type="button"
            (click)="removeFavorite(favorite.id)"
            aria-label="Delete favorite"
          >
            ×
          </button>
        </article>

        }
      </div>

      }
    </section>
  `,
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent {
  private readonly favoritesService = inject(FavoritesService);

  readonly favorites = this.favoritesService.favorites;

  readonly categories: FavoriteCategory[] = [
    'music',
    'development',
    'learning',
    'entertainment',
    'work',
    'other',
  ];

  isFormOpen = false;

  newFavorite = {
    name: '',
    url: '',
    category: 'other' as FavoriteCategory,
    description: '',
    icon: '',
  };

  openForm(): void {
    this.isFormOpen = true;
  }

  closeForm(): void {
    this.isFormOpen = false;
    this.resetForm();
  }

  addFavorite(): void {
    if (!this.newFavorite.name.trim() || !this.newFavorite.url.trim()) {
      return;
    }

    const favorite: FavoriteLink = {
      id: crypto.randomUUID(),
      name: this.newFavorite.name.trim(),
      url: this.newFavorite.url.trim(),
      category: this.newFavorite.category,
      description: this.newFavorite.description.trim(),
      icon: this.newFavorite.icon.trim(),
      createdAt: new Date().toISOString(),
    };

    this.favoritesService.addFavorite(favorite);

    this.closeForm();
  }

  removeFavorite(id: string): void {
    this.favoritesService.removeFavorite(id);
  }

  private resetForm(): void {
    this.newFavorite = {
      name: '',
      url: '',
      category: 'other',
      description: '',
      icon: '',
    };
  }
}
