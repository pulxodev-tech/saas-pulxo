import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginEmailResponse, LoginPinResponse } from './auth.models';

const TOKEN_KEY = 'pulxo_token';
const USER_KEY  = 'pulxo_user';
const PERMS_KEY = 'pulxo_permissions';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  // ── Signals ────────────────────────────────────────────────────────────────
  private _user        = signal<AuthUser | null>(this.loadUser());
  private _permissions = signal<string[]>(this.loadPermissions());
  private _token       = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly user        = this._user.asReadonly();
  readonly permissions = this._permissions.asReadonly();
  readonly isLoggedIn  = computed(() => !!this._token());
  readonly isEncuestador = computed(() => this._user()?.role.name === 'encuestador');

  // ── Email Login (Admin, Coordinador, Supervisor, etc.) ─────────────────────
  loginEmail(email: string, password: string): Observable<LoginEmailResponse> {
    return this.http
      .post<LoginEmailResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap(res => this.persist(res.token, res.user, res.permissions)));
  }

  // ── PIN Login (Encuestador) ────────────────────────────────────────────────
  loginPin(pin: string, groupId?: number): Observable<LoginPinResponse> {
    return this.http
      .post<LoginPinResponse>(`${environment.apiUrl}/auth/login/pin`, { pin, group_id: groupId })
      .pipe(
        tap(res => {
          const user: AuthUser = {
            id:        res.user.id,
            name:      res.user.name,
            last_name: res.user.last_name,
            email:     null,
            phone:     null,
            is_active: true,
            role:      { id: 0, name: 'encuestador', display_name: 'Encuestador' },
            permissions: ['surveys.create'],
          };
          this.persist(res.token, user, ['surveys.create']);
          // Store group for survey flow
          if (res.group) {
            sessionStorage.setItem('pulxo_group', JSON.stringify(res.group));
          }
        })
      );
  }

  logout(): void {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  getToken(): string | null {
    return this._token();
  }

  hasPermission(permission: string): boolean {
    const perms = this._permissions();
    // Wildcard for super_admin
    if (perms.includes('*')) return true;
    return perms.includes(permission);
  }

  // ── Internal ───────────────────────────────────────────────────────────────
  private persist(token: string, user: AuthUser, permissions: string[]): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(PERMS_KEY, JSON.stringify(permissions));
    this._token.set(token);
    this._user.set(user);
    this._permissions.set(permissions);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PERMS_KEY);
    sessionStorage.removeItem('pulxo_group');
    this._token.set(null);
    this._user.set(null);
    this._permissions.set([]);
    this.router.navigate(['/login']);
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private loadPermissions(): string[] {
    try {
      const raw = localStorage.getItem(PERMS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
