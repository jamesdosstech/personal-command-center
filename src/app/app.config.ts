import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { initializeApp } from 'firebase/app';

import { routes } from './app.routes';
import { firebaseConfig } from './core/config/firebase.config';

// Initialize Firebase once when the Angular application starts.
initializeApp(firebaseConfig);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
  ],
};
