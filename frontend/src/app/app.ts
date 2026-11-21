import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { Icon } from './shared/icon';
import { Logo } from './shared/logo';
import { CartService } from './core/cart.service';
import { Tnd } from './shared/tnd';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo, Icon,Tnd],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  private readonly router = inject(Router);

  async logout() {
    await this.auth.logout();
    await this.router.navigate(['/connexion']);
  }
}
