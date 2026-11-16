import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { RegisterPayload, User } from './models';

const API = `${environment.apiUrl}/api/auth`;

/**
 * État de connexion partagé par toute l'application.
 * Les autres stories lisent `auth.user()` / `auth.isLoggedIn()` et protègent
 * leurs routes avec `authGuard` et `roleGuard(...)` (voir auth.guards.ts).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  /** Appelé au démarrage : retrouve la session existante (cookie) via GET /me. */
  async loadSession(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ user: User }>(`${API}/me`));
      this._user.set(res.user);
    } catch {
      this._user.set(null);
    }
  }

  register(payload: RegisterPayload) {
    return firstValueFrom(
      this.http.post<{ message: string; user: User }>(`${API}/register`, payload)
    );
  }

  /** Renvoie la page d'arrivée choisie par le serveur selon le rôle du compte. */
  async login(email: string, password: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ user: User; redirect: string }>(`${API}/login`, { email, password })
    );
    this._user.set(res.user);
    return res.redirect;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${API}/logout`, {}));
    } finally {
      this._user.set(null);
    }
  }
}
