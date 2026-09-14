import { Injectable, signal } from '@angular/core';
import {
  Auth,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { getAuth } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth: Auth = getAuth();

  readonly user = signal<User | null>(this.auth.currentUser);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      this.loading.set(false);
    });
  }

  async signIn(email: string, password: string): Promise<boolean> {
    this.error.set(null);
    this.loading.set(true);

    try {
      const credential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      this.user.set(credential.user);
      return true;
    } catch (error) {
      console.error('Firebase sign-in failed:', error);

      this.error.set(this.getFriendlyError(error));
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async signOut(): Promise<void> {
    this.error.set(null);

    try {
      await signOut(this.auth);
      this.user.set(null);
    } catch (error) {
      console.error('Firebase sign-out failed:', error);
      this.error.set('Unable to sign out. Please try again.');
    }
  }

  private getFriendlyError(error: unknown): string {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';

    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password.';

      case 'auth/too-many-requests':
        return 'Too many unsuccessful attempts. Please try again later.';

      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';

      default:
        return 'Unable to sign in. Please try again.';
    }
  }
}
