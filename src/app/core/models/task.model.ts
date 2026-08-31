export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
