import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal('');

  readonly loading = this.authService.loading;
  readonly error = this.authService.error;

  async submit(): Promise<void> {
    const email = this.email().trim();
    const password = this.password();

    if (!email || !password) {
      return;
    }

    const success = await this.authService.signIn(email, password);

    if (success) {
      await this.router.navigate(['/dashboard']);
    }
  }
}
