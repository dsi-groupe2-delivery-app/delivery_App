import { Component, computed, input } from '@angular/core';

// Icônes au trait (style "outline"), dessinées en SVG : aucune dépendance externe.
const PATHS: Record<string, string> = {
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  phone:
    'M6.6 3.5 9 3l1.5 4-2 1.3a11 11 0 0 0 5.2 5.2L15 11.5l4 1.5-.5 2.4A2 2 0 0 1 16.6 17 13.6 13.6 0 0 1 4 4.4a2 2 0 0 1 2.6-.9Z',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-off':
    'M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6M6.4 7.6A16 16 0 0 0 2.5 12S6 18 12 18a9 9 0 0 0 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  cart: 'M3 4h2.2l2.1 10.5a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20 8H6M9.5 20.5h.01M17 20.5h.01', 
};

@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" aria-hidden="true"
    fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path [attr.d]="d()" /></svg>`,
  host: { style: 'display:inline-flex' },
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input(18);
  protected readonly d = computed(() => PATHS[this.name()] ?? '');
}
