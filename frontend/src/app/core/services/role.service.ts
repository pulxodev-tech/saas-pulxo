import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  permissions_count?: number;
}

export interface Permission {
  id: number;
  permission_group_id: number;
  name: string;
  display_name: string;
  description?: string;
  group?: {
    id: number;
    name: string;
    display_name: string;
  };
}

export interface PermissionGroup {
  id: number;
  name: string;
  display_name: string;
  permissions: Permission[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`);
  }

  getRolePermissions(roleId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/roles/${roleId}/permissions`);
  }

  syncRolePermissions(roleId: number, permissionIds: number[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/roles/${roleId}/permissions`, { permission_ids: permissionIds });
  }

  getAllPermissions(): Observable<PermissionGroup[]> {
    return this.http.get<PermissionGroup[]>(`${this.apiUrl}/permissions`);
  }
}
