import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SurveyPoint {
  id: number;
  lat: number;
  lng: number;
  group_id: number;
  form_id: number;
  neighborhood?: string;
  date: string;
}

export interface MapLayer {
  id: number;
  name: string;
  type: string;
  geojson?: object;
  is_visible: boolean;
  color: string;
  created_at: string;
}

export interface MapRoute {
  id: number;
  name: string;
  encuestador_id?: number;
  encuestador?: { id: number; name: string; last_name: string };
  waypoints: { lat: number; lng: number; address?: string; order: number }[];
  path_coordinates: { lat: number; lng: number }[];
  scheduled_date?: string;
  is_printed: boolean;
}

@Injectable({ providedIn: 'root' })
export class MapsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/maps`;

  getSurveyPoints(filters: { form_id?: number; group_id?: number; from?: string; to?: string } = {}): Observable<{ points: SurveyPoint[]; total: number }> {
    let p = new HttpParams();
    if (filters.form_id)  p = p.set('form_id',  String(filters.form_id));
    if (filters.group_id) p = p.set('group_id', String(filters.group_id));
    if (filters.from)     p = p.set('from',     filters.from);
    if (filters.to)       p = p.set('to',       filters.to);
    return this.http.get<any>(`${this.base}/surveys`, { params: p });
  }

  getLayers(): Observable<MapLayer[]> {
    return this.http.get<MapLayer[]>(`${this.base}/layers`);
  }

  getLayer(id: number): Observable<MapLayer> {
    return this.http.get<MapLayer>(`${this.base}/layers/${id}`);
  }

  createLayer(data: Partial<MapLayer>): Observable<MapLayer> {
    return this.http.post<MapLayer>(`${this.base}/layers`, data);
  }

  updateLayer(id: number, data: Partial<MapLayer>): Observable<MapLayer> {
    return this.http.patch<MapLayer>(`${this.base}/layers/${id}`, data);
  }

  deleteLayer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/layers/${id}`);
  }

  getRoutes(filters: { encuestador_id?: number; date?: string } = {}): Observable<any> {
    let p = new HttpParams();
    if (filters.encuestador_id) p = p.set('encuestador_id', String(filters.encuestador_id));
    if (filters.date)           p = p.set('date',           filters.date);
    return this.http.get(`${this.base}/routes`, { params: p });
  }

  getRoute(id: number): Observable<MapRoute> {
    return this.http.get<MapRoute>(`${this.base}/routes/${id}`);
  }

  createRoute(data: Partial<MapRoute>): Observable<MapRoute> {
    return this.http.post<MapRoute>(`${this.base}/routes`, data);
  }

  updateRoute(id: number, data: Partial<MapRoute>): Observable<MapRoute> {
    return this.http.put<MapRoute>(`${this.base}/routes/${id}`, data);
  }

  deleteRoute(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/routes/${id}`);
  }

  getEncuestadores(): Observable<{ id: number; name: string; last_name: string; phone?: string }[]> {
    return this.http.get<any[]>(`${this.base}/encuestadores`);
  }
}
