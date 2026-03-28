import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Audience {
  id: number;
  name: string;
  description?: string;
  filters: Record<string, any>;
  estimated_count: number;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  message_template: string;
  channel: 'sms' | 'sms_flash';
  audience_id: number;
  audience?: { id: number; name: string };
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CampaignsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/campaigns`;

  getCampaigns(): Observable<any> {
    return this.http.get(this.base);
  }

  getCampaign(id: number): Observable<{ campaign: Campaign; stats: Record<string, number> }> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  createCampaign(data: Partial<Campaign>): Observable<Campaign> {
    return this.http.post<Campaign>(this.base, data);
  }

  updateCampaign(id: number, data: Partial<Campaign>): Observable<Campaign> {
    return this.http.put<Campaign>(`${this.base}/${id}`, data);
  }

  deleteCampaign(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  dispatch(id: number): Observable<{ message: string; recipients: number }> {
    return this.http.post<any>(`${this.base}/${id}/dispatch`, {});
  }

  cancel(id: number): Observable<{ message: string }> {
    return this.http.post<any>(`${this.base}/${id}/cancel`, {});
  }

  getMessages(id: number, status?: string): Observable<any> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return this.http.get(`${this.base}/${id}/messages`, { params: p });
  }

  // Audiences
  getAudiences(): Observable<Audience[]> {
    return this.http.get<Audience[]>(`${this.base}/audiences`);
  }

  previewAudience(filters: Record<string, any>): Observable<{ count: number }> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== '' && v !== null) p = p.set(k, String(v));
    }
    return this.http.get<{ count: number }>(`${this.base}/audiences/preview`, { params: p });
  }

  createAudience(data: Partial<Audience>): Observable<Audience> {
    return this.http.post<Audience>(`${this.base}/audiences`, data);
  }

  deleteAudience(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/audiences/${id}`);
  }
}
