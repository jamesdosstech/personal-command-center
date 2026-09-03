import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  notes?: string;
  calendar?: string;
}

export interface CalendarRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
}

export interface CreateCalendarEvent {
  calendar: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  notes?: string;
  recurrence?: CalendarRecurrence;
}

export interface UpdateCalendarEvent {
  calendar?: string;
  title?: string;
  start?: string;
  end?: string;
  location?: string;
  notes?: string;
}

interface CalendarResponse {
  events: CalendarEvent[];
  cached: boolean;
}

interface CreateCalendarResponse {
  event: CalendarEvent;
}

interface UpdateCalendarResponse {
  event: CalendarEvent;
}

interface DeleteCalendarResponse {
  success: boolean;
  id: string;
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

  createEvent(event: CreateCalendarEvent): Observable<CreateCalendarResponse> {
    return this.http.post<CreateCalendarResponse>(
      `${this.apiUrl}/events`,
      event
    );
  }

  updateEvent(
    id: string,
    event: UpdateCalendarEvent
  ): Observable<UpdateCalendarResponse> {
    return this.http.put<UpdateCalendarResponse>(
      `${this.apiUrl}/events/${encodeURIComponent(id)}`,
      event
    );
  }

  deleteEvent(id: string): Observable<DeleteCalendarResponse> {
    return this.http.delete<DeleteCalendarResponse>(
      `${this.apiUrl}/events/${encodeURIComponent(id)}`
    );
  }
}
