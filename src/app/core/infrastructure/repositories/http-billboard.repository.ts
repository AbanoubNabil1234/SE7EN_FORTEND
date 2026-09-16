import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BillboardRepository } from '../../domain/repositories/billboard.repository';
import { Billboard, BillboardUpsert, MobileBillboard } from '../../domain/models/billboard.model';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { resolveApiUrl } from '../http/api-origin';

@Injectable({ providedIn: 'root' })
export class HttpBillboardRepository extends BillboardRepository {
  private readonly http = inject(HttpClient);

  listAdmin(params?: { query?: string; status?: 'all' | 'active' | 'inactive' }): Observable<Billboard[]> {
    let httpParams = new HttpParams();
    if (params?.query?.trim()) {
      httpParams = httpParams.set('q', params.query.trim());
    }
    if (params?.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http
      .get<unknown[]>(API_ENDPOINTS.BILLBOARDS, { params: httpParams })
      .pipe(map((rows) => (Array.isArray(rows) ? rows.map((r) => this.normalizeBillboard(r)) : [])));
  }

  uploadImage(file: File): Observable<string> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<{ url?: string; Url?: string }>(API_ENDPOINTS.BILLBOARD_IMAGE, body).pipe(
      map((raw) => {
        const url = String(raw?.url ?? raw?.Url ?? '').trim();
        if (!url) {
          throw new Error('Image upload did not return a URL.');
        }
        return url;
      })
    );
  }

  create(payload: BillboardUpsert): Observable<Billboard> {
    return this.http
      .post<unknown>(API_ENDPOINTS.BILLBOARDS, payload)
      .pipe(map((raw) => this.normalizeBillboard(raw)));
  }

  update(id: string, payload: BillboardUpsert): Observable<Billboard> {
    return this.http
      .put<unknown>(API_ENDPOINTS.BILLBOARD(id), payload)
      .pipe(map((raw) => this.normalizeBillboard(raw)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.BILLBOARD(id));
  }

  listMobileActive(): Observable<MobileBillboard[]> {
    return this.http
      .get<unknown[]>(API_ENDPOINTS.BILLBOARDS_MOBILE_ACTIVE)
      .pipe(map((rows) => (Array.isArray(rows) ? rows.map((r) => this.normalizeMobile(r)) : [])));
  }

  private normalizeBillboard(raw: unknown): Billboard {
    const row = (raw ?? {}) as Record<string, unknown>;
    const status = String(row['status'] ?? row['Status'] ?? 'inactive').toLowerCase();
    return {
      id: String(row['id'] ?? row['Id'] ?? ''),
      title: String(row['title'] ?? row['Title'] ?? ''),
      subtitle: String(row['subtitle'] ?? row['Subtitle'] ?? ''),
      startDate: String(row['startDate'] ?? row['StartDate'] ?? ''),
      durationDays: Number(row['durationDays'] ?? row['DurationDays'] ?? 0),
      endDate: String(row['endDate'] ?? row['EndDate'] ?? ''),
      status: status === 'active' ? 'active' : 'inactive',
      isActive: Boolean(row['isActive'] ?? row['IsActive'] ?? false),
      isExpired: Boolean(row['isExpired'] ?? row['IsExpired'] ?? false),
      imageUrl: resolveApiUrl((row['imageUrl'] ?? row['ImageUrl'] ?? null) as string | null),
      imageLabelAr: String(row['imageLabelAr'] ?? row['ImageLabelAr'] ?? ''),
      imageLabelEn: String(row['imageLabelEn'] ?? row['ImageLabelEn'] ?? ''),
      displayOrder: Number(row['displayOrder'] ?? row['DisplayOrder'] ?? 0),
      percentage: this.optionalNumber(row['percentage'] ?? row['Percentage']),
      fixedDiscount: this.optionalNumber(row['fixedDiscount'] ?? row['FixedDiscount']),
      linkUrl: this.optionalString(row['linkUrl'] ?? row['LinkUrl'])
    };
  }

  private normalizeMobile(raw: unknown): MobileBillboard {
    const row = (raw ?? {}) as Record<string, unknown>;
    return {
      id: String(row['id'] ?? row['Id'] ?? ''),
      title: String(row['title'] ?? row['Title'] ?? ''),
      subtitle: String(row['subtitle'] ?? row['Subtitle'] ?? ''),
      imageUrl: resolveApiUrl((row['imageUrl'] ?? row['ImageUrl'] ?? null) as string | null),
      imageLabelAr: String(row['imageLabelAr'] ?? row['ImageLabelAr'] ?? ''),
      imageLabelEn: String(row['imageLabelEn'] ?? row['ImageLabelEn'] ?? ''),
      displayOrder: Number(row['displayOrder'] ?? row['DisplayOrder'] ?? 0),
      percentage: this.optionalNumber(row['percentage'] ?? row['Percentage']),
      fixedDiscount: this.optionalNumber(row['fixedDiscount'] ?? row['FixedDiscount']),
      linkUrl: this.optionalString(row['linkUrl'] ?? row['LinkUrl'])
    };
  }

  private optionalNumber(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private optionalString(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    return text || null;
  }
}
