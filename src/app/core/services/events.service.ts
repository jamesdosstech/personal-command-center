import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LocalEvent } from '../models/local-event.model';

interface EventsResponse {
  events: LocalEvent[];
  total: number;
  cached: boolean;
}

export interface EventsQuery {
  keyword?: string;
  classificationName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly http = inject(HttpClient);

  /**
   * Production:
   * The Angular app and Netlify Function share the same origin.
   *
   * Local development can continue using the existing events-bridge
   * until we switch the local development workflow to Netlify Dev.
   */
  private readonly apiUrl = '/api/events';

  readonly events = signal<LocalEvent[]>([]);

  readonly loading = signal(false);

  readonly error = signal('');

  loadEvents(query: EventsQuery = {}): void {
    this.loading.set(true);
    this.error.set('');

    let params = new HttpParams();

    if (query.keyword) {
      params = params.set('keyword', query.keyword);
    }

    if (query.classificationName) {
      params = params.set('classificationName', query.classificationName);
    }

    this.http.get<EventsResponse>(this.apiUrl, { params }).subscribe({
      next: (response) => {
        this.events.set(response.events);
        this.loading.set(false);
      },

      error: (error) => {
        console.error('EventsService error:', error);

        this.error.set('Unable to load events right now.');

        this.loading.set(false);
      },
    });
  }
}
