import { Component, OnInit } from '@angular/core';
import { AuthTokenService } from './core/auth-token.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(private auth: AuthTokenService) {}

  ngOnInit(): void {
    if (!this.auth.token) {
      this.auth.fetchToken().subscribe();
    }
  }
}
