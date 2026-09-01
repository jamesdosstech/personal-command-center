import { Injectable, inject, signal } from '@angular/core';
import { Job, JobPriority, JobStatus } from '../models/job.model';
import { DataStoreService } from './data-store.service';

const STORAGE_KEY = 'jobs';

@Injectable({
  providedIn: 'root',
})
export class JobsService {
  private readonly dataStore = inject(DataStoreService);

  private readonly jobsState = signal<Job[]>([]);

  readonly jobs = this.jobsState.asReadonly();

  readonly loading = signal(true);

  constructor() {
    this.dataStore.get<Job[]>(STORAGE_KEY).subscribe((value) => {
      this.jobsState.set(value ?? []);
      this.loading.set(false);
    });
  }

  addJob(
    title: string,
    company: string,
    priority: JobPriority = 'medium'
  ): void {
    const job: Job = {
      id: crypto.randomUUID(),

      title: title.trim(),

      company: company.trim(),

      priority,

      status: 'saved',

      createdAt: new Date().toISOString(),
    };

    const updated = [...this.jobsState(), job];

    this.jobsState.set(updated);

    this.saveJobs(updated);
  }

  updateJobStatus(id: string, status: JobStatus): void {
    const updated = this.jobsState().map((job) => {
      if (job.id !== id) {
        return job;
      }

      return {
        ...job,

        status,

        updatedAt: new Date().toISOString(),

        ...(status === 'applied'
          ? {
              appliedAt: job.appliedAt ?? new Date().toISOString(),
            }
          : {}),
      };
    });

    this.jobsState.set(updated);

    this.saveJobs(updated);
  }

  updateJob(id: string, updates: Partial<Job>): void {
    const updated = this.jobsState().map((job) =>
      job.id === id
        ? {
            ...job,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : job
    );

    this.jobsState.set(updated);

    this.saveJobs(updated);
  }

  removeJob(id: string): void {
    const updated = this.jobsState().filter((job) => job.id !== id);

    this.jobsState.set(updated);

    this.saveJobs(updated);
  }

  getJobsByStatus(status: JobStatus): Job[] {
    return this.jobsState().filter((job) => job.status === status);
  }

  private saveJobs(jobs: Job[]): void {
    this.dataStore.set(STORAGE_KEY, jobs).subscribe();
  }
}
