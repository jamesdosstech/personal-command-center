import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { JobListing } from '../models/job-listing.model';

interface JobSearchResponse {
  jobs: JobListing[];
  total: number;
  cached: boolean;
}

export interface JobSearchQuery {
  what?: string;
  where?: string;
  salaryMin?: number;
}

@Injectable({
  providedIn: 'root',
})
export class JobSearchService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:3335/api/jobs';

  readonly listings = signal<JobListing[]>([]);

  readonly total = signal(0);

  readonly loading = signal(false);

  readonly error = signal('');

  search(query: JobSearchQuery = {}): void {
    this.loading.set(true);
    this.error.set('');

    let params = new HttpParams();

    if (query.what) {
      params = params.set('what', query.what);
    }

    if (query.where) {
      params = params.set('where', query.where);
    }

    if (query.salaryMin) {
      params = params.set('salaryMin', query.salaryMin);
    }

    this.http.get<JobSearchResponse>(this.apiUrl, { params }).subscribe({
      next: (response) => {
        this.listings.set(response.jobs);
        this.total.set(response.total);
        this.loading.set(false);
      },

      error: (error) => {
        console.error('JobSearchService error:', error);

        this.error.set(
          'Unable to load job listings. Is the jobs-bridge server running?'
        );

        this.loading.set(false);
      },
    });
  }
}
