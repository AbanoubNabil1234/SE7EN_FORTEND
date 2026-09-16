import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MagazineRepository } from '../../domain/repositories/magazine.repository';
import { Magazine, MagazineUpsert, MobileMagazine } from '../../domain/models/magazine.model';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { resolveApiUrl } from '../http/api-origin';

@Injectable({ providedIn: 'root' })
export class HttpMagazineRepository extends MagazineRepository {
  private readonly http = inject(HttpClient);

  listAdmin(params?: {
    query?: string;
    status?: 'all' | 'active' | 'inactive';
    pharmacy?: string;
  }): Observable<Magazine[]> {
    let httpParams = new HttpParams();
    if (params?.query?.trim()) httpParams = httpParams.set('q', params.query.trim());
    if (params?.status && params.status !== 'all') httpParams = httpParams.set('status', params.status);
    if (params?.pharmacy && params.pharmacy !== 'all') httpParams = httpParams.set('pharmacy', params.pharmacy);
    return this.http
      .get<unknown[]>(API_ENDPOINTS.MAGAZINES, { params: httpParams })
      .pipe(map((rows) => (Array.isArray(rows) ? rows.map((r) => this.normalize(r)) : [])));
  }

  create(payload: MagazineUpsert): Observable<Magazine> {
    return this.http.post<unknown>(API_ENDPOINTS.MAGAZINES, payload).pipe(map((raw) => this.normalize(raw)));
  }

  update(id: string, payload: MagazineUpsert): Observable<Magazine> {
    return this.http.put<unknown>(API_ENDPOINTS.MAGAZINE(id), payload).pipe(map((raw) => this.normalize(raw)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.MAGAZINE(id));
  }

  uploadCover(file: File): Observable<{ url: string }> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<{ url?: string; Url?: string }>(API_ENDPOINTS.MAGAZINE_COVER, body).pipe(
      map((raw) => {
        const url = String(raw?.url ?? raw?.Url ?? '').trim();
        if (!url) {
          throw new Error('Cover upload did not return a URL.');
        }
        return { url };
      })
    );
  }

  uploadPdf(file: File): Observable<{ url: string }> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<{ url?: string; Url?: string }>(API_ENDPOINTS.MAGAZINE_PDF, body).pipe(
      map((raw) => {
        const url = String(raw?.url ?? raw?.Url ?? '').trim();
        if (!url) {
          throw new Error('PDF upload did not return a URL.');
        }
        return { url };
      })
    );
  }

  listMobileActive(): Observable<MobileMagazine[]> {
    return this.http.get<unknown[]>(API_ENDPOINTS.MAGAZINES_MOBILE_ACTIVE).pipe(
      map((rows) =>
        Array.isArray(rows)
          ? rows.map((raw) => {
              const r = (raw ?? {}) as Record<string, unknown>;
              return {
                id: String(r['id'] ?? r['Id'] ?? ''),
                titleEn: String(r['titleEn'] ?? r['TitleEn'] ?? ''),
                titleAr: String(r['titleAr'] ?? r['TitleAr'] ?? ''),
                descriptionEn: String(r['descriptionEn'] ?? r['DescriptionEn'] ?? ''),
                descriptionAr: String(r['descriptionAr'] ?? r['DescriptionAr'] ?? ''),
                pharmacyCode: String(r['pharmacyCode'] ?? r['PharmacyCode'] ?? ''),
                validFrom: String(r['validFrom'] ?? r['ValidFrom'] ?? ''),
                validUntil: String(r['validUntil'] ?? r['ValidUntil'] ?? ''),
                coverImageUrl: resolveApiUrl((r['coverImageUrl'] ?? r['CoverImageUrl'] ?? null) as string | null),
                pdfUrl: resolveApiUrl((r['pdfUrl'] ?? r['PdfUrl'] ?? null) as string | null),
                displayOrder: Number(r['displayOrder'] ?? r['DisplayOrder'] ?? 0)
              };
            })
          : []
      )
    );
  }

  private normalize(raw: unknown): Magazine {
    const r = (raw ?? {}) as Record<string, unknown>;
    const status = String(r['status'] ?? r['Status'] ?? 'inactive').toLowerCase();
    return {
      id: String(r['id'] ?? r['Id'] ?? ''),
      titleEn: String(r['titleEn'] ?? r['TitleEn'] ?? ''),
      titleAr: String(r['titleAr'] ?? r['TitleAr'] ?? ''),
      descriptionEn: String(r['descriptionEn'] ?? r['DescriptionEn'] ?? ''),
      descriptionAr: String(r['descriptionAr'] ?? r['DescriptionAr'] ?? ''),
      pharmacyCode: String(r['pharmacyCode'] ?? r['PharmacyCode'] ?? ''),
      validFrom: String(r['validFrom'] ?? r['ValidFrom'] ?? ''),
      validUntil: String(r['validUntil'] ?? r['ValidUntil'] ?? ''),
      status: status === 'active' ? 'active' : 'inactive',
      isActive: Boolean(r['isActive'] ?? r['IsActive'] ?? false),
      isExpired: Boolean(r['isExpired'] ?? r['IsExpired'] ?? false),
      coverImageUrl: resolveApiUrl((r['coverImageUrl'] ?? r['CoverImageUrl'] ?? null) as string | null),
      pdfUrl: resolveApiUrl((r['pdfUrl'] ?? r['PdfUrl'] ?? null) as string | null),
      displayOrder: Number(r['displayOrder'] ?? r['DisplayOrder'] ?? 0)
    };
  }
}
