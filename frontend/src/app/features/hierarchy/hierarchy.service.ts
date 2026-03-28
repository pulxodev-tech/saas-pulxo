import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Group {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  is_active: boolean;
  members_count?: number;
}

export interface HierarchyNode {
  id: number;
  name: string;
  email: string | null;
  supervisors: {
    id: number;
    name: string;
    groups: { 
      id: number; 
      name: string; 
      members_count: number; 
      hierarchy_id: number;
      coordinator_id: number;
      supervisor_id: number;
      group_id: number;
      members?: GroupMember[];
    }[];
  }[];
}

export interface GroupMember {
  id: number;
  name: string;
  is_active: boolean;
  member_id: number;
}

@Injectable({ providedIn: 'root' })
export class HierarchyService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Hierarchy tree ────────────────────────────────────────────────────────
  getTree(): Observable<HierarchyNode[]> {
    return this.http.get<HierarchyNode[]>(`${this.base}/hierarchy`);
  }

  getCoordinators(): Observable<{ id: number; name: string; last_name: string }[]> {
    return this.http.get<any[]>(`${this.base}/hierarchy/coordinators`);
  }

  getSupervisors(): Observable<{ id: number; name: string; last_name: string }[]> {
    return this.http.get<any[]>(`${this.base}/hierarchy/supervisors`);
  }

  getEncuestadores(): Observable<{ id: number; name: string; last_name: string; phone: string }[]> {
    return this.http.get<any[]>(`${this.base}/hierarchy/encuestadores`);
  }

  assign(coordinatorId: number, supervisorId: number, groupId: number): Observable<any> {
    return this.http.post(`${this.base}/hierarchy/assign`, {
      coordinator_id: coordinatorId,
      supervisor_id:  supervisorId,
      group_id:       groupId,
    });
  }

  updateAssignment(id: number, coordinatorId: number, supervisorId: number, groupId: number): Observable<any> {
    return this.http.put(`${this.base}/hierarchy/${id}`, {
      coordinator_id: coordinatorId,
      supervisor_id:  supervisorId,
      group_id:       groupId,
    });
  }

  removeAssignment(hierarchyId: number): Observable<any> {
    return this.http.delete(`${this.base}/hierarchy/${hierarchyId}`);
  }

  removeSupervisor(coordId: number, supId: number): Observable<any> {
    return this.http.delete(`${this.base}/hierarchy/coordinator/${coordId}/supervisor/${supId}`);
  }

  // ── Groups ────────────────────────────────────────────────────────────────
  getGroups(params?: { search?: string; is_active?: boolean; per_page?: number }): Observable<any> {
    let p = new HttpParams();
    if (params?.search)    p = p.set('search', params.search);
    if (params?.per_page)  p = p.set('per_page', params.per_page);
    if (params?.is_active !== undefined) p = p.set('is_active', String(params.is_active));
    return this.http.get(`${this.base}/groups`, { params: p });
  }

  getGroup(id: number): Observable<Group> {
    return this.http.get<Group>(`${this.base}/groups/${id}`);
  }

  createGroup(data: { name: string; description?: string }): Observable<Group> {
    return this.http.post<Group>(`${this.base}/groups`, data);
  }

  updateGroup(id: number, data: Partial<Group>): Observable<Group> {
    return this.http.put<Group>(`${this.base}/groups/${id}`, data);
  }

  deleteGroup(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/groups/${id}`);
  }

  // ── Members ───────────────────────────────────────────────────────────────
  getGroupMembers(groupId: number): Observable<GroupMember[]> {
    return this.http.get<GroupMember[]>(`${this.base}/hierarchy/groups/${groupId}/members`);
  }

  addMember(groupId: number, userId: number): Observable<any> {
    return this.http.post(`${this.base}/hierarchy/groups/${groupId}/members`, { user_id: userId });
  }

  removeMember(groupId: number, userId: number): Observable<any> {
    return this.http.delete(`${this.base}/hierarchy/groups/${groupId}/members/${userId}`);
  }
}
