import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService, Role, PermissionGroup } from '../../core/services/role.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">
      
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-slate-800 tracking-tight">Roles y Permisos</h2>
          <p class="text-sm text-slate-500 mt-1">Define el nivel de acceso para cada tipo de usuario en la plataforma.</p>
        </div>
        <div class="flex items-center gap-3">
           <button class="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">
             Imprimir Reporte
           </button>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        <!-- Roles List -->
        <div class="xl:col-span-4 space-y-4">
          @for (role of roles(); track role.id) {
            <div 
              (click)="selectRole(role)"
              [class.active-role-card]="selectedRole()?.id === role.id"
              class="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">
                  {{ role.is_system ? 'Sistema' : 'Personalizado' }}
                </span>
                <div class="flex -space-x-2">
                   <div class="w-6 h-6 rounded-full bg-slate-100 border-2 border-white"></div>
                   <div class="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>
                </div>
              </div>
              <h4 class="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{{ role.display_name }}</h4>
              <p class="text-xs text-slate-400 mt-1 leading-relaxed">{{ role.description || 'Sin descripción definida' }}</p>
              
              <div class="mt-4 flex items-center justify-between">
                <span class="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                  {{ role.permissions_count || 0 }} Permisos
                </span>
                <svg class="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-all translate-x-0 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </div>
            </div>
          }
        </div>

        <!-- Permission Matrix -->
        <div class="xl:col-span-8">
          @if (selectedRole()) {
            <div class="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-right-4 duration-500">
              <div class="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-bold text-slate-800">Gestionar Permisos: {{ selectedRole()?.display_name }}</h3>
                  <p class="text-xs text-slate-400 mt-0.5">Marca los accesos permitidos para este rol específicamente.</p>
                </div>
                <button 
                  (click)="savePermissions()"
                  [disabled]="saving()"
                  class="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  <svg *ngIf="!saving()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span *ngIf="saving()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  {{ saving() ? 'Guardando...' : 'Guardar Cambios' }}
                </button>
              </div>

              <div class="p-8 space-y-8 max-h-[700px] overflow-y-auto custom-scrollbar">
                @for (group of permissionGroups(); track group.id) {
                  <div>
                    <div class="flex items-center gap-3 mb-4">
                      <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                      </div>
                      <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">{{ group.display_name }}</h4>
                      <div class="h-px bg-slate-100 flex-1"></div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      @for (perm of group.permissions; track perm.id) {
                        <label class="flex items-center gap-3 p-4 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer group">
                           <div class="relative flex items-center">
                             <input 
                               type="checkbox" 
                               [checked]="hasPermission(perm.id)"
                               (change)="togglePermission(perm.id)"
                               class="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-100 transition-all"
                             >
                           </div>
                           <div class="flex flex-col">
                             <span class="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">{{ perm.display_name }}</span>
                             <span class="text-[10px] text-slate-400 font-medium">{{ perm.name }}</span>
                           </div>
                        </label>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="bg-white rounded-[32px] border-2 border-dashed border-slate-100 p-20 flex flex-col items-center text-center">
               <div class="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
                 <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
               </div>
               <h3 class="text-xl font-bold text-slate-800">Selecciona un Rol</h3>
               <p class="text-sm text-slate-400 max-w-xs mt-2">Haz clic en un rol del panel izquierdo para visualizar y gestionar sus permisos asociados.</p>
            </div>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .active-role-card {
      border-color: #2563EB !important;
      background-color: #EFF6FF !important;
      box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.1) !important;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 5px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #E2E8F0;
      border-radius: 10px;
    }
  `]
})
export class RolesComponent implements OnInit {
  private roleService = inject(RoleService);

  roles = signal<Role[]>([]);
  permissionGroups = signal<PermissionGroup[]>([]);
  selectedRole = signal<Role | null>(null);
  selectedPermissions = signal<number[]>([]);
  
  loading = signal(false);
  saving = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.roleService.getRoles().subscribe(roles => {
      this.roles.set(roles);
      this.loading.set(false);
    });
    this.roleService.getAllPermissions().subscribe(groups => {
      this.permissionGroups.set(groups);
    });
  }

  selectRole(role: Role): void {
    this.selectedRole.set(role);
    this.roleService.getRolePermissions(role.id).subscribe(ids => {
      this.selectedPermissions.set(ids);
    });
  }

  hasPermission(id: number): boolean {
    return this.selectedPermissions().includes(id);
  }

  togglePermission(id: number): void {
    const current = this.selectedPermissions();
    if (current.includes(id)) {
      this.selectedPermissions.set(current.filter(p => p !== id));
    } else {
      this.selectedPermissions.set([...current, id]);
    }
  }

  savePermissions(): void {
    const role = this.selectedRole();
    if (!role) return;

    this.saving.set(true);
    this.roleService.syncRolePermissions(role.id, this.selectedPermissions())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        // Optionally show a toast
        role.permissions_count = this.selectedPermissions().length;
        this.roles.set([...this.roles()]);
      });
  }
}
