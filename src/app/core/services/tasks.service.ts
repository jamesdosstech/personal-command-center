import { Injectable, inject, signal } from '@angular/core';
import { Task } from '../models/task.model';
import { DataStoreService } from './data-store.service';

const STORAGE_KEY = 'tasks';

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private readonly dataStore = inject(DataStoreService);

  private readonly tasksState = signal<Task[]>([]);

  readonly tasks = this.tasksState.asReadonly();

  readonly loading = signal(true);

  constructor() {
    this.dataStore.get<Task[]>(STORAGE_KEY).subscribe((value) => {
      this.tasksState.set(value ?? []);
      this.loading.set(false);
    });
  }

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

  private saveTasks(tasks: Task[]): void {
    this.dataStore.set(STORAGE_KEY, tasks).subscribe();
  }
}
