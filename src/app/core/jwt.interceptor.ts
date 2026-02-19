import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private auth: AuthTokenService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = localStorage.getItem('access_token');
    console.log('INTERCEPT:', req.url, 'token?', !!token);
  
    if (!token) return next.handle(req);
  
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  
    return next.handle(authReq);
  }
}