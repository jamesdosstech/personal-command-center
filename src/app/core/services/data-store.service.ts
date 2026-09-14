import { Injectable } from '@angular/core';
import { Observable, defer, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class DataStoreService {
  private readonly auth = getAuth();
  private readonly firestore = getFirestore();

  get<T>(key: string): Observable<T | null> {
    return defer(() => {
      const user = this.auth.currentUser;

      if (!user) {
        return throwError(
          () => new Error('User must be authenticated to access data.')
        );
      }

      const reference = doc(this.firestore, 'users', user.uid, 'appData', key);

      return from(getDoc(reference));
    }).pipe(
      map((snapshot) => {
        if (!snapshot.exists()) {
          return null;
        }

        return (snapshot.data()['value'] ?? null) as T | null;
      }),
      catchError((error) => {
        console.error(`Failed to load "${key}" from Firestore:`, error);
        return throwError(() => error);
      })
    );
  }

  set<T>(key: string, value: T): Observable<void> {
    return defer(() => {
      const user = this.auth.currentUser;

      if (!user) {
        return throwError(
          () => new Error('User must be authenticated to save data.')
        );
      }

      const reference = doc(this.firestore, 'users', user.uid, 'appData', key);

      return from(
        setDoc(reference, {
          value,
        })
      ).pipe(
        map(() => {
          console.log('Firestore write successful:', reference.path);
        })
      );
    }).pipe(
      catchError((error) => {
        console.error(`Failed to save "${key}" to Firestore:`, error);
        return throwError(() => error);
      })
    );
  }
}
