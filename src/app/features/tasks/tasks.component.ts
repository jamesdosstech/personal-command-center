import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TasksService } from '../../core/services/tasks.service';
import { TaskPriority } from '../../core/models/task.model';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="tasks-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">GET THINGS DONE</p>

          <h1>Tasks</h1>

          <p class="subtitle">Keep the important stuff moving.</p>
        </div>
      </header>

      <section class="task-input-card">
        <form (ngSubmit)="addTask()">
          <input
            type="text"
            name="taskTitle"
            [(ngModel)]="newTaskTitle"
            placeholder="What needs to get done?"
            autocomplete="off"
          />
          <input type="date" name="dueDate" [(ngModel)]="newTaskDueDate" />
          <select name="priority" [(ngModel)]="newTaskPriority">
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>

          <button type="submit">Add Task</button>
        </form>
      </section>

      @if (tasks().length === 0) {

      <div class="empty-state">
        <span>✓</span>

        <h2>You're all caught up.</h2>

        <p>Add a task above when something needs your attention.</p>
      </div>

      } @else {

      <section class="task-list">
        @for (task of tasks(); track task.id) {

        <article class="task" [class.completed]="task.completed">
          <button
            class="checkbox"
            type="button"
            [attr.aria-label]="
              task.completed ? 'Mark task incomplete' : 'Mark task complete'
            "
            (click)="toggleTask(task.id)"
          >
            @if (task.completed) { ✓ }
          </button>

          <div class="task-content">
            <span class="task-title">
              {{ task.title }}
            </span>

            <div class="task-meta">
              <span class="priority" [class]="task.priority">
                {{ task.priority }}
              </span>

              @if (task.dueDate) {
              <span class="due-date">
                Due {{ formatDueDate(task.dueDate) }}
              </span>
              }
            </div>
          </div>

          <button
            class="delete-button"
            type="button"
            (click)="removeTask(task.id)"
            aria-label="Delete task"
          >
            ×
          </button>
        </article>

        }
      </section>

      }
    </section>
  `,
  styleUrl: './tasks.component.scss',
})
export class TasksComponent {
  private readonly tasksService = inject(TasksService);

  readonly tasks = this.tasksService.tasks;

  newTaskTitle = '';

  newTaskPriority: TaskPriority = 'medium';
  newTaskDueDate = '';

  addTask(): void {
    if (!this.newTaskTitle.trim()) {
      return;
    }

    this.tasksService.addTask(
      this.newTaskTitle,
      this.newTaskPriority,
      this.newTaskDueDate
    );

    this.newTaskTitle = '';
    this.newTaskPriority = 'medium';
    this.newTaskDueDate = '';
  }

  toggleTask(id: string): void {
    this.tasksService.toggleTask(id);
  }

  removeTask(id: string): void {
    this.tasksService.removeTask(id);
  }

  formatDueDate(dateString: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${dateString}T00:00:00`));
  }
}
