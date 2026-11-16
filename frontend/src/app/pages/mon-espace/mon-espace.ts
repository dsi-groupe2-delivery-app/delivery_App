import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { Logo } from '../../shared/logo';

/** US02 — Espace client (réservé au client connecté). */
@Component({
  selector: 'app-mon-espace',
  imports: [Logo],
  templateUrl: './mon-espace.html',
})
export class MonEspace {
  readonly auth = inject(AuthService);
}
