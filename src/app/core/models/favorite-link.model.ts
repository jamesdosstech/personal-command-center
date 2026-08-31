export interface FavoriteLink {
  id: string;
  name: string;
  url: string;
  category: FavoriteCategory;
  description?: string;
  icon?: string;
  createdAt: string;
}

export type FavoriteCategory =
  | 'music'
  | 'development'
  | 'learning'
  | 'entertainment'
  | 'work'
  | 'other';
