import { Component, input } from '@angular/core';

/** Logo Food Corner : une cloche de service (tous types de plats, pas seulement la pizza). */
@Component({
  selector: 'app-logo',
  template: `<svg viewBox="0 0 64 64" [attr.width]="size()" [attr.height]="size()" aria-hidden="true">
    <circle cx="32" cy="32" r="31" fill="#d7262b" />
    <circle cx="32" cy="15.5" r="3.2" fill="#ffd36b" />
    <path d="M13 41 a19 19 0 0 1 38 0 Z" fill="#ffd36b" />
    <path d="M20 35 a12.5 12.5 0 0 1 9 -9.5" fill="none" stroke="#fff6d8" stroke-width="2.6" stroke-linecap="round" />
    <rect x="9" y="42" width="46" height="4.5" rx="2.25" fill="#fff" />
  </svg>`,
  host: { style: 'display:inline-flex' },
})
export class Logo {
  readonly size = input(32);
}
