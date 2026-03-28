import { Component, inject, signal, computed } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permission?: string;
  badge?: string;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  template: `
    <div class="flex h-screen bg-[#F8FAFC] font-['Inter'] overflow-hidden text-slate-900">
      <!-- ── Sidebar ──────────────────────────────────────────────────────── -->
      <aside
        class="flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-30 flex-shrink-0 relative shadow-sm"
        [class.w-72]="!collapsed()"
        [class.w-20]="collapsed()"
      >
        <!-- Logo Area -->
        <div class="flex items-center h-[70px] px-6 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 flex-shrink-0">
              <span class="font-bold text-xl uppercase">P</span>
            </div>
            @if (!collapsed()) {
              <div class="flex flex-col overflow-hidden animate-in fade-in duration-300">
                <span class="text-xl font-bold text-slate-800 tracking-tight leading-none truncate">Pulxo</span>
                <span class="text-[10px] text-blue-600 font-semibold uppercase tracking-wider mt-1 opacity-70">Operativo</span>
              </div>
            }
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          @for (item of visibleNavItems(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active-link"
              [routerLinkActiveOptions]="{ exact: item.route === '/' }"
              class="flex items-center gap-3.5 px-3 py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-all group no-underline"
              [title]="collapsed() ? item.label : ''"
            >
              <div class="w-6 h-6 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" [innerHTML]="item.icon"></div>
              @if (!collapsed()) {
                <span class="text-[14px] font-medium truncate flex-1">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="ml-auto text-[10px] bg-blue-100 text-blue-600 font-bold rounded-full px-2 py-0.5 tracking-wider">{{ item.badge }}</span>
                }
              }
            </a>
          }
        </nav>

        <!-- Sidebar Footer (User Info) -->
        <div class="p-4 border-t border-slate-100 bg-slate-50/30">
          <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             @if (!collapsed()) {
               <div class="flex items-center gap-3 mb-3 animate-in slide-in-from-bottom-2 duration-300">
                 <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                   {{ userInitial() }}
                 </div>
                 <div class="flex-1 min-w-0">
                   <p class="text-sm font-semibold text-slate-800 truncate leading-tight">{{ user()?.name }}</p>
                   <p class="text-[11px] text-slate-400 capitalize truncate">{{ user()?.role?.display_name }}</p>
                 </div>
               </div>
             }
             <button
               (click)="logout()"
               class="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 transition-all text-sm font-medium"
             >
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
               @if (!collapsed()) { <span>Cerrar sesión</span> }
             </button>
          </div>
        </div>

        <!-- Collapse Toggle (Floating) -->
        <button
          (click)="collapsed.set(!collapsed())"
          class="absolute -right-3 top-[80px] w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm z-40 transition-transform hover:scale-110 active:scale-95 text-[10px]"
        >
          <svg [class.rotate-180]="collapsed()" class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
      </aside>

      <!-- ── Main content ──────────────────────────────────────────────────── -->
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
        <!-- Topbar -->
        <header class="h-[70px] bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-8 gap-4 flex-shrink-0 z-20">
          <div class="flex-1 flex flex-col justify-center">
            <div class="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">
              <span>SaaS Pulxo</span>
              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              <span class="text-blue-600/60 tracking-wider">Módulo Admin</span>
            </div>
            <h1 class="text-xl font-bold text-slate-800 tracking-tight">{{ pageTitle() }}</h1>
          </div>

          <!-- Right actions -->
          <div class="flex items-center gap-4">
             <div class="hidden lg:flex flex-col items-end mr-3">
               <span class="text-[10px] text-slate-300 font-extrabold uppercase tracking-widest">Base de Datos</span>
               <span class="text-[11px] text-blue-500 font-bold flex items-center gap-1.5">
                 <span class="relative flex h-2 w-2">
                   <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                   <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                 </span>
                 En Línea
               </span>
             </div>
             
             <button class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all relative group">
               <svg class="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
               <span class="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
             </button>

             <div class="h-8 w-px bg-slate-200"></div>

             <div class="flex items-center gap-3">
                <div class="flex flex-col items-end hidden sm:flex">
                  <span class="text-sm font-bold text-slate-700 leading-none mb-0.5">{{ user()?.name }}</span>
                  <span class="text-[10px] text-slate-400 uppercase tracking-tighter">{{ user()?.role?.display_name }}</span>
                </div>
                <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-200 hover:rotate-3 transition-transform cursor-pointer">
                  {{ userInitial() }}
                </div>
             </div>
          </div>
        </header>

        <!-- Router outlet -->
        <main class="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          <div class="max-w-[1600px] mx-auto min-h-full">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .active-link {
      background-color: #EFF6FF !important; /* blue-50 */
      color: #1D4ED8 !important; /* blue-700 */
      box-shadow: inset 0 0 0 1px #DBEAFE;
    }
    .active-link::after {
      content: '';
      position: absolute;
      left: 0;
      top: 15%;
      height: 70%;
      width: 4px;
      background-color: #2563EB; /* blue-600 */
      border-radius: 0 4px 4px 0;
    }
    .active-link svg {
      color: #2563EB !important;
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
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #CBD5E1;
    }
  `]
})
export class AdminShellComponent {
  private auth = inject(AuthService);

  readonly user      = this.auth.user;
  readonly collapsed = signal(false);

  readonly userInitial = computed(() => {
    const u = this.user();
    return u ? u.name.charAt(0).toUpperCase() : 'U';
  });

  private readonly allNavItems: NavItem[] = [
    { label: 'Dashboard',       icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>', route: '/dashboard',  permission: 'dashboard.view' },
    { label: 'Usuarios',        icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>', route: '/users',      permission: 'users.view' },
    { label: 'Roles y Permisos',icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>', route: '/roles',      permission: 'roles.view' },
    { label: 'Jerarquía',       icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>', route: '/hierarchy',  permission: 'hierarchy.view' },
    { label: 'Formularios',     icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>', route: '/forms',      permission: 'forms.view' },
    { label: 'Encuestas',       icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', route: '/surveys',    permission: 'surveys.view' },
    { label: 'Mapas',           icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>', route: '/maps',       permission: 'maps.view' },
    { label: 'Campañas',        icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.167a2.405 2.405 0 00-1.712-1.541l-1.928-.567a1.691 1.691 0 01-1.127-1.427V1.69a1.691 1.691 0 011.69-1.69h12.62c.934 0 1.69.756 1.69 1.69v12.62c0 .934-.756 1.69-1.69 1.69h-1.44a1.14 1.14 0 00-.73.272l-3.235 2.68a1.691 1.691 0 01-2.618-1.404v-12.62a1.691 1.691 0 011.677-1.68h6.29"/></svg>', route: '/campaigns',  permission: 'campaigns.view' },
    { label: 'Reportes',        icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>', route: '/reports',    permission: 'reports.view' },
    { label: 'Parámetros',      icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>', route: '/parameters', permission: 'parameters.view' },
  ];

  readonly visibleNavItems = computed(() =>
    this.allNavItems.filter(item =>
      !item.permission || this.auth.hasPermission(item.permission)
    )
  );

  readonly pageTitle = computed(() => {
    const route = typeof window !== 'undefined' ? window.location.pathname.split('?')[0] : '';
    const found = this.allNavItems.find(i => route.startsWith(i.route));
    return found?.label ?? 'Pulxo';
  });

  logout(): void {
    this.auth.logout();
  }
}
