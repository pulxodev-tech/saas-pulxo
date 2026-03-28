import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User } from '../../core/services/user.service';
import { RoleService, Role } from '../../core/services/role.service';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">
      <p-toast />
      
      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 group hover:shadow-md transition-shadow cursor-default">
          <div class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
          <div>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Usuarios</p>
            <h3 class="text-3xl font-black text-slate-800">{{ users().length }}</h3>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 group hover:shadow-md transition-shadow cursor-default">
          <div class="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 transition-transform group-hover:scale-110">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Activos</p>
            <h3 class="text-3xl font-black text-slate-800 text-green-600/90">{{ activeCount() }}</h3>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 group hover:shadow-md transition-shadow cursor-default">
          <div class="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 transition-transform group-hover:scale-110">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Inactivos</p>
            <h3 class="text-3xl font-black text-slate-800">{{ inactiveCount() }}</h3>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 group hover:shadow-md transition-shadow cursor-default">
          <div class="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          </div>
          <div>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Roles activos</p>
            <h3 class="text-3xl font-black text-slate-800">7</h3>
          </div>
        </div>
      </div>

      <!-- Main Dashboard Card -->
      <div class="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        
        <!-- Header & Filters -->
        <div class="px-8 py-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex-1 min-w-0 max-w-lg relative group">
            <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <input 
              type="text" 
              placeholder="Buscar por nombre, celular o rol..."
              class="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
              [(ngModel)]="searchTerm"
              (keyup.enter)="loadUsers()"
            >
          </div>

          <div class="flex items-center gap-3">
             <button (click)="loadUsers()" class="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 text-sm font-bold flex items-center gap-2 hover:bg-slate-100 transition-all">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               Buscar
             </button>
             <button (click)="resetSearch()" class="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 text-sm font-bold flex items-center gap-2 hover:bg-slate-100 transition-all">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
               Limpiar
             </button>
             <button (click)="openCreateModal()" class="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
               <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
               Nuevo Usuario
             </button>
          </div>
        </div>

        <!-- Create User Modal -->
        @if (showModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div class="bg-white rounded-[32px] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
              <div class="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 class="text-xl font-black text-slate-800">{{ editingUserId() ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
                <button (click)="closeModal()" class="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                  <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              
              <form class="p-8 space-y-5" (ngSubmit)="saveUser()">
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                    <input type="text" [(ngModel)]="userForm().name" name="name" required class="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all">
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellido</label>
                    <input type="text" [(ngModel)]="userForm().last_name" name="last_name" class="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all">
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between ml-1">
                      <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Celular (Usuario)</label>
                      <span class="text-[10px] font-bold" [class]="(userForm().phone?.length || 0) === 10 ? 'text-green-500' : 'text-slate-300'">
                        {{ userForm().phone?.length || 0 }}/10
                      </span>
                    </div>
                    <input 
                      type="text" 
                      [ngModel]="userForm().phone" 
                      (ngModelChange)="updatePhone($event)"
                      name="phone" 
                      required 
                      maxlength="10"
                      minlength="10"
                      pattern="[0-9]*"
                      #phoneInput="ngModel"
                      class="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all" 
                      placeholder="Ej: 3001234567"
                    >
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                    <select [ngModel]="userForm().role_id" (ngModelChange)="updateRole($event)" name="role_id" required class="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer">
                      <option [value]="undefined" disabled>Selecciona un rol</option>
                      @for (role of roles(); track role.id) {
                        <option [value]="role.id">{{ role.display_name }}</option>
                      }
                    </select>
                  </div>
                </div>

                @if (selectedRole()?.name?.toLowerCase()?.trim() === 'encuestador') {
                  @if (editingUserId()) {
                    <div class="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                      <svg class="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                      <div>
                        <p class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Código de acceso a encuestas</p>
                        <p class="text-lg font-black text-indigo-700 tracking-widest">{{ editingUserCode() || '—' }}</p>
                      </div>
                    </div>
                  }
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between ml-1">
                      <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest">{{ editingUserId() ? 'Nuevo PIN (Opcional)' : 'PIN de Acceso (4 dígitos)' }}</label>
                      <span class="text-[10px] font-bold" [class]="(userForm().pin?.length || 0) === 4 ? 'text-green-500' : 'text-slate-300'">
                        {{ userForm().pin?.length || 0 }}/4
                      </span>
                    </div>
                    <div class="relative group/field">
                      <input [type]="showPin() ? 'text' : 'password'" maxlength="4" minlength="4" pattern="[0-9]*" [ngModel]="userForm().pin" (ngModelChange)="updatePin($event)" name="pin" [required]="!editingUserId()" class="w-full bg-slate-50 border-none rounded-2xl py-3 pl-4 pr-12 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all" placeholder="0000">
                      <button type="button" (click)="showPin.set(!showPin())" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path *ngIf="!showPin()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path *ngIf="!showPin()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          <path *ngIf="showPin()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057-5.064-7-9.542-7a10.05 10.05 0 012.112.226M7 7l10 10M9.88 9.88a3 3 0 104.24 4.24" />
                        </svg>
                      </button>
                    </div>
                  </div>
                } @else if (userForm().role_id) {
                  <div class="space-y-1.5">
                    <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{{ editingUserId() ? 'Nueva Contraseña (Opcional)' : 'Contraseña' }}</label>
                    <div class="relative group/field">
                      <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="userForm().password" name="password" [required]="!editingUserId()" class="w-full bg-slate-50 border-none rounded-2xl py-3 pl-4 pr-12 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all">
                      <button type="button" (click)="showPassword.set(!showPassword())" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path *ngIf="!showPassword()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path *ngIf="!showPassword()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          <path *ngIf="showPassword()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057-5.064-7-9.542-7a10.05 10.05 0 012.112.226M7 7l10 10M9.88 9.88a3 3 0 104.24 4.24" />
                        </svg>
                      </button>
                    </div>
                  </div>
                }

                <div class="pt-4 flex items-center gap-3">
                  <button type="button" (click)="closeModal()" class="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-500 text-sm font-bold hover:bg-slate-100 transition-all">Cancelar</button>
                  <button type="submit" [disabled]="saving()" class="flex-[2] py-4 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                    <span *ngIf="saving()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {{ saving() ? 'Guardando...' : (editingUserId() ? 'Actualizar Usuario' : 'Crear Usuario') }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50">
                <th class="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Información Usuario</th>
                <th class="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Código</th>
                <th class="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Rol</th>
                <th class="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                <th class="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (user of filteredUsers(); track user.id) {
                <tr class="group hover:bg-slate-50/50 transition-colors">
                  <td class="px-8 py-5">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                        {{ user.name.charAt(0) }}
                      </div>
                      <div class="flex flex-col min-w-0">
                        <span class="text-[15px] font-bold text-slate-800 leading-tight truncate group-hover:text-blue-600 transition-colors">{{ user.name }} {{ user.last_name }}</span>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span class="text-xs text-slate-400 truncate">{{ user.phone }}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-8 py-5 text-center">
                    @if (user.pollster_code) {
                      <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-black tracking-widest select-all cursor-pointer" title="Código de acceso a encuestas">
                        {{ user.pollster_code }}
                      </span>
                    } @else {
                      <span class="text-slate-300 text-xs font-bold">—</span>
                    }
                  </td>
                  <td class="px-8 py-5">
                    <div class="flex justify-center">
                      <span class="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        {{ user.role.display_name }}
                      </span>
                    </div>
                  </td>
                  <td class="px-8 py-5">
                    <div class="flex justify-center items-center">
                       @if (user.is_active) {
                         <span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 text-[11px] font-bold border border-green-100 shrink-0">
                           <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                           Activo
                         </span>
                       } @else {
                         <span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-400 text-[11px] font-bold border border-slate-200 shrink-0">
                           Inactivo
                         </span>
                       }
                    </div>
                  </td>
                  <td class="px-8 py-5">
                    <div class="flex items-center justify-end gap-2">
                       <button (click)="toggleStatus(user)" title="Cambiar Estado" class="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all active:scale-95">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                         <span class="text-[11px] font-bold uppercase tracking-wider">Estado</span>
                       </button>
                       <button (click)="editUser(user)" title="Editar" class="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all active:scale-95">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                         <span class="text-[11px] font-bold uppercase tracking-wider">Editar</span>
                       </button>
                       <button (click)="deleteUser(user)" title="Eliminar" class="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all active:scale-95">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                         <span class="text-[11px] font-bold uppercase tracking-wider">Eliminar</span>
                       </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                   <td colspan="4" class="px-8 py-20 text-center">
                      <div class="flex flex-col items-center gap-3">
                         <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                           <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                         </div>
                         <p class="text-slate-500 font-bold">No se encontraron usuarios</p>
                         <p class="text-xs text-slate-400">Intenta ajustar los criterios de búsqueda</p>
                      </div>
                   </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Footer / Pagination -->
        <div class="px-8 py-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mostrando {{ filteredUsers().length }} registros</p>
            <div class="flex items-center gap-1.5" *ngIf="totalPages() > 1">
               <button (click)="prevPage()" [disabled]="currentPage() === 1" class="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-40">
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
               </button>
               <div class="flex items-center gap-1">
                 @for (p of pageNumbers(); track p) {
                    <button 
                      (click)="goToPage(p)"
                      [class]="p === currentPage() ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'"
                      class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all">
                      {{ p }}
                    </button>
                 }
               </div>
               <button (click)="nextPage()" [disabled]="currentPage() === totalPages()" class="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-40">
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
               </button>
            </div>
        </div>
      </div>
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private messageService = inject(MessageService);

  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  roles = signal<Role[]>([]);
  searchTerm = '';
  loading = signal(false);
  saving = signal(false);
  showModal = signal(false);
  editingUserId   = signal<number | null>(null);
  editingUserCode = signal<string | null>(null);
  showPassword = signal(false);
  showPin = signal(false);

  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  userForm = signal({
    name: '',
    last_name: '',
    phone: '',
    role_id: undefined as number | undefined,
    password: '',
    pin: ''
  });

  activeCount = computed(() => this.users().filter(u => u.is_active).length);
  inactiveCount = computed(() => this.users().filter(u => !u.is_active).length);
  selectedRole = computed(() => {
    const roleId = this.userForm().role_id;
    return this.roles().find(r => r.id === roleId);
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadRoles(): void {
    this.roleService.getRoles().subscribe(roles => this.roles.set(roles));
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService.getUsers({ page: this.currentPage(), search: this.searchTerm })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.users.set(response.data || []);
          this.totalItems.set(response.total || response.length);
          this.totalPages.set(response.last_page || 1);
          // Only filter locally if search term is small, otherwise backend handled it
          this.applyFilters();
        },
        error: (err) => {
          console.error('Error loading users', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios' });
        }
      });
  }

  openCreateModal(): void {
    this.editingUserId.set(null);
    this.userForm.set({
      name: '',
      last_name: '',
      phone: '',
      role_id: undefined,
      password: '',
      pin: ''
    });
    this.showPassword.set(false);
    this.showPin.set(false);
    this.showModal.set(true);
  }

  editUser(user: User): void {
    this.editingUserId.set(user.id);
    this.editingUserCode.set(user.pollster_code ?? null);
    this.userForm.set({
      name: user.name,
      last_name: user.last_name || '',
      phone: user.phone || '',
      role_id: user.role_id,
      password: '', // Password is not returned for security
      pin: ''      // PIN is not returned for security
    });
    this.showPassword.set(false);
    this.showPin.set(false);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingUserId.set(null);
    this.editingUserCode.set(null);
  }

  onRoleChange(): void {
    // Force computed update if needed
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadUsers();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  updateRole(roleId: any): void {
    this.userForm.update(f => ({ ...f, role_id: Number(roleId) }));
  }

  updatePhone(phone: any): void {
    this.userForm.update(f => ({ ...f, phone }));
  }

  updatePin(pin: any): void {
    this.userForm.update(f => ({ ...f, pin }));
  }

  saveUser(): void {
    const data = this.userForm();
    
    // Explicit validation feedback
    if (!data.name) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El nombre es obligatorio' });
      return;
    }
    if (!data.phone || data.phone.length !== 10) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El teléfono debe tener exactamente 10 dígitos' });
      return;
    }
    if (!data.role_id) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Debes seleccionar un rol' });
      return;
    }

    // Additional role-based validation
    const roleIsEncuestador = this.selectedRole()?.name?.toLowerCase()?.trim() === 'encuestador';
    const isEditing = this.editingUserId() !== null;

    if (roleIsEncuestador && !isEditing) {
      if (!data.pin || data.pin.length !== 4) {
        this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'El PIN debe tener 4 dígitos numéricos' });
        return;
      }
    } else if (!isEditing) {
      if (!data.password) {
        this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'La contraseña es obligatoria para este rol' });
        return;
      }
    }

    this.saving.set(true);
    const request = isEditing 
      ? this.userService.updateUser(this.editingUserId()!, data)
      : this.userService.createUser(data);

    request
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: '¡Éxito!', detail: isEditing ? 'Usuario actualizado' : 'Usuario creado correctamente' });
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => {
          console.error('Error saving user', err);
          this.showValidationError(err);
        }
      });
  }

  private showValidationError(err: any): void {
    let detail = 'Error al procesar la solicitud.';
    if (err.error?.errors) {
      const errors = err.error.errors;
      const firstKey = Object.keys(errors)[0];
      detail = errors[firstKey][0];
    } else if (err.error?.message) {
      detail = err.error.message;
    }
    this.messageService.add({ severity: 'error', summary: 'Error de Validación', detail });
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.currentPage.set(1);
    this.loadUsers();
  }

  applyFilters(): void {
    // Basic local filtering if needed, but loadUsers(search) is preferred
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredUsers.set(this.users());
      return;
    }
    const filtered = this.users().filter(u => 
      u.name.toLowerCase().includes(term) || 
      (u.last_name?.toLowerCase().includes(term)) ||
      (u.role?.display_name.toLowerCase().includes(term))
    );
    this.filteredUsers.set(filtered);
  }

  toggleStatus(user: User): void {
    this.userService.toggleActive(user.id).subscribe(() => {
      user.is_active = !user.is_active;
      this.users.set([...this.users()]);
      this.applyFilters();
    });
  }

  deleteUser(user: User): void {
    if (confirm(`¿Estás seguro de eliminar a ${user.name}?`)) {
      this.userService.deleteUser(user.id).subscribe(() => {
        this.users.set(this.users().filter(u => u.id !== user.id));
        this.applyFilters();
      });
    }
  }
}
