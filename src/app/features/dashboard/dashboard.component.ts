import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TasksService } from '../../core/services/tasks.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { WeatherService } from '../../core/services/weather.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { JobsService } from '../../core/services/jobs.service';
import { CalendarService } from '../../core/services/calendar.service';
import { EventsService } from '../../core/services/events.service';

interface FocusItem {
  id: string;
  title: string;
  description: string;
  type: 'task' | 'job' | 'calendar';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, DatePipe],
  template: `
    <section class="dashboard">
      <!-- Header -->
      <header class="dashboard-header">
        <div>
          <p class="eyebrow">WEDNESDAY, AUGUST 26</p>

          <h1>Good morning, James.</h1>

          <p class="subtitle">Let's get some things done.</p>
        </div>

        <div class="weather-card">
          @if (weatherLoading()) {

          <div class="weather-loading">Loading weather...</div>

          } @else if (weatherError()) {

          <div class="weather-error">
            {{ weatherError() }}
          </div>

          } @else { @if (weather(); as currentWeather) {

          <span class="weather-icon">
            {{ getWeatherIcon(currentWeather.current.weatherCode) }}
          </span>

          <div class="weather-details">
            <div class="weather-main">
              <strong>
                {{ currentWeather.current.temperature | number : '1.0-0' }}°
              </strong>

              <span>
                {{ getWeatherDescription(currentWeather.current.weatherCode) }}
              </span>
            </div>

            <small>
              {{ currentWeather.location.name }}
              · Feels like
              {{
                currentWeather.current.apparentTemperature | number : '1.0-0'
              }}°
            </small>
          </div>

          } }
        </div>
      </header>

      <!-- Quick Stats -->
      <section class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">OPEN TASKS</span>

          <strong>
            {{ incompleteTasks().length }}
          </strong>

          <span class="stat-description"> Still on your plate </span>
        </div>

        <div class="stat-card">
          <span class="stat-label">COMPLETED</span>

          <strong>
            {{ completedTaskCount() }}
          </strong>

          <span class="stat-description"> Tasks knocked out </span>
        </div>

        <div class="stat-card">
          <span class="stat-label">FAVORITES</span>

          <strong>
            {{ favorites().length }}
          </strong>

          <span class="stat-description"> Saved links </span>
        </div>

        <div class="stat-card">
          <span class="stat-label">JOB SEARCH</span>

          <strong>
            {{ appliedJobCount() }}
          </strong>

          <span class="stat-description"> Applications </span>
        </div>
      </section>

      <!-- Main Grid -->
      <div class="dashboard-grid">
        <!-- Focus Card -->
        <!-- Today's Focus -->
        <section class="dashboard-card focus-card">
          <div class="card-header">
            <div>
              <span class="card-icon">◎</span>
              <h2>Today's Focus</h2>
            </div>
          </div>

          @if (focusItems().length === 0) {

          <div class="card-empty">
            <span>🎯</span>
            <strong>Nothing urgent today.</strong>
            <span>You've got room to make some progress.</span>
          </div>

          } @else {

          <div class="focus-list">
            @for (item of focusItems(); track item.id) {

            <div class="focus-item">
              <span class="focus-number">
                {{ $index + 1 }}
              </span>

              <div class="focus-content">
                <strong>
                  {{ item.title }}
                </strong>

                <span>
                  {{ item.description }}
                </span>
              </div>

              <span class="focus-type">
                {{ item.type }}
              </span>
            </div>

            }
          </div>

          }
        </section>
        <!-- Tasks -->
        <section class="dashboard-card tasks-card">
          <div class="card-header">
            <div>
              <span class="card-icon">✓</span>
              <h2>Today's Tasks</h2>
            </div>

            <a routerLink="/tasks"> View all → </a>
          </div>

          @if (incompleteTasks().length === 0) {

          <div class="card-empty">
            <span>🎉</span>

            <strong> You're all caught up. </strong>

            <span> Nothing demanding your attention right now. </span>
          </div>

          } @else {

          <div class="dashboard-task-list">
            @for ( task of incompleteTasks().slice(0, 5); track task.id ) {

            <div
              class="dashboard-task"
              [class.overdue]="isTaskOverdue(task.dueDate)"
              [class.due-today]="isTaskDueToday(task.dueDate)"
            >
              <span class="task-dot"></span>

              <div class="task-details">
                <span class="task-title">
                  {{ task.title }}
                </span>

                @if (task.dueDate) {
                <span
                  class="task-due"
                  [class.overdue]="isTaskOverdue(task.dueDate)"
                  [class.today]="isTaskDueToday(task.dueDate)"
                >
                  {{ formatTaskDueDate(task.dueDate) }}
                </span>
                }
              </div>

              <span class="priority" [class]="task.priority">
                {{ task.priority }}
              </span>
            </div>

            }
          </div>

          }
        </section>

        <!-- Calendar -->
        <section class="dashboard-card calendar-card">
          <div class="card-header">
            <div>
              <span class="card-icon">□</span>
              <h2>Today's Schedule</h2>
            </div>

            <a routerLink="/calendar"> Calendar → </a>
          </div>

          @if (calendarLoading()) {

          <div class="card-empty">
            <span>📅</span>
            <strong>Loading your schedule...</strong>
          </div>

          } @else if (calendarError()) {

          <div class="card-empty">
            <span>⚠️</span>
            <strong>{{ calendarError() }}</strong>
          </div>

          } @else if (calendarEvents().length === 0) {

          <div class="card-empty">
            <span>🎉</span>
            <strong>Your calendar is clear.</strong>
            <span>Nothing scheduled for today.</span>
          </div>

          } @else {

          <div class="calendar-event-list">
            @for (event of calendarEvents(); track event.id) {

            <div class="calendar-event">
              <div class="calendar-event-time">
                {{ event.start | date : 'h:mm a' }}
              </div>

              <div class="calendar-event-details">
                <strong>
                  {{ event.title }}
                </strong>

                @if (event.location) {
                <span>
                  {{ event.location }}
                </span>
                }

                <small>
                  {{ event.calendar }}
                </small>
              </div>
            </div>

            }
          </div>

          }
        </section>

        <!-- Favorites -->
        <section class="dashboard-card favorites-card">
          <div class="card-header">
            <div>
              <span class="card-icon">★</span>
              <h2>Favorites</h2>
            </div>

            <a routerLink="/favorites"> View all → </a>
          </div>

          @if (favorites().length === 0) {

          <div class="card-empty">
            <span>⭐</span>

            <strong> No favorites yet. </strong>

            <span> Save your favorite places around the web. </span>
          </div>

          } @else {

          <div class="dashboard-favorites">
            @for ( favorite of favorites().slice(0, 6); track favorite.id ) {

            <a
              class="dashboard-favorite"
              [href]="favorite.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="favorite-icon">
                {{ favorite.icon || '🔗' }}
              </span>

              <span>
                {{ favorite.name }}
              </span>
            </a>

            }
          </div>

          }
        </section>

        <!-- Job Search -->
        <section class="dashboard-card jobs-card">
          <div class="card-header">
            <div>
              <span class="card-icon">▣</span>
              <h2>Job Search</h2>
            </div>

            <a routerLink="/jobs"> Open → </a>
          </div>

          <div class="job-stats">
            <div>
              <strong>
                {{ savedJobCount() }}
              </strong>

              <span> Saved </span>
            </div>

            <div>
              <strong>
                {{ appliedJobCount() }}
              </strong>

              <span> Applied </span>
            </div>

            <div>
              <strong>
                {{ interviewJobCount() }}
              </strong>

              <span> Interviews </span>
            </div>
          </div>

          @if (jobs().length === 0) {

          <div class="job-empty">
            <span> 💼 </span>

            <p>Your job pipeline is empty.</p>

            <a routerLink="/jobs"> Add your first opportunity → </a>
          </div>

          } @else {

          <div class="dashboard-job-list">
            @for ( job of jobs().slice(0, 3); track job.id ) {

            <div class="dashboard-job">
              <div>
                <strong>
                  {{ job.title }}
                </strong>

                <span>
                  {{ job.company }}
                </span>
              </div>

              <span class="job-status" [class]="job.status">
                {{ job.status }}
              </span>
            </div>

            }
          </div>

          }
        </section>
        <!-- Local Events -->
        <section class="dashboard-card events-card">
          <div class="card-header">
            <div>
              <span class="card-icon">🎧</span>
              <h2>Local Events</h2>
            </div>

            <a routerLink="/events"> Browse → </a>
          </div>

          @if (eventsLoading()) {

          <div class="card-empty">
            <span>🎧</span>
            <strong>Loading events...</strong>
          </div>

          } @else if (eventsError()) {

          <div class="card-empty">
            <span>⚠️</span>
            <strong>Events bridge isn't running.</strong>
            <span>Start the events-bridge server to see local shows.</span>
          </div>

          } @else if (upcomingEvents().length === 0) {

          <div class="card-empty">
            <span>🎫</span>
            <strong>No events found.</strong>
            <span>Check back soon, or browse Do214 directly.</span>
          </div>

          } @else {

          <div class="dashboard-event-list">
            @for (event of upcomingEvents(); track event.id) {

            <a
              class="dashboard-event"
              [href]="event.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div>
                <strong>
                  {{ event.name }}
                </strong>

                <span>
                  {{ event.venue }}
                </span>
              </div>

              @if (event.start) {
              <span class="event-date">
                {{ event.start | date : 'MMM d' }}
              </span>
              }
            </a>

            }
          </div>

          }
        </section>
      </div>
    </section>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly tasksService = inject(TasksService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly weatherService = inject(WeatherService);
  private readonly jobsService = inject(JobsService);
  private readonly calendarService = inject(CalendarService);

  readonly tasks = this.tasksService.tasks;
  readonly favorites = this.favoritesService.favorites;
  readonly weather = this.weatherService.weather;
  readonly weatherLoading = this.weatherService.loading;
  readonly weatherError = this.weatherService.error;
  readonly jobs = this.jobsService.jobs;

  readonly calendarEvents = this.calendarService.events;
  readonly calendarLoading = this.calendarService.loading;
  readonly calendarError = this.calendarService.error;

  readonly focusItems = computed<FocusItem[]>(() => {
    const items: FocusItem[] = [];

    // High-priority / open tasks
    const tasks = this.tasks()
      .filter((task) => !task.completed)
      .sort((a, b) => {
        const priorityOrder = {
          high: 0,
          medium: 1,
          low: 2,
        };

        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 2);

    tasks.forEach((task) => {
      items.push({
        id: `task-${task.id}`,
        title: task.title,
        description: `${task.priority} priority task`,
        type: 'task',
      });
    });

    // Upcoming calendar events
    const events = [...this.calendarEvents()]
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 2);

    events.forEach((event) => {
      items.push({
        id: `calendar-${event.id}`,
        title: event.title,
        description: `Today at ${this.formatTime(event.start)}`,
        type: 'calendar',
      });
    });

    // Jobs needing attention
    const jobs = this.jobs()
      .filter((job) => job.status === 'saved' || job.status === 'applied')
      .slice(0, 2);

    jobs.forEach((job) => {
      items.push({
        id: `job-${job.id}`,
        title:
          job.status === 'saved'
            ? `Apply to ${job.title}`
            : `Follow up: ${job.title}`,
        description: job.company,
        type: 'job',
      });
    });

    return items.slice(0, 5);
  });

  private readonly eventsService = inject(EventsService);

  readonly eventsLoading = this.eventsService.loading;
  readonly eventsError = this.eventsService.error;

  readonly upcomingEvents = () => this.eventsService.events().slice(0, 4);

  readonly incompleteTasks = () =>
    [...this.tasks()]
      .filter((task) => !task.completed)
      .sort((a, b) => {
        const aTime = this.getTaskDueTime(a.dueDate);
        const bTime = this.getTaskDueTime(b.dueDate);

        return aTime - bTime;
      });

  readonly completedTaskCount = () =>
    this.tasks().filter((task) => task.completed).length;

  getTaskDueTime(dueDate?: string): number {
    if (!dueDate) {
      return Number.MAX_SAFE_INTEGER;
    }

    return new Date(`${dueDate}T00:00:00`).getTime();
  }

  isTaskOverdue(dueDate?: string): boolean {
    if (!dueDate) {
      return false;
    }

    return this.getTaskDateStatus(dueDate) === 'overdue';
  }

  isTaskDueToday(dueDate?: string): boolean {
    if (!dueDate) {
      return false;
    }

    return this.getTaskDateStatus(dueDate) === 'today';
  }

  formatTaskDueDate(dueDate?: string): string {
    if (!dueDate) {
      return '';
    }

    if (this.isTaskDueToday(dueDate)) {
      return 'Due today';
    }

    if (this.isTaskOverdue(dueDate)) {
      return `Overdue · ${this.formatDateOnly(dueDate)}`;
    }

    return `Due ${this.formatDateOnly(dueDate)}`;
  }

  private getTaskDateStatus(dueDate: string): 'overdue' | 'today' | 'upcoming' {
    const today = new Date();

    const todayString = this.toDateString(today);

    if (dueDate < todayString) {
      return 'overdue';
    }

    if (dueDate === todayString) {
      return 'today';
    }

    return 'upcoming';
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatDateOnly(dateString: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${dateString}T00:00:00`));
  }

  readonly savedJobCount = () =>
    this.jobs().filter((job) => job.status === 'saved').length;

  readonly appliedJobCount = () =>
    this.jobs().filter((job) => job.status === 'applied').length;

  readonly interviewJobCount = () =>
    this.jobs().filter((job) => job.status === 'interview').length;

  ngOnInit(): void {
    this.weatherService.loadWeather('Dallas, Texas');
    this.calendarService.loadEvents();
    this.eventsService.loadEvents({ classificationName: 'Music' });
  }

  getWeatherIcon(code: number): string {
    if (code === 0) {
      return '☀️';
    }

    if (code <= 3) {
      return '🌤️';
    }

    if (code <= 48) {
      return '🌫️';
    }

    if (code <= 67) {
      return '🌧️';
    }

    if (code <= 77) {
      return '❄️';
    }

    if (code <= 82) {
      return '🌦️';
    }

    if (code <= 99) {
      return '⛈️';
    }

    return '🌤️';
  }

  getWeatherDescription(code: number): string {
    if (code === 0) {
      return 'Clear sky';
    }

    if (code <= 3) {
      return 'Partly cloudy';
    }

    if (code <= 48) {
      return 'Foggy';
    }

    if (code <= 67) {
      return 'Rain';
    }

    if (code <= 77) {
      return 'Snow';
    }

    if (code <= 82) {
      return 'Showers';
    }

    if (code <= 99) {
      return 'Thunderstorm';
    }

    return 'Unknown';
  }

  formatTime(dateString: string): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString));
  }
}
