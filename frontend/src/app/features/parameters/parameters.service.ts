import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ParameterField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'email' | 'number' | 'select' | 'boolean';
  encrypted: boolean;
  default: string | null;
  placeholder: string | null;
  description: string | null;
  options: string[] | null;
  value: string | null;
  has_value: boolean;
}

export interface ParameterGroup {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  fields: ParameterField[];
  configured: number;
  total: number;
}

export interface TestResult {
  success: boolean;
  message: string;
  details: Record<string, string>;
  log: { time: string; level: string; message: string }[];
}

@Injectable({ providedIn: 'root' })
export class ParametersService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getAll(): Observable<ParameterGroup[]> {
    return this.http.get<ParameterGroup[]>(`${this.base}/parameters`);
  }

  save(group: string, values: Record<string, string>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/parameters/${group}`, values);
  }

  testConnection(group: string): Observable<TestResult> {
    return this.http.post<TestResult>(`${this.base}/parameters/test/${group}`, {});
  }

  sendTest(group: string, target: string, message?: string): Observable<TestResult> {
    let body: Record<string, string> = {};
    if (group === 'email')  body = { email: target };
    else if (group === 'maps')   body = { address: target };
    else if (group === 'n8n')    body = {};
    else                         body = { phone: target };
    if (message && group === 'sms') body['message'] = message;
    return this.http.post<TestResult>(`${this.base}/parameters/send-test/${group}`, body);
  }
}
