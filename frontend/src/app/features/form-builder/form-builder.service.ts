import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Form, FormField } from './form-builder.models';

@Injectable({ providedIn: 'root' })
export class FormBuilderService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/forms`;

  // ── Forms ─────────────────────────────────────────────────────────────────
  getForms(params?: { search?: string; is_published?: boolean; per_page?: number }): Observable<any> {
    let p = new HttpParams();
    if (params?.search)       p = p.set('search', params.search);
    if (params?.per_page)     p = p.set('per_page', String(params.per_page));
    if (params?.is_published !== undefined) p = p.set('is_published', String(params.is_published));
    return this.http.get(this.base, { params: p });
  }

  getForm(id: number): Observable<Form> {
    return this.http.get<Form>(`${this.base}/${id}`);
  }

  createForm(data: { name: string; description?: string }): Observable<Form> {
    return this.http.post<Form>(this.base, data);
  }

  updateForm(id: number, data: Partial<Form>): Observable<Form> {
    return this.http.put<Form>(`${this.base}/${id}`, data);
  }

  togglePublish(id: number): Observable<{ id: number; is_published: boolean; message: string }> {
    return this.http.patch<any>(`${this.base}/${id}/publish`, {});
  }

  deleteForm(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Fields ────────────────────────────────────────────────────────────────
  getFields(formId: number): Observable<FormField[]> {
    return this.http.get<FormField[]>(`${this.base}/${formId}/fields`);
  }

  addField(formId: number, field: Partial<FormField>): Observable<FormField> {
    return this.http.post<FormField>(`${this.base}/${formId}/fields`, field);
  }

  updateField(formId: number, fieldId: number, data: Partial<FormField>): Observable<FormField> {
    return this.http.put<FormField>(`${this.base}/${formId}/fields/${fieldId}`, data);
  }

  reorderFields(formId: number, fields: { id: number; sort_order: number }[]): Observable<any> {
    return this.http.patch(`${this.base}/${formId}/fields/reorder`, { fields });
  }

  removeField(formId: number, fieldId: number): Observable<any> {
    return this.http.delete(`${this.base}/${formId}/fields/${fieldId}`);
  }
}
