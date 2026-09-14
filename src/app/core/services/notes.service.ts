import { Injectable, inject, signal } from '@angular/core';
import { DataStoreService } from './data-store.service';
import { Note } from '../models/note.model';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  private readonly dataStore = inject(DataStoreService);

  readonly notes = signal<Note[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  loadNotes(): void {
    this.loading.set(true);
    this.error.set('');

    this.dataStore.get<Note[]>('notes').subscribe({
      next: (notes) => {
        this.notes.set(notes ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('NotesService error:', error);
        this.error.set('Unable to load your notes.');
        this.loading.set(false);
      },
    });
  }

  createNote(title = 'Untitled Note', content = ''): Note {
    const now = new Date().toISOString();

    const note: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      tags: [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };

    this.notes.update((notes) => [note, ...notes]);
    this.persistNotes();

    return note;
  }

  updateNote(id: string, changes: Partial<Note>): void {
    this.notes.update((notes) =>
      notes.map((note) =>
        note.id === id
          ? {
              ...note,
              ...changes,
              updatedAt: new Date().toISOString(),
            }
          : note
      )
    );

    this.persistNotes();
  }

  deleteNote(id: string): void {
    this.notes.update((notes) => notes.filter((note) => note.id !== id));

    this.persistNotes();
  }

  togglePinned(id: string): void {
    this.notes.update((notes) =>
      notes.map((note) =>
        note.id === id
          ? {
              ...note,
              pinned: !note.pinned,
              updatedAt: new Date().toISOString(),
            }
          : note
      )
    );

    this.persistNotes();
  }

  private persistNotes(): void {
    const sortedNotes = [...this.notes()].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    this.notes.set(sortedNotes);

    this.dataStore.set('notes', sortedNotes).subscribe({
      error: (error) => {
        console.error('Failed to save notes:', error);
        this.error.set('Unable to save your notes.');
      },
    });
  }
}
