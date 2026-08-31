import { Component, OnInit, inject } from '@angular/core';

import { CalendarService } from '../../core/services/calendar.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [],
  template: `
    <section class="calendar-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">DAILY PLANNER</p>

          <h1>Calendar</h1>

          <p class="subtitle">Your schedule, without the noise.</p>
        </div>
      </header>

      @if (loading()) {

      <section class="calendar-state">
        <span>📅</span>

        <p>Loading your calendar...</p>
      </section>

      } @else if (error()) {

      <section class="calendar-state">
        <span>⚠️</span>

        <p>
          {{ error() }}
        </p>
      </section>

      } @else if (events().length === 0) {

      <section class="calendar-state">
        <span>📅</span>

        <h2>Nothing scheduled.</h2>

        <p>Your day is wide open.</p>
      </section>

      } @else {

      <section class="event-list">
        @for ( event of events(); track event.id ) {

        <article class="event-card">
          <div class="event-time">
            <strong>
              {{ formatTime(event.start) }}
            </strong>

            <span>
              {{ formatTime(event.end) }}
            </span>
          </div>

          <div class="event-content">
            <h2>
              {{ event.title }}
            </h2>

            @if (event.location) {

            <p>📍 {{ event.location }}</p>

            } @if (event.calendar) {

            <span class="calendar-name">
              {{ event.calendar }}
            </span>

            }
          </div>

          <div class="event-duration">
            {{ getDuration(event.start, event.end) }}
          </div>
        </article>

        }
      </section>

      }
    </section>
  `,
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent implements OnInit {
  private readonly calendarService = inject(CalendarService);

  readonly events = this.calendarService.events;

  readonly loading = this.calendarService.loading;

  readonly error = this.calendarService.error;

  ngOnInit(): void {
    this.calendarService.loadEvents();
  }

  formatTime(dateString: string): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString));
  }

  getDuration(start: string, end: string): string {
    const startTime = new Date(start).getTime();

    const endTime = new Date(end).getTime();

    const minutes = Math.round((endTime - startTime) / 60000);

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);

    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remainingMinutes} min`;
  }
}
