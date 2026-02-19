import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SalesApiService {
  private base = 'https://localhost:7021/api/sales'; // ajusta

  constructor(private http: HttpClient) {}

  register(payload: any) {
    return this.http.post(`${this.base}/register`, payload);
  }

  list() {
    return this.http.get(`${this.base}/list`);
  }
}