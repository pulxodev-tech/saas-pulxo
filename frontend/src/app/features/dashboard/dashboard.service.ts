import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  period: { from: string; to: string };
  total_surveys: number;
  total_today: number;
  active_encuestadores: number;
  total_encuestadores: number;
  gps_coverage_pct: number;
  hourly_today: Record<number, number>;
  by_group: { group_name: string; total: number }[];
  by_encuestador: { id: number; full_name: string; total: number }[];
  by_form: { form_name: string; total: number }[];
  recent_points: { id: number; lat: number; lng: number; form_id: number; time: string }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getStats(filters: { form_id?: number; group_id?: number; date_from?: string; date_to?: string } = {}): Observable<DashboardStats> {
    let p = new HttpParams();
    if (filters.form_id)  p = p.set('form_id',   String(filters.form_id));
    if (filters.group_id) p = p.set('group_id',  String(filters.group_id));
    if (filters.date_from) p = p.set('date_from', filters.date_from);
    if (filters.date_to)   p = p.set('date_to',   filters.date_to);
    return this.http.get<DashboardStats>(`${this.base}/dashboard`, { params: p });
  }
}
