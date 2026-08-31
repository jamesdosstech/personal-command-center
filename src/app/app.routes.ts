import { Routes } from '@angular/router';
import { AppShellComponent } from './core/layout/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./features/favorites/favorites.component').then(
            (m) => m.FavoritesComponent
          ),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/tasks.component').then(
            (m) => m.TasksComponent
          ),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./features/jobs/jobs.component').then((m) => m.JobsComponent),
      },

      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/calendar.component').then(
            (m) => m.CalendarComponent
          ),
      },

      {
        path: 'notes',
        loadComponent: () =>
          import('./shared/components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
      },

      {
        path: 'settings',
        loadComponent: () =>
          import('./shared/components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
      },
    ],
  },
];
