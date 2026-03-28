export interface AuthUser {
  id: number;
  name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  role: {
    id: number;
    name: RoleName;
    display_name: string;
  };
  permissions: string[];
}

export interface LoginEmailResponse {
  token: string;
  user: AuthUser;
  permissions: string[];
}

export interface LoginPinResponse {
  token: string;
  user: Pick<AuthUser, 'id' | 'name' | 'last_name'> & { role: 'encuestador' };
  group: { id: number; name: string } | null;
}

export type RoleName =
  | 'super_admin'
  | 'administrador'
  | 'pagador'
  | 'soporte_tecnico'
  | 'coordinador'
  | 'supervisor'
  | 'encuestador';
