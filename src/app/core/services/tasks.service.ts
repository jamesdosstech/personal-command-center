import { Injectable, signal } from '@angular/core';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private readonly storageKey = 'personal-command-center-tasks';

  private readonly tasksState = signal<Task[]>(this.loadTasks());

  readonly tasks = this.tasksState.asReadonly();

  addTask(
    title: string,
    priority: Task['priority'] = 'medium',
    dueDate?: string
  ): void {
    const task: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      completed: false,
      priority,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [...this.tasksState(), task];

    this.tasksState.set(updated);
    this.saveTasks(updated);
  }

  toggleTask(id: string): void {
    const updated = this.tasksState().map((task) =>
      task.id === id
        ? {
            ...task,
            completed: !task.completed,
          }
        : task
    );

    this.tasksState.set(updated);
    this.saveTasks(updated);
  }

  removeTask(id: string): void {
    const updated = this.tasksState().filter((task) => task.id !== id);

    this.tasksState.set(updated);
    this.saveTasks(updated);
  }

  private loadTasks(): Task[] {
    const stored = localStorage.getItem(this.storageKey);

    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored) as Task[];
    } catch {
      return [];
    }
  }

  private saveTasks(tasks: Task[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(tasks));
  }
}
