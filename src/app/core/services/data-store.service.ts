import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

interface StoreResponse<T> {
  key: string;
  value: T | null;
}

@Injectable({
  providedIn: 'root',
})
export class DataStoreService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = 'http://localhost:3336/api/store';

  /** Fetches the current value for a key. Resolves to null if nothing is stored yet
   *  or the data-bridge server can't be reached. */
  get<T>(key: string): Observable<T | null> {
    return this.http.get<StoreResponse<T>>(`${this.baseUrl}/${key}`).pipe(
      map((response) => response.value),
      catchError((error) => {
        console.error(`DataStoreService: failed to load '${key}'`, error);

        return of(null);
      })
    );
  }

  /** Persists a value for a key. Resolves to false (rather than throwing) if the
   *  data-bridge server can't be reached, so callers can decide how to handle it. */
  set<T>(key: string, value: T): Observable<boolean> {
    return this.http
      .put<{ ok: boolean }>(`${this.baseUrl}/${key}`, { value })
      .pipe(
        map((response) => response.ok),
        catchError((error) => {
          console.error(`DataStoreService: failed to save '${key}'`, error);

          return of(false);
        })
      );
  }
}
