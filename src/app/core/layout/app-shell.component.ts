import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <!-- Mobile overlay -->
      @if (sidebarOpen) {
      <button
        class="sidebar-overlay"
        type="button"
        aria-label="Close navigation"
        (click)="closeSidebar()"
      ></button>
      }

      <!-- Sidebar -->
      <aside class="sidebar" [class.sidebar-open]="sidebarOpen">
        <div class="sidebar-header">
          <a class="brand" routerLink="/dashboard" (click)="closeSidebar()">
            <span class="brand-mark">⌘</span>

            <div>
              <strong>Command</strong>
              <span>Center</span>
            </div>
          </a>

          <button
            class="mobile-close"
            type="button"
            aria-label="Close navigation"
            (click)="closeSidebar()"
          >
            ×
          </button>
        </div>

        <nav class="navigation">
          <p class="nav-section-label">WORKSPACE</p>

          <a
            routerLink="/dashboard"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            (click)="closeSidebar()"
          >
            <span>⌂</span>
            Dashboard
          </a>

          <a
            routerLink="/tasks"
            routerLinkActive="active"
            (click)="closeSidebar()"
          >
            <span>✓</span>
            Tasks
          </a>

          <a
            routerLink="/jobs"
            routerLinkActive="active"
            (click)="closeSidebar()"
          >
            <span>▣</span>
            Job Search
          </a>

          <a
            routerLink="/calendar"
            routerLinkActive="active"
            (click)="closeSidebar()"
          >
            <span>□</span>
            Calendar
          </a>

          <p class="nav-section-label">PERSONAL</p>

          <a
            routerLink="/favorites"
            routerLinkActive="active"
            (click)="closeSidebar()"
          >
            <span>★</span>
            Favorites
          </a>

          <a
            routerLink="/notes"
            routerLinkActive="active"
            (click)="closeSidebar()"
          >
            <span>✎</span>
            Notes
          </a>
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/settings">
            <span>⚙</span>
            Settings
          </a>
        </div>
      </aside>

      <!-- Main area -->
      <div class="main-area">
        <header class="topbar">
          <button
            class="menu-button"
            type="button"
            aria-label="Open navigation"
            (click)="toggleSidebar()"
          >
            ☰
          </button>

          <div class="topbar-spacer"></div>

          <div class="topbar-actions">
            <button type="button" class="icon-button" aria-label="Search">
              ⌕
            </button>

            <button type="button" class="avatar" aria-label="Open profile">
              JD
            </button>
          </div>
        </header>

        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  sidebarOpen = false;

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
