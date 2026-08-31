import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  calendar?: string;
}

interface CalendarResponse {
  events: CalendarEvent[];
  cached: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:3333/api/calendar';

  readonly events = signal<CalendarEvent[]>([]);

  readonly loading = signal(false);

  readonly error = signal('');

  loadEvents(): void {
    this.loading.set(true);
    this.error.set('');

    this.http.get<CalendarResponse>(`${this.apiUrl}/today`).subscribe({
      next: (response) => {
        this.events.set(response.events);
        this.loading.set(false);
      },

      error: (error) => {
        console.error('CalendarService error:', error);

        this.error.set('Unable to load your calendar.');

        this.loading.set(false);
      },
    });
  }
}
