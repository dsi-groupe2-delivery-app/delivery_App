import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categorie, MenuDetail, MenuResume, Produit } from './catalogue.models';

const API = `${environment.apiUrl}/api`;

/** US10 : lecture publique de la carte et des menus composés (aucune connexion requise). */
@Injectable({ providedIn: 'root' })
export class CatalogueService {
  private readonly http = inject(HttpClient);

  categories() {
    return firstValueFrom(this.http.get<Categorie[]>(`${API}/categories`));
  }

  produits(categorieId?: string) {
    const params = categorieId ? new HttpParams().set('categorie', categorieId) : undefined;
    return firstValueFrom(this.http.get<Produit[]>(`${API}/produits`, { params }));
  }

  menus() {
    return firstValueFrom(this.http.get<MenuResume[]>(`${API}/menus-composes`));
  }

  menu(id: string) {
    return firstValueFrom(this.http.get<MenuDetail>(`${API}/menus-composes/${id}`));
  }

  /** L'API renvoie un chemin (/uploads/...) : on le complète avec l'adresse du serveur. */
  imageUrl(chemin: string): string {
    return chemin.startsWith('http') ? chemin : environment.apiUrl + chemin;
  }
}
