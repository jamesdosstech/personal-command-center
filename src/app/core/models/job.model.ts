export interface Job {
  id: string;

  title: string;

  company: string;

  location?: string;

  url?: string;

  salary?: string;

  source?: string;

  priority: JobPriority;

  status: JobStatus;

  notes?: string;

  createdAt: string;

  updatedAt?: string;

  appliedAt?: string;
}

export type JobPriority = 'low' | 'medium' | 'high';

export type JobStatus =
  | 'saved'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'archived';
