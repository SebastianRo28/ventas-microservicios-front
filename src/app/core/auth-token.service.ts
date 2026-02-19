import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private readonly storageKey = 'access_token';

  // CAMBIA ESTA URL a tu Auth.Api real
  private readonly authUrl = 'https://localhost:7124/api/Auth/token';

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return localStorage.getItem(this.storageKey);
  }

  set token(value: string | null) {
    if (!value) localStorage.removeItem(this.storageKey);
    else localStorage.setItem(this.storageKey, value);
  }

  fetchToken(): Observable<string> {
    return this.http.post<any>(this.authUrl, {}).pipe(
      map(r => r.access_token as string),
      tap(t => this.token = t)
    );
  }
}