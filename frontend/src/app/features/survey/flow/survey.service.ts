import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PublishedForm {
  id: number;
  name: string;
  description?: string;
  fields_count?: number;
  fields?: SurveyField[];
}

export interface SurveyField {
  id: number;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface OtpSendResponse {
  message: string;
  otp_id: number;
  code?: string; // Temporarily for testing
  expires_at: string;
}

export interface OtpVerifyResponse {
  verified: boolean;
  message: string;
}

export interface SurveyPayload {
  form_id: number;
  group_id: number;
  respondent_phone: string;
  respondent_name?: string;
  respondent_last_name?: string;
  respondent_gender?: string;
  respondent_age?: number;
  respondent_occupation?: string;
  respondent_neighborhood?: string;
  respondent_address?: string;
  encuestador_lat?: number;
  encuestador_lng?: number;
  address_lat?: number;
  address_lng?: number;
  address_source?: 'gps' | 'maps';
  responses: Record<string, unknown>;
  maps_api_calls?: number;
  maps_api_cost_usd?: number;
}

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getPublishedForms(): Observable<any> {
    const p = new HttpParams().set('is_published', 'true').set('per_page', '50');
    return this.http.get(`${this.base}/forms`, { params: p });
  }

  getForm(id: number): Observable<PublishedForm> {
    return this.http.get<PublishedForm>(`${this.base}/forms/${id}`);
  }

  checkDuplicate(phone: string, formId: number): Observable<{ duplicate: boolean; phone: string }> {
    const p = new HttpParams().set('phone', phone).set('form_id', String(formId));
    return this.http.get<{ duplicate: boolean; phone: string }>(`${this.base}/surveys/check`, { params: p });
  }

  sendOtp(phone: string, formId: number, pollsterId?: number): Observable<OtpSendResponse> {
    return this.http.post<OtpSendResponse>(`${this.base}/otp/send`, { 
      phone, 
      form_id: formId, 
      pollster_id: pollsterId 
    });
  }

  verifyOtp(phone: string, formId: number, code: string): Observable<OtpVerifyResponse> {
    return this.http.post<OtpVerifyResponse>(`${this.base}/otp/verify`, { phone, form_id: formId, code });
  }

  submitSurvey(payload: SurveyPayload): Observable<{ message: string; survey: { id: number; submitted_at: string } }> {
    return this.http.post<any>(`${this.base}/surveys`, payload);
  }

  getSurveys(filters: any = {}): Observable<any> {
    const clean: any = {};
    Object.keys(filters).forEach(k => {
      if (filters[k] !== null && filters[k] !== undefined && filters[k] !== '') {
        clean[k] = filters[k];
      }
    });
    const p = new HttpParams({ fromObject: clean });
    return this.http.get<any>(`${this.base}/surveys`, { params: p });
  }

  getSurvey(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/surveys/${id}`);
  }

  getMySurveys(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/surveys/my`);
  }

  // ─── Public Methods (Shareable Link) ───────────────────────────────────
  
  getMapsConfig(): Observable<{ key: string }> {
    return this.http.get<{ key: string }>(`${this.base}/public/maps-config`);
  }

  checkPollster(pin: string): Observable<{ valid: boolean; message?: string; pollster?: any }> {
    const p = new HttpParams().set('pin', pin);
    return this.http.get<any>(`${this.base}/public/pollster-check`, { params: p });
  }

  getPublicForm(id: number): Observable<PublishedForm> {
    return this.http.get<PublishedForm>(`${this.base}/public/forms/${id}`);
  }

  submitPublicSurvey(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/public/surveys`, payload);
  }

  saveDraft(payload: any): Observable<any> {
    return this.http.post<any>(`${this.base}/public/surveys/draft`, payload);
  }

  getDraft(phone: string, formId: number): Observable<{ draft: any | null }> {
    const p = new HttpParams().set('phone', phone).set('form_id', String(formId));
    return this.http.get<{ draft: any | null }>(`${this.base}/public/surveys/draft`, { params: p });
  }

  startExport(filters: any = {}): Observable<{ export_id: string }> {
    const clean: any = {};
    Object.keys(filters).forEach(k => {
      if (filters[k] !== null && filters[k] !== undefined && filters[k] !== '') clean[k] = filters[k];
    });
    return this.http.post<{ export_id: string }>(`${this.base}/surveys/exports`, clean);
  }

  getExportStatus(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/surveys/exports/${id}`);
  }

  downloadExport(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/surveys/exports/${id}/download`, { responseType: 'blob' });
  }

  getGroups(): Observable<any> {
    return this.http.get<any>(`${this.base}/groups`);
  }

  getEncuestadores(): Observable<any> {
    return this.http.get<any>(`${this.base}/hierarchy/encuestadores`);
  }

  getIncompleteSurveys(filters: any = {}): Observable<any> {
    const clean: any = {};
    Object.keys(filters).forEach(k => {
      if (filters[k] !== null && filters[k] !== undefined && filters[k] !== '') clean[k] = filters[k];
    });
    const p = new HttpParams({ fromObject: clean });
    return this.http.get<any>(`${this.base}/surveys/incomplete`, { params: p });
  }
}
