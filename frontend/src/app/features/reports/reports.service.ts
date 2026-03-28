import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReportFilters {
  form_id?: number;
  group_id?: number;
  encuestador_id?: number;
  from?: string;
  to?: string;
  per_page?: number;
}

export interface FieldSummaryRow {
  answer: string;
  value: string;
  count: number;
  pct: number;
}

export interface FieldSummary {
  field_key: string;
  label: string;
  field_type: string;
  rows: FieldSummaryRow[];
}

export interface SummaryResponse {
  form: { id: number; name: string };
  total: number;
  fields: FieldSummary[];
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getSurveys(filters: ReportFilters): Observable<any> {
    let p = new HttpParams();
    if (filters.form_id)        p = p.set('form_id',        String(filters.form_id));
    if (filters.group_id)       p = p.set('group_id',       String(filters.group_id));
    if (filters.encuestador_id) p = p.set('encuestador_id', String(filters.encuestador_id));
    if (filters.from)           p = p.set('from',           filters.from);
    if (filters.to)             p = p.set('to',             filters.to);
    if (filters.per_page)       p = p.set('per_page',       String(filters.per_page));
    return this.http.get(`${this.base}/reports/surveys`, { params: p });
  }

  getSummary(filters: ReportFilters): Observable<SummaryResponse> {
    let p = new HttpParams();
    if (filters.form_id)  p = p.set('form_id',  String(filters.form_id));
    if (filters.group_id) p = p.set('group_id', String(filters.group_id));
    if (filters.from)     p = p.set('from',     filters.from);
    if (filters.to)       p = p.set('to',       filters.to);
    return this.http.get<SummaryResponse>(`${this.base}/reports/summary`, { params: p });
  }

  exportExcel(type: 'detail' | 'summary', filters: ReportFilters): Observable<Blob> {
    let p = new HttpParams().set('type', type);
    if (filters.form_id)        p = p.set('form_id',        String(filters.form_id));
    if (filters.group_id)       p = p.set('group_id',       String(filters.group_id));
    if (filters.encuestador_id) p = p.set('encuestador_id', String(filters.encuestador_id));
    if (filters.from)           p = p.set('from',           filters.from);
    if (filters.to)             p = p.set('to',             filters.to);
    return this.http.get(`${this.base}/reports/export/excel`, { params: p, responseType: 'blob' });
  }

  exportPdf(filters: ReportFilters): Observable<Blob> {
    let p = new HttpParams();
    if (filters.form_id)  p = p.set('form_id',  String(filters.form_id));
    if (filters.group_id) p = p.set('group_id', String(filters.group_id));
    if (filters.from)     p = p.set('from',     filters.from);
    if (filters.to)       p = p.set('to',       filters.to);
    return this.http.get(`${this.base}/reports/export/pdf`, { params: p, responseType: 'blob' });
  }
}
