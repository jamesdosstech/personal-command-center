import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CalendarService,
  CreateCalendarEvent,
} from '../../core/services/calendar.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="calendar-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">DAILY PLANNER</p>
          <h1>Calendar</h1>
          <p class="subtitle">Your schedule, without the noise.</p>
        </div>

        <button type="button" (click)="toggleCreateForm()">
          {{ showCreateForm() ? 'Cancel' : '+ Create Event' }}
        </button>
      </header>

      @if (showCreateForm()) {
      <section class="create-event-panel">
        <h2>Create Event</h2>

        <form (ngSubmit)="createEvent()">
          <div>
            <label for="title">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              [(ngModel)]="form.title"
              placeholder="Event title"
              required
            />
          </div>

          <div>
            <label for="calendar">Calendar</label>
            <select
              id="calendar"
              name="calendar"
              [(ngModel)]="form.calendar"
              required
            >
              <option value="Work">Work</option>
              <option value="Home">Home</option>
              <option value="Calendar">Calendar</option>
              <option value="Family">Family</option>
            </select>
          </div>

          <div>
            <label for="date">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              [(ngModel)]="form.date"
              required
            />
          </div>

          <div>
            <label for="startTime">Start Time</label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              [(ngModel)]="form.startTime"
              required
            />
          </div>

          <div>
            <label for="endTime">End Time</label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              [(ngModel)]="form.endTime"
              required
            />
          </div>

          <div>
            <label for="repeat">Repeat</label>
            <select id="repeat" name="repeat" [(ngModel)]="form.repeat">
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          @if (form.repeat !== 'none') {
          <div>
            <label for="repeatInterval">Repeat Every</label>

            <select
              id="repeatInterval"
              name="repeatInterval"
              [(ngModel)]="form.repeatInterval"
            >
              <option [ngValue]="1">1 {{ getRepeatUnit() }}</option>

              <option [ngValue]="2">2 {{ getRepeatUnit(true) }}</option>

              <option [ngValue]="3">3 {{ getRepeatUnit(true) }}</option>

              <option [ngValue]="4">4 {{ getRepeatUnit(true) }}</option>
            </select>
          </div>
          }

          <div>
            <label for="location">Location</label>
            <input
              id="location"
              name="location"
              type="text"
              [(ngModel)]="form.location"
              placeholder="Optional"
            />
          </div>

          <div>
            <label for="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              [(ngModel)]="form.notes"
              placeholder="Optional"
              rows="4"
            ></textarea>
          </div>

          @if (createError()) {
          <p>{{ createError() }}</p>
          }

          <button type="submit" [disabled]="creating()">
            {{ creating() ? 'Creating...' : 'Create Event' }}
          </button>
        </form>
      </section>
      } @if (deleting()) {
      <section class="calendar-state">
        <span>🗑️</span>
        <p>Deleting event...</p>
      </section>
      } @if (deleteError()) {
      <section class="calendar-state">
        <span>⚠️</span>
        <p>{{ deleteError() }}</p>
      </section>
      } @if (loading()) {
      <section class="calendar-state">
        <span>📅</span>
        <p>Loading your calendar...</p>
      </section>
      } @else if (error()) {
      <section class="calendar-state">
        <span>⚠️</span>
        <p>{{ error() }}</p>
      </section>
      } @else if (events().length === 0) {
      <section class="calendar-state">
        <span>📅</span>
        <h2>Nothing scheduled.</h2>
        <p>Your day is wide open.</p>
      </section>
      } @else {
      <section class="event-list">
        @for (event of events(); track event.id) {
        <article class="event-card">
          <div class="event-time">
            <strong>{{ formatTime(event.start) }}</strong>
            <span>{{ formatTime(event.end) }}</span>
          </div>

          <div class="event-content">
            <h2>{{ event.title }}</h2>

            @if (event.location) {
            <p>📍 {{ event.location }}</p>
            } @if (event.calendar) {
            <span class="calendar-name">
              {{ event.calendar }}
            </span>
            }
          </div>

          <div class="event-actions">
            <div class="event-duration">
              {{ getDuration(event.start, event.end) }}
            </div>

            <button
              type="button"
              class="delete-button"
              [disabled]="deleting()"
              (click)="deleteEvent(event.id, event.title)"
              [attr.aria-label]="'Delete ' + event.title"
            >
              🗑️
            </button>
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

  readonly showCreateForm = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');

  readonly deleting = signal(false);
  readonly deleteError = signal('');

  readonly form = {
    title: '',
    calendar: 'Work',
    date: this.getTodayDate(),
    startTime: '09:00',
    endTime: '10:00',
    repeat: 'none',
    repeatInterval: 1,
    location: '',
    notes: '',
  };

  ngOnInit(): void {
    this.calendarService.loadEvents();
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((visible) => !visible);
    this.createError.set('');
  }

  createEvent(): void {
    this.createError.set('');

    if (!this.form.title.trim()) {
      this.createError.set('Please enter an event title.');
      return;
    }

    if (!this.form.date || !this.form.startTime || !this.form.endTime) {
      this.createError.set('Please enter a date, start time, and end time.');
      return;
    }

    const start = `${this.form.date}T${this.form.startTime}:00`;
    const end = `${this.form.date}T${this.form.endTime}:00`;

    if (new Date(end).getTime() <= new Date(start).getTime()) {
      this.createError.set('End time must be after start time.');
      return;
    }

    const event: CreateCalendarEvent = {
      calendar: this.form.calendar,
      title: this.form.title.trim(),
      start,
      end,
      location: this.form.location.trim(),
      notes: this.form.notes.trim(),
    };

    if (this.form.repeat !== 'none') {
      event.recurrence = {
        frequency: this.form.repeat as 'daily' | 'weekly' | 'monthly',
        interval: this.form.repeatInterval,
      };
    }

    this.creating.set(true);

    this.calendarService.createEvent(event).subscribe({
      next: () => {
        this.creating.set(false);
        this.showCreateForm.set(false);
        this.resetForm();

        this.calendarService.loadEvents();
      },
      error: (error) => {
        console.error('CalendarComponent create event error:', error);

        this.creating.set(false);
        this.createError.set('Unable to create the event. Please try again.');
      },
    });
  }

  deleteEvent(id: string, title: string): void {
    const confirmed = window.confirm(`Delete "${title}" from Apple Calendar?`);

    if (!confirmed) {
      return;
    }

    this.deleteError.set('');
    this.deleting.set(true);

    this.calendarService.deleteEvent(id).subscribe({
      next: () => {
        this.deleting.set(false);

        this.calendarService.loadEvents();
      },
      error: (error) => {
        console.error('CalendarComponent delete event error:', error);

        this.deleting.set(false);
        this.deleteError.set('Unable to delete the event. Please try again.');
      },
    });
  }

  getRepeatUnit(plural = false): string {
    if (this.form.repeat === 'daily') {
      return plural ? 'days' : 'day';
    }

    if (this.form.repeat === 'weekly') {
      return plural ? 'weeks' : 'week';
    }

    return plural ? 'months' : 'month';
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

  private getTodayDate(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private resetForm(): void {
    this.form.title = '';
    this.form.calendar = 'Work';
    this.form.date = this.getTodayDate();
    this.form.startTime = '09:00';
    this.form.endTime = '10:00';
    this.form.repeat = 'none';
    this.form.repeatInterval = 1;
    this.form.location = '';
    this.form.notes = '';
  }
}
