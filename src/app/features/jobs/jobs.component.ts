import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Job, JobPriority, JobStatus } from '../../core/models/job.model';
import { JobsService } from '../../core/services/jobs.service';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="jobs-page">
      <!-- Header -->
      <header class="page-header">
        <div>
          <p class="eyebrow">CAREER COMMAND CENTER</p>

          <h1>Job Search</h1>

          <p class="subtitle">Track opportunities from discovery to offer.</p>
        </div>

        <button class="primary-button" type="button" (click)="openAddJob()">
          + Add Job
        </button>
      </header>
      <!-- Job Sources -->
      <section class="job-sources">
        <div class="section-heading">
          <div>
            <p class="eyebrow">JOB SOURCES</p>
            <h2>Find your next opportunity.</h2>
          </div>
        </div>

        <div class="job-source-grid">
          <a
            href="https://www.linkedin.com/jobs/"
            target="_blank"
            rel="noopener noreferrer"
            class="job-source-card"
          >
            <span class="job-source-icon">in</span>

            <div>
              <strong>LinkedIn</strong>
              <span>Search jobs</span>
            </div>

            <span>↗</span>
          </a>

          <a
            href="https://www.indeed.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="job-source-card"
          >
            <span class="job-source-icon">I</span>

            <div>
              <strong>Indeed</strong>
              <span>Search jobs</span>
            </div>

            <span>↗</span>
          </a>

          <a
            href="https://www.dice.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="job-source-card"
          >
            <span class="job-source-icon">D</span>

            <div>
              <strong>Dice</strong>
              <span>Tech jobs</span>
            </div>

            <span>↗</span>
          </a>

          <a
            href="https://builtin.com/jobs"
            target="_blank"
            rel="noopener noreferrer"
            class="job-source-card"
          >
            <span class="job-source-icon">B</span>

            <div>
              <strong>Built In</strong>
              <span>Tech companies</span>
            </div>

            <span>↗</span>
          </a>
        </div>
      </section>
      <!-- Pipeline Stats -->
      <section class="job-pipeline">
        <button
          type="button"
          [class.active]="activeFilter() === 'all'"
          (click)="setFilter('all')"
        >
          <strong>{{ jobs().length }}</strong>
          <span>All</span>
        </button>

        <button
          type="button"
          [class.active]="activeFilter() === 'saved'"
          (click)="setFilter('saved')"
        >
          <strong>{{ getCount('saved') }}</strong>
          <span>Saved</span>
        </button>

        <button
          type="button"
          [class.active]="activeFilter() === 'applied'"
          (click)="setFilter('applied')"
        >
          <strong>{{ getCount('applied') }}</strong>
          <span>Applied</span>
        </button>

        <button
          type="button"
          [class.active]="activeFilter() === 'interview'"
          (click)="setFilter('interview')"
        >
          <strong>{{ getCount('interview') }}</strong>
          <span>Interviews</span>
        </button>

        <button
          type="button"
          [class.active]="activeFilter() === 'offer'"
          (click)="setFilter('offer')"
        >
          <strong>{{ getCount('offer') }}</strong>
          <span>Offers</span>
        </button>
      </section>

      <!-- Jobs -->
      <section class="jobs-list">
        @if (filteredJobs().length === 0) {

        <div class="jobs-empty">
          <span class="empty-icon">💼</span>

          @if (jobs().length === 0) {

          <h2>Your pipeline is empty.</h2>

          <p>Save your first opportunity and start building your pipeline.</p>

          <button type="button" class="primary-button" (click)="openAddJob()">
            + Add Your First Job
          </button>

          } @else {

          <h2>No jobs here.</h2>

          <p>There aren't any jobs matching this status.</p>

          <button
            type="button"
            class="secondary-button"
            (click)="setFilter('all')"
          >
            View All Jobs
          </button>

          }
        </div>

        } @else { @for (job of filteredJobs(); track job.id) {

        <article class="job-card">
          <div class="job-card-main">
            <div class="job-title-row">
              <div>
                <h2>{{ job.title }}</h2>

                <p class="job-company">
                  {{ job.company }}
                </p>
              </div>

              <span class="job-priority" [class]="job.priority">
                {{ job.priority }}
              </span>
            </div>

            <div class="job-meta">
              @if (job.location) {
              <span>📍 {{ job.location }}</span>
              } @if (job.salary) {
              <span>💰 {{ job.salary }}</span>
              } @if (job.source) {
              <span>🌐 {{ job.source }}</span>
              }
            </div>

            @if (job.notes) {

            <p class="job-notes">
              {{ job.notes }}
            </p>

            }

            <div class="job-card-footer">
              <span> Added {{ formatDate(job.createdAt) }} </span>

              @if (job.appliedAt) {
              <span> Applied {{ formatDate(job.appliedAt) }} </span>
              }
            </div>
          </div>

          <div class="job-card-actions">
            <select
              [value]="job.status"
              (change)="changeStatus(job.id, $any($event.target).value)"
            >
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>

            @if (job.url) {

            <a
              [href]="normalizeUrl(job.url)"
              target="_blank"
              rel="noopener noreferrer"
              class="secondary-button"
            >
              Open Job ↗
            </a>

            }
            <button
              type="button"
              class="secondary-button"
              (click)="openEditJob(job)"
            >
              Edit
            </button>

            <button
              type="button"
              class="danger-button"
              (click)="deleteJob(job.id)"
            >
              Delete
            </button>
          </div>
        </article>

        } }
      </section>
    </section>

    <!-- Add Job Modal -->
    @if (showAddJob()) {

    <div class="modal-backdrop" (click)="closeAddJob()">
      <section class="job-modal" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div>
            <p class="eyebrow">
              {{ editingJobId() ? 'EDIT OPPORTUNITY' : 'NEW OPPORTUNITY' }}
            </p>

            <h2>
              {{ editingJobId() ? 'Edit Job' : 'Add Job' }}
            </h2>
          </div>

          <button type="button" class="modal-close" (click)="closeAddJob()">
            ×
          </button>
        </header>

        <form (ngSubmit)="addJob()">
          <label>
            Job Title

            <input
              type="text"
              name="title"
              [(ngModel)]="newJob.title"
              placeholder="Senior Frontend Engineer"
              required
            />
          </label>

          <label>
            Company

            <input
              type="text"
              name="company"
              [(ngModel)]="newJob.company"
              placeholder="Company name"
              required
            />
          </label>

          <div class="form-row">
            <label>
              Location

              <input
                type="text"
                name="location"
                [(ngModel)]="newJob.location"
                placeholder="Remote"
              />
            </label>

            <label>
              Salary

              <input
                type="text"
                name="salary"
                [(ngModel)]="newJob.salary"
                placeholder="$140k - $170k"
              />
            </label>
          </div>

          <div class="form-row">
            <label>
              Source

              <input
                type="text"
                name="source"
                [(ngModel)]="newJob.source"
                placeholder="LinkedIn"
              />
            </label>

            <label>
              Priority

              <select name="priority" [(ngModel)]="newJob.priority">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <label>
            Job URL

            <input
              type="url"
              name="url"
              [(ngModel)]="newJob.url"
              placeholder="https://..."
            />
          </label>

          <label>
            Notes

            <textarea
              name="notes"
              [(ngModel)]="newJob.notes"
              rows="4"
              placeholder="Why does this opportunity look interesting?"
            ></textarea>
          </label>

          <div class="modal-actions">
            <button
              type="button"
              class="secondary-button"
              (click)="closeAddJob()"
            >
              Cancel
            </button>

            <button type="submit" class="primary-button">
              {{ editingJobId() ? 'Save Changes' : 'Save Job' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    }
  `,
  styleUrl: './jobs.component.scss',
})
export class JobsComponent {
  private readonly jobsService = inject(JobsService);

  readonly jobs = this.jobsService.jobs;

  readonly activeFilter = signal<JobStatus | 'all'>('all');

  readonly showAddJob = signal(false);
  readonly editingJobId = signal<string | null>(null);

  newJob: {
    title: string;
    company: string;
    location: string;
    url: string;
    salary: string;
    source: string;
    priority: JobPriority;
    notes: string;
  } = {
    title: '',
    company: '',
    location: '',
    url: '',
    salary: '',
    source: '',
    priority: 'medium',
    notes: '',
  };

  filteredJobs(): Job[] {
    const filter = this.activeFilter();

    const jobs =
      filter === 'all'
        ? this.jobs()
        : this.jobs().filter((job) => job.status === filter);

    return [...jobs].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getCount(status: JobStatus): number {
    return this.jobs().filter((job) => job.status === status).length;
  }

  setFilter(filter: JobStatus | 'all'): void {
    this.activeFilter.set(filter);
  }

  openAddJob(): void {
    this.editingJobId.set(null);
    this.resetForm();
    this.showAddJob.set(true);
  }

  closeAddJob(): void {
    this.showAddJob.set(false);
    this.editingJobId.set(null);
    this.resetForm();
  }

  addJob(): void {
    if (!this.newJob.title.trim() || !this.newJob.company.trim()) {
      return;
    }

    const updates: Partial<Job> = {
      title: this.newJob.title.trim(),
      company: this.newJob.company.trim(),
      location: this.newJob.location.trim() || undefined,
      url: this.normalizeUrl(this.newJob.url.trim()) || undefined,
      salary: this.newJob.salary.trim() || undefined,
      source: this.newJob.source.trim() || undefined,
      priority: this.newJob.priority,
      notes: this.newJob.notes.trim() || undefined,
    };

    const editingId = this.editingJobId();

    if (editingId) {
      this.jobsService.updateJob(editingId, updates);
    } else {
      this.jobsService.addJob(
        this.newJob.title,
        this.newJob.company,
        this.newJob.priority
      );

      const createdJob = this.jobs().at(-1);

      if (createdJob) {
        this.jobsService.updateJob(createdJob.id, {
          location: updates.location,
          url: updates.url,
          salary: updates.salary,
          source: updates.source,
          notes: updates.notes,
        });
      }
    }

    this.closeAddJob();
  }

  changeStatus(id: string, status: JobStatus): void {
    this.jobsService.updateJobStatus(id, status);
  }

  deleteJob(id: string): void {
    const confirmed = window.confirm('Delete this job opportunity?');

    if (!confirmed) {
      return;
    }

    this.jobsService.removeJob(id);
  }

  formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  }

  private resetForm(): void {
    this.newJob = {
      title: '',
      company: '',
      location: '',
      url: '',
      salary: '',
      source: '',
      priority: 'medium',
      notes: '',
    };
  }

  normalizeUrl(url: string): string {
    if (!url) {
      return '';
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    return `https://${url}`;
  }

  openEditJob(job: Job): void {
    this.editingJobId.set(job.id);

    this.newJob = {
      title: job.title,
      company: job.company,
      location: job.location ?? '',
      url: job.url ?? '',
      salary: job.salary ?? '',
      source: job.source ?? '',
      priority: job.priority,
      notes: job.notes ?? '',
    };

    this.showAddJob.set(true);
  }
}
