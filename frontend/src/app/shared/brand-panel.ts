import { Component, input } from '@angular/core';
import { Logo } from './logo';

/** Panneau rouge de gauche des pages Inscription / Connexion, avec un assortiment de plats en SVG. */
@Component({
  selector: 'app-brand-panel',
  imports: [Logo],
  template: `
    <div class="brand-panel">
      <app-logo [size]="64" />
      <h2>Food Corner</h2>
      <p class="tagline">Un coin pour chaque envie</p>
      @if (slogan()) { <p class="slogan">{{ slogan() }}</p> }

      <!-- Assortiment : boisson, burger, part de pizza et salade sur un plateau. -->
      <svg class="food" viewBox="0 0 320 210" aria-hidden="true">
        <!-- plateau -->
        <ellipse cx="160" cy="186" rx="150" ry="20" fill="#7a1012" opacity=".35" />
        <rect x="14" y="170" width="292" height="16" rx="8" fill="#fff" opacity=".92" />

        <!-- boisson -->
        <path d="M30 78 h48 l-6 92 h-36 Z" fill="#fff" />
        <path d="M33 104 h42 l-4 62 h-34 Z" fill="#f4a52a" />
        <rect x="26" y="70" width="56" height="10" rx="5" fill="#fff6d8" />
        <path d="M60 70 l10 -34 h10" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" />

        <!-- burger -->
        <path d="M92 118 a58 46 0 0 1 116 0 Z" fill="#e39a3b" />
        <g fill="#fff3c4"><ellipse cx="124" cy="96" rx="4" ry="2.4" /><ellipse cx="150" cy="86" rx="4" ry="2.4" />
          <ellipse cx="176" cy="96" rx="4" ry="2.4" /><ellipse cx="160" cy="104" rx="4" ry="2.4" /></g>
        <path d="M88 122 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 v6 h-144 Z" fill="#4caf50" />
        <rect x="90" y="128" width="120" height="10" rx="3" fill="#ffc83d" />
        <rect x="92" y="138" width="116" height="14" rx="7" fill="#6b3a1f" />
        <path d="M92 154 h116 v4 a14 14 0 0 1 -14 12 h-88 a14 14 0 0 1 -14 -12 Z" fill="#e39a3b" />

        <!-- part de pizza -->
        <path d="M214 102 Q250 84 290 102 L262 170 Z" fill="#f6d27a" />
        <path d="M214 102 Q250 84 290 102" fill="none" stroke="#d98a36" stroke-width="9" stroke-linecap="round" />
        <g fill="#c8361f"><circle cx="242" cy="114" r="6" /><circle cx="266" cy="118" r="5.5" /><circle cx="256" cy="140" r="5" /></g>
        <path d="M232 132 q4 -5 9 0 q-5 5 -9 0Z" fill="#2f7d32" />

        <!-- salade -->
        <g transform="translate(-8 0)">
          <circle cx="268" cy="160" r="9" fill="#4caf50" /><circle cx="282" cy="156" r="10" fill="#66bb6a" />
          <circle cx="296" cy="161" r="8" fill="#43a047" /><circle cx="276" cy="152" r="4" fill="#e53935" />
          <circle cx="291" cy="150" r="3.5" fill="#fdd835" />
        </g>
      </svg>
    </div>
  `,
})
export class BrandPanel {
  readonly slogan = input('');
}
