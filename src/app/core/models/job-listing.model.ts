export interface JobListing {
  id: string;

  title: string;

  company?: string;

  location?: string;

  url?: string;

  salaryMin?: number;

  salaryMax?: number;

  salaryIsPredicted?: boolean;

  category?: string;

  description?: string;

  created?: string;
}
