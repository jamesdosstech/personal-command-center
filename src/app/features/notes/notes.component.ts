import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { NotesService } from '../../core/services/notes.service';
import { Note } from '../../core/models/note.model';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.scss',
})
export class NotesComponent implements OnInit, OnDestroy {
  private readonly notesService = inject(NotesService);
  private readonly destroy$ = new Subject<void>();
  private readonly save$ = new Subject<void>();

  readonly notes = this.notesService.notes;
  readonly loading = this.notesService.loading;
  readonly error = this.notesService.error;

  readonly searchTerm = signal('');
  readonly selectedNoteId = signal<string | null>(null);
  readonly saveStatus = signal<'saved' | 'saving'>('saved');

  readonly filteredNotes = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    const notes = this.notes();

    if (!search) {
      return notes;
    }

    return notes.filter((note) => {
      const searchableText = [note.title, note.content, ...note.tags]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(search);
    });
  });

  readonly selectedNote = computed(() => {
    const id = this.selectedNoteId();

    if (!id) {
      return null;
    }

    return this.notes().find((note) => note.id === id) ?? null;
  });

  ngOnInit(): void {
    this.notesService.loadNotes();

    /*
     * Wait until the user stops typing before saving.
     *
     * This prevents a network request on every keystroke.
     */
    this.save$
      .pipe(debounceTime(650), takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveStatus.set('saving');

        /*
         * NotesService already owns persistence.
         * The service has already been updated locally,
         * so this simply gives the UI a short "saving" state.
         */
        setTimeout(() => {
          this.saveStatus.set('saved');
        }, 150);
      });
  }

  createNote(): void {
    const note = this.notesService.createNote();

    this.selectedNoteId.set(note.id);
    this.saveStatus.set('saved');
  }

  selectNote(note: Note): void {
    this.selectedNoteId.set(note.id);
    this.saveStatus.set('saved');
  }

  updateTitle(value: string): void {
    const note = this.selectedNote();

    if (!note) {
      return;
    }

    this.notesService.updateNote(note.id, {
      title: value,
    });

    this.queueSave();
  }

  updateContent(value: string): void {
    const note = this.selectedNote();

    if (!note) {
      return;
    }

    this.notesService.updateNote(note.id, {
      content: value,
    });

    this.queueSave();
  }

  updateTags(value: string): void {
    const note = this.selectedNote();

    if (!note) {
      return;
    }

    const tags = value
      .split(',')
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean);

    this.notesService.updateNote(note.id, {
      tags,
    });

    this.queueSave();
  }

  togglePinned(): void {
    const note = this.selectedNote();

    if (!note) {
      return;
    }

    this.notesService.togglePinned(note.id);
    this.saveStatus.set('saved');
  }

  deleteSelectedNote(): void {
    const note = this.selectedNote();

    if (!note) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${note.title || 'Untitled Note'}"?`
    );

    if (!confirmed) {
      return;
    }

    this.notesService.deleteNote(note.id);

    const remainingNotes = this.filteredNotes();

    this.selectedNoteId.set(
      remainingNotes.length > 0 ? remainingNotes[0].id : null
    );

    this.saveStatus.set('saved');
  }

  formatUpdatedAt(note: Note): string {
    const date = new Date(note.updatedAt);

    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private queueSave(): void {
    this.saveStatus.set('saving');
    this.save$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
