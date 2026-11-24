import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Adresse, NouvelleAdresse } from './adresse.models';

const API = `${environment.apiUrl}/api/adresses`;

/** US13 : appels à l'API des adresses du client connecté. */
@Injectable({ providedIn: 'root' })
export class AdresseService {
  private readonly http = inject(HttpClient);

  /** Adresses enregistrées dans le profil du client. */
  lister(): Promise<Adresse[]> {
    return firstValueFrom(this.http.get<Adresse[]>(API));
  }

  /** Crée une adresse (enregistrée dans le profil si la case est cochée). */
  creer(adresse: NouvelleAdresse): Promise<Adresse> {
    return firstValueFrom(this.http.post<Adresse>(API, adresse));
  }
}