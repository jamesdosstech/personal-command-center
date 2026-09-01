import { Component, OnInit, inject, signal } from '@angular/core';

import { EventsService } from '../../core/services/events.service';
import { LocalEvent } from '../../core/models/local-event.model';

const SEGMENTS = ['Music', 'Arts & Theatre'] as const;

type Segment = (typeof SEGMENTS)[number];

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [],
  template: `
    <section class="events-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">DALLAS / FT. WORTH</p>

          <h1>Local Events</h1>

          <p class="subtitle">
            Music and art happening near you, pulled straight in.
          </p>
        </div>

        <a
          class="do214-link"
          href="https://do214.com/local-music"
          target="_blank"
          rel="noopener noreferrer"
        >
          Check Do214 for local/underground shows →
        </a>
      </header>

      <div class="filter-bar">
        @for (segment of segments; track segment) {
        <button
          type="button"
          class="filter-chip"
          [class.active]="activeSegment() === segment"
          (click)="selectSegment(segment)"
        >
          {{ segment }}
        </button>
        }

        <input
          type="text"
          class="keyword-input"
          placeholder="Search artist, venue, keyword..."
          [value]="keyword()"
          (change)="onKeywordChange($event)"
        />
      </div>

      @if (loading()) {

      <section class="events-state">
        <span>🎧</span>
        <p>Loading events...</p>
      </section>

      } @else if (error()) {

      <section class="events-state">
        <span>⚠️</span>
        <p>{{ error() }}</p>
        <p class="hint">
          Run <code>npm start</code> inside <code>events-bridge/</code> with
          your Ticketmaster key set in <code>.env</code>.
        </p>
      </section>

      } @else if (events().length === 0) {

      <section class="events-state">
        <span>🎫</span>
        <h2>No events found.</h2>
        <p>Try a different search or check back later.</p>
      </section>

      } @else {

      <section class="events-grid">
        @for (event of events(); track event.id) {

        <a
          class="event-card"
          [href]="event.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          @if (event.image) {
          <div
            class="event-image"
            [style.background-image]="'url(' + event.image + ')'"
          ></div>
          }

          <div class="event-body">
            @if (event.start) {
            <span class="event-date">
              {{ formatDate(event.start) }}
            </span>
            }

            <h2>{{ event.name }}</h2>

            @if (event.venue) {
            <p class="event-venue">
              📍 {{ event.venue }} @if (event.city) { · {{ event.city }} }
            </p>
            }

            <div class="event-tags">
              @if (event.genre) {
              <span class="tag">{{ event.genre }}</span>
              } @if (event.priceMin) {
              <span class="tag price">{{ formatPrice(event) }}</span>
              }
            </div>
          </div>
        </a>

        }
      </section>

      }
    </section>
  `,
  styleUrl: './events.component.scss',
})
export class EventsComponent implements OnInit {
  private readonly eventsService = inject(EventsService);

  readonly segments = SEGMENTS;

  readonly events = this.eventsService.events;
  readonly loading = this.eventsService.loading;
  readonly error = this.eventsService.error;

  readonly activeSegment = signal<Segment>('Music');
  readonly keyword = signal('');

  ngOnInit(): void {
    this.fetchEvents();
  }

  selectSegment(segment: Segment): void {
    this.activeSegment.set(segment);
    this.fetchEvents();
  }

  onKeywordChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.keyword.set(value);
    this.fetchEvents();
  }

  private fetchEvents(): void {
    this.eventsService.loadEvents({
      classificationName: this.activeSegment(),
      keyword: this.keyword() || undefined,
    });
  }

  formatPrice(event: LocalEvent): string {
    const min = Math.round(event.priceMin ?? 0);

    if (event.priceMax && event.priceMax !== event.priceMin) {
      return `$${min}–$${Math.round(event.priceMax)}`;
    }

    return `$${min}`;
  }

  formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString));
  }
}
