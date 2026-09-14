import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = getAuth();

  return new Observable<boolean>((subscriber) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        subscriber.next(true);
      } else {
        subscriber.next(false);
        router.navigate(['/login']);
      }

      subscriber.complete();
      unsubscribe();
    });
  });
};
