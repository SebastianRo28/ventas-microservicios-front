import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PurchasesApiService {
  private base = 'https://localhost:7180/api/Purchases'; // ajusta

  constructor(private http: HttpClient) {}

  register(payload: any) {
    return this.http.post(`${this.base}/register`, payload);
  }

  list() {
    return this.http.get(`${this.base}/list`);
  }
}