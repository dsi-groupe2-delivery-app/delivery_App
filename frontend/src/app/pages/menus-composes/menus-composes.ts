import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageErreur } from '../../core/erreurs';
import { MenuResume } from '../../core/catalogue.models';
import { CatalogueService } from '../../core/catalogue.service';
import { Tnd } from '../../shared/tnd';

/** US10 : liste des menus composés (nom, image, « à partir de X TND »). */
@Component({
  selector: 'app-menus-composes',
  imports: [RouterLink, Tnd],
  templateUrl: './menus-composes.html',
  styleUrl: '../../shared/catalogue.css',
})
export class MenusComposes implements OnInit {
  protected readonly catalogue = inject(CatalogueService);

  protected readonly menus = signal<MenuResume[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal('');

  ngOnInit() {
    void this.charger();
  }

  protected async charger() {
    this.chargement.set(true);
    this.erreur.set('');
    try {
      this.menus.set(await this.catalogue.menus());
    } catch (err) {
      this.erreur.set(messageErreur(err));
    } finally {
      this.chargement.set(false);
    }
  }
}
