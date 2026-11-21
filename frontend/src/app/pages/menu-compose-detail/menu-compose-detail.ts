import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { messageErreur } from '../../core/erreurs';
import { MenuDetail } from '../../core/catalogue.models';
import { CatalogueService } from '../../core/catalogue.service';
import { MenuChoix } from '../../shared/menu-choix';
import { Tnd } from '../../shared/tnd';

/** US10 : détail d'un menu composé (groupes, règles min/max, suppléments), en lecture seule. */
@Component({
  selector: 'app-menu-compose-detail',
  imports: [RouterLink, MenuChoix, Tnd],
  templateUrl: './menu-compose-detail.html',
  styleUrl: '../../shared/catalogue.css',
})
export class MenuComposeDetail implements OnInit {
  protected readonly catalogue = inject(CatalogueService);
  private readonly route = inject(ActivatedRoute);

  protected readonly menu = signal<MenuDetail | null>(null);
  protected readonly chargement = signal(true);
  protected readonly introuvable = signal(false);
  protected readonly erreur = signal('');

  ngOnInit() {
    void this.charger();
  }

  protected async charger() {
    this.chargement.set(true);
    this.erreur.set('');
    this.introuvable.set(false);
    try {
      this.menu.set(await this.catalogue.menu(this.route.snapshot.paramMap.get('id') ?? ''));
    } catch (err) {
      if ((err as HttpErrorResponse).status === 404) this.introuvable.set(true);
      else this.erreur.set(messageErreur(err));
    } finally {
      this.chargement.set(false);
    }
  }
}
