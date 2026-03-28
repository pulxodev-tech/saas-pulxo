// Triggering recompile - Hierarchy Step Roadmap implementation
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { HierarchyService, Group, HierarchyNode, GroupMember } from './hierarchy.service';
import { HasPermissionDirective } from '../../core/permissions/has-permission.directive';
import { finalize } from 'rxjs';

type ActiveTab = 'tree' | 'groups' | 'assign' | 'members' | 'location';

@Component({
  selector: 'app-hierarchy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HasPermissionDirective],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">

      <!-- Header Section -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 class="text-3xl font-black text-slate-800 tracking-tight">Estructura Operativa</h2>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Organización</span>
            <div class="h-1 w-1 rounded-full bg-slate-300"></div>
            <p class="text-sm text-blue-600 font-semibold italic">Coordinadores → Supervisores → Grupos</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <div class="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm flex">
            @for (tab of tabs; track tab.key) {
              <button
                (click)="activeTab.set(tab.key)"
                class="px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                [class.bg-blue-600]="activeTab() === tab.key"
                [class.text-white]="activeTab() === tab.key"
                [class.shadow-lg]="activeTab() === tab.key"
                [class.shadow-blue-200]="activeTab() === tab.key"
                [class.text-slate-400]="activeTab() !== tab.key"
                [class.hover:text-slate-600]="activeTab() !== tab.key"
              >
                {{ tab.label }}
              </button>
            }
          </div>
          
          <button
            *hasPermission="'hierarchy.manage'"
            (click)="activeTab.set('assign')"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
            Asignar
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="min-h-[500px]">
        
        <!-- ── Tab: Por Ciudad (Paso 4) ──────────────────────────────────────── -->
        @if (activeTab() === 'location') {
          <div class="space-y-10 animate-in slide-in-from-right-4 duration-500 pb-20">
            
            <!-- Context Header & Filter -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div>
                  <h3 class="text-2xl font-black text-slate-800 tracking-tight">Mapa por Ciudades</h3>
                  <p class="text-sm text-slate-400 mt-1">Visualiza y filtra tus grupos según su ubicación geográfica.</p>
               </div>
               
               <div class="relative min-w-[300px]">
                  <input 
                    [ngModel]="cityViewFilter()" 
                    (ngModelChange)="cityViewFilter.set($event)"
                    type="text" 
                    placeholder="Buscar por grupo o ciudad..."
                    class="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all outline-none pl-12 shadow-sm"
                  />
                  <svg class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               </div>
            </div>

            <!-- Cities Grid -->
            @for (city of groupsByCity(); track city.name) {
               <div class="space-y-6">
                  <div class="flex items-center gap-4">
                     <div class="h-px flex-1 bg-slate-100"></div>
                     <div class="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <span class="text-xs font-black text-slate-700 uppercase tracking-widest">{{ city.name }}</span>
                        <span class="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-black">{{ city.groups.length }}</span>
                     </div>
                     <div class="h-px flex-1 bg-slate-100"></div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     @for (group of city.groups; track group.id) {
                        <div (click)="gestionarGrupo(group)" class="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group/card relative overflow-hidden">
                           <div class="absolute top-0 right-0 p-3">
                              <span class="w-2 h-2 rounded-full" [class.bg-green-500]="group.is_active" [class.bg-slate-300]="!group.is_active"></span>
                           </div>
                           
                           <h4 class="text-lg font-black text-slate-800 mb-1 group-hover/card:text-blue-600 transition-colors">{{ group.name }}</h4>
                           <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{{ group.members_count || 0 }} Encuestadores</p>
                           
                           <div class="mt-4 flex items-center justify-between">
                              <div class="flex items-center gap-2">
                                 <!-- Supervisor Badge -->
                                 <div class="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                    <svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                    <span class="text-[8px] font-black text-blue-700 uppercase leading-none">Sup</span>
                                 </div>
                                 
                                 <!-- Members Badge -->
                                 <div class="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                    <span class="text-[8px] font-black text-slate-500 uppercase leading-none">+{{ group.members_count || 0 }}</span>
                                 </div>
                              </div>
                              <svg class="w-5 h-5 text-slate-200 group-hover/card:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                           </div>
                        </div>
                     }
                  </div>
               </div>
            } @empty {
               <div class="py-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                  <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-4 mx-auto shadow-sm">
                     <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <h4 class="text-xl font-black text-slate-400 tracking-tight">Sin resultados para la búsqueda</h4>
                  <p class="text-sm text-slate-400 mt-1">Intenta con otro término o ciudad.</p>
               </div>
            }
          </div>
        }

        <!-- ── Tab: Árbol jerárquico ────────────────────────────────────────── -->
        @if (activeTab() === 'tree') {
          <div class="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            @if (loading()) {
               <div class="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-slate-100 shadow-sm">
                 <div class="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                 <p class="text-slate-400 font-bold text-sm uppercase tracking-widest">Sincronizando jerarquía...</p>
               </div>
            } @else if (tree().length === 0) {
              <div class="bg-white rounded-[32px] border border-slate-100 p-12 shadow-sm text-center">
                 <div class="max-w-md mx-auto">
                   <div class="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-6 mx-auto">
                     <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                   </div>
                   <h3 class="text-2xl font-black text-slate-800 tracking-tight">Estructura No Iniciada</h3>
                   <p class="text-sm text-slate-400 mt-2 mb-10">Sigue estos pasos en orden para configurar tu operación de campo:</p>
                   
                   <div class="space-y-4 text-left">
                     <button (click)="activeTab.set('groups')" class="w-full p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:border-blue-100 hover:bg-blue-50 transition-all group">
                       <span class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 font-bold flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">1</span>
                       <div>
                         <p class="text-sm font-bold text-slate-700">Crear Grupos de Trabajo</p>
                         <p class="text-[11px] text-slate-400">Define los equipos o zonas operativas.</p>
                       </div>
                     </button>
                     <button (click)="activeTab.set('assign')" class="w-full p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:border-blue-100 hover:bg-blue-50 transition-all group">
                       <span class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 font-bold flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">2</span>
                       <div>
                         <p class="text-sm font-bold text-slate-700">Asignar Responsables</p>
                         <p class="text-[11px] text-slate-400">Vincula Coordinadores y Supervisores a cada grupo.</p>
                       </div>
                     </button>
                     <button (click)="activeTab.set('members')" class="w-full p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:border-blue-100 hover:bg-blue-50 transition-all group">
                       <span class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 font-bold flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">3</span>
                       <div>
                         <p class="text-sm font-bold text-slate-700">Cargar Equipo de Campo</p>
                         <p class="text-[11px] text-slate-400">Suma a los encuestadores a sus respectivos grupos.</p>
                       </div>
                     </button>
                     <button (click)="activeTab.set('location')" class="w-full p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:border-blue-100 hover:bg-blue-50 transition-all group">
                       <span class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 font-bold flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">4</span>
                       <div>
                         <p class="text-sm font-bold text-slate-700">Explorar por Ciudad</p>
                         <p class="text-[11px] text-slate-400">Visualiza la carga operativa por regiones.</p>
                       </div>
                     </button>
                   </div>
                 </div>
              </div>
            } @else {
              @for (coordinator of tree(); track coordinator.id) {
                <div class="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden group/coord">
                  <!-- Coordinator Header -->
                  <div class="p-8 flex flex-col md:flex-row md:items-center gap-6 border-b border-slate-50 bg-gradient-to-r from-blue-50/50 to-transparent">
                    <div class="w-16 h-16 rounded-[22px] bg-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-200 group-hover/coord:rotate-3 transition-transform">
                      {{ coordinator.name.charAt(0) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-wider">Coordinador</span>
                        <div class="h-1 w-1 rounded-full bg-blue-200"></div>
                        <span class="text-xs text-slate-400 font-medium italic">{{ coordinator.email }}</span>
                      </div>
                      <h4 class="text-xl font-black text-slate-800 tracking-tight">{{ coordinator.name }}</h4>
                    </div>
                    <div class="flex items-center gap-6">
                       <div class="text-right">
                         <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Control Directo</p>
                         <p class="text-lg font-bold text-slate-700">{{ coordinator.supervisors.length }} Supervisores</p>
                       </div>
                       <button class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all">
                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                       </button>
                    </div>
                  </div>

                  <!-- Supervisors Grid -->
                  <div class="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/30">
                    @for (supervisor of coordinator.supervisors; track supervisor.id) {
                      <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group/sup">
                          <div class="flex items-center justify-between gap-4 mb-5">
                            <div class="flex items-center gap-4">
                              <div class="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold group-hover/sup:bg-blue-50 group-hover/sup:text-blue-600 transition-colors">
                                {{ supervisor.name.charAt(0) }}
                              </div>
                              <div class="min-w-0">
                                <p class="text-[11px] font-black text-blue-500 uppercase tracking-tighter mb-0.5 leading-none">Supervisor</p>
                                <p class="text-sm font-bold text-slate-800 truncate">{{ supervisor.name }}</p>
                              </div>
                            </div>
                            
                            <button 
                              (click)="removeSupervisor(coordinator.id, supervisor.id)"
                              class="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all opacity-0 group-hover/sup:opacity-100"
                              title="Desvincular supervisor de este coordinador"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>

                        <div class="space-y-2">
                           <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">Grupos Operativos</p>
                           @for (group of supervisor.groups; track group.id) {
                             <div 
                               (click)="openGroup(group.id)"
                                class="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 hover:bg-blue-50 text-sm font-semibold text-slate-600 hover:text-blue-700 transition-all cursor-pointer border border-transparent hover:border-blue-100 group/item"
                              >
                                 <div class="flex items-center gap-2" (click)="openGroup(group.id)">
                                   <div class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                                   {{ group.name }}
                                 </div>
                                 <div class="flex items-center gap-2">
                                   <span class="text-[10px] bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm">{{ group.members_count }} enc.</span>
                                   <button 
                                     (click)="$event.stopPropagation(); removeAssignment(group.hierarchy_id)"
                                     class="w-6 h-6 rounded-lg bg-white text-slate-300 hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover/item:opacity-100 shadow-sm border border-slate-100"
                                     title="Quitar de esta jerarquía"
                                   >
                                     <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                   </button>
                                 </div>
                              </div>
                           }
                           @if (supervisor.groups.length === 0) {
                             <div class="py-4 text-center">
                               <p class="text-xs text-slate-300 italic">Sin grupos asignados</p>
                             </div>
                           }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        }

        <!-- ── Tab: Grupos ──────────────────────────────────────────────────── -->
        @if (activeTab() === 'groups') {
          <div class="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div class="relative w-full max-w-sm group">
                  <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Buscar grupos..."
                    class="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all shadow-sm"
                    (input)="onGroupSearch($event)"
                  >
               </div>
               
                <button
                  *hasPermission="'hierarchy.manage'"
                  (click)="startCreateGroup()"
                  class="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                  Nuevo Grupo
                </button>
            </div>

            <!-- New Group Modal/Form (Simplified in-page) -->
            @if (showGroupForm()) {
              <div class="bg-blue-600 rounded-[32px] p-8 shadow-xl shadow-blue-100 animate-in zoom-in-95 duration-300 text-white">
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h4 class="text-xl font-black tracking-tight">
                      {{ editingGroupId() ? 'Editar Grupo' : 'Crear Nuevo Grupo' }}
                    </h4>
                    <p class="text-blue-100 text-xs">
                      {{ editingGroupId() ? 'Modifica los detalles del equipo operativo.' : 'Define un nuevo equipo operativo para los encuestadores.' }}
                    </p>
                  </div>
                  <button (click)="cancelGroupEdit()" class="text-blue-200 hover:text-white transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                
                <form [formGroup]="groupForm" (ngSubmit)="saveGroup()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black uppercase tracking-widest text-blue-100 opacity-80">Nombre del Grupo (Auto)</label>
                    <div class="relative">
                      <input formControlName="name" type="text" [readonly]="true"
                        class="w-full bg-blue-500/30 border border-blue-400/50 rounded-2xl px-5 py-3.5 text-white placeholder:text-blue-200/50 focus:ring-0 focus:border-white transition-all outline-none cursor-not-allowed" />
                      <svg class="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-blue-200/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </div>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black uppercase tracking-widest text-blue-100 opacity-80">Ciudad o Municipio</label>
                    <div class="relative">
                      <select formControlName="location"
                        class="w-full bg-blue-500/30 border border-blue-400/50 rounded-2xl px-5 py-3.5 text-white placeholder:text-blue-200/50 focus:ring-0 focus:border-white transition-all outline-none appearance-none cursor-pointer">
                        <option value="" disabled selected class="text-slate-800">Seleccionar Ciudad</option>
                        @for (city of cities; track city) {
                          <option [value]="city" class="text-slate-800">{{ city }}</option>
                        }
                      </select>
                      <svg class="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-blue-200/50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </div>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black uppercase tracking-widest text-blue-100 opacity-80">Descripción Corta</label>
                    <input formControlName="description" type="text"
                      class="w-full bg-blue-500/30 border border-blue-400/50 rounded-2xl px-5 py-3.5 text-white placeholder:text-blue-200/50 focus:ring-0 focus:border-white transition-all outline-none"
                      placeholder="Ej: Operativo Central" />
                  </div>
                  <div class="md:col-span-2 flex justify-end gap-3 pt-2">
                    @if (editingGroupId()) {
                      <button type="button" (click)="cancelGroupEdit()"
                        class="bg-blue-500/50 text-white px-6 py-3.5 rounded-2xl text-sm font-bold hover:bg-blue-500 transition-all">
                        Cancelar
                      </button>
                    }
                    <button type="submit" [disabled]="groupForm.invalid"
                      class="bg-white text-blue-600 px-8 py-3.5 rounded-2xl text-sm font-black shadow-lg hover:bg-blue-50 transition-all disabled:opacity-50 active:scale-95">
                      {{ editingGroupId() ? 'Guardar Cambios' : 'Confirmar y Crear' }}
                    </button>
                  </div>
                </form>
              </div>
            }

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               @for (group of groups(); track group.id) {
                 <div class="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group">
                    <div class="flex items-center justify-between mb-4">
                       <span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                          [class.bg-green-50]="group.is_active" [class.text-green-600]="group.is_active"
                          [class.bg-slate-100]="!group.is_active" [class.text-slate-400]="!group.is_active">
                          {{ group.is_active ? 'Operativo' : 'Inactivo' }}
                       </span>
                       <div class="flex gap-2">
                          <button (click)="editGroup(group)" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button (click)="toggleGroupActive(group)" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-all">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                          </button>
                       </div>
                    </div>
                    
                    <h4 class="text-2xl font-black text-blue-600 tracking-tight group-hover:text-blue-700 transition-colors mb-1">{{ group.name }}</h4>
                    <div class="flex items-center gap-2 mb-4">
                      <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{{ group.location || 'Sin ubicación' }}</p>
                    </div>
                    <p class="text-xs text-slate-500 line-clamp-2 min-h-[32px]">{{ group.description ?? 'Sin descripción adicional' }}</p>
                    
                    <div class="mt-8 flex items-center justify-between">
                       <div class="flex items-center gap-3">
                          <!-- Supervisor Badge -->
                          <div class="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                             <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                             <span class="text-[9px] font-black text-blue-700 uppercase leading-none">Supervisor</span>
                          </div>
                          
                          <!-- Members Badge -->
                          <div class="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                             <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                             <span class="text-[9px] font-black text-slate-500 uppercase leading-none">{{ group.members_count || 0 }} Equipo</span>
                          </div>
                       </div>
                       
                       <button (click)="gestionarGrupo(group)" class="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1 group/btn">
                         Gestionar
                         <svg class="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                       </button>
                    </div>
                 </div>
               } @empty {
                 <div class="col-span-full py-20 text-center">
                    <p class="text-slate-300 font-black uppercase tracking-widest">Sin grupos disponibles</p>
                 </div>
               }
            </div>
          </div>
        }

        <!-- ── Tab: Asignación (Paso 2) ──────────────────────────────────────── -->
        @if (activeTab() === 'assign') {
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in slide-in-from-right-4 duration-500">
            
            <!-- Selector de Grupo (Sidebar) -->
            <div class="lg:col-span-1 space-y-6">
              <div class="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm h-full flex flex-col">
                <div class="mb-6 flex items-center justify-between">
                  <h4 class="text-lg font-black text-slate-800">Grupos</h4>
                  <div class="bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 flex items-center gap-2">
                    <span class="text-[9px] font-black text-blue-600 uppercase">{{ getAssignedCount() }}/{{ groups().length }}</span>
                  </div>
                </div>
                
                <div class="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[600px]">
                  @for (grp of groups(); track grp.id) {
                    @let assignment = getAssignmentForGroup(grp.id);
                    <button 
                      (click)="selectGroupForAssign(grp)"
                      class="w-full p-4 rounded-2xl border text-left transition-all relative group/item"
                      [class.border-blue-600]="selectedGroupIdForAssign() === grp.id"
                      [class.bg-blue-50]="selectedGroupIdForAssign() === grp.id"
                      [class.border-slate-100]="selectedGroupIdForAssign() !== grp.id"
                      [class.hover:bg-slate-50]="selectedGroupIdForAssign() !== grp.id"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <div class="min-w-0">
                          <p class="text-xs font-black truncate" [class.text-blue-700]="selectedGroupIdForAssign() === grp.id" [class.text-slate-700]="selectedGroupIdForAssign() !== grp.id">
                            {{ grp.name }}
                          </p>
                          <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                            {{ assignment ? (assignment.supName | slice:0:15) + '...' : 'Pendiente' }}
                          </p>
                        </div>
                        @if (assignment) {
                          <span class="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                        } @else {
                          <span class="w-1.5 h-1.5 rounded-full bg-slate-200 flex-shrink-0"></span>
                        }
                      </div>
                    </button>
                  } @empty {
                    <div class="py-10 text-center">
                      <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest">Sin grupos</p>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Panel de Detalle (Centro de Mando) -->
            <div class="lg:col-span-3">
              @if (selectedGroupIdForAssign()) {
                @let activeGrp = groups().find(g => g.id === selectedGroupIdForAssign());
                @let assignment = getAssignmentForGroup(selectedGroupIdForAssign()!);

                <div class="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                  <!-- Header del Detalle -->
                  <div class="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div>
                      <h4 class="text-2xl font-black text-slate-800 tracking-tight">{{ activeGrp?.name }}</h4>
                      <p class="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Gestión de Mandos y Equipo</p>
                    </div>
                    @if (assignment) {
                      <div class="flex gap-2">
                        <button (click)="startAssign(selectedGroupIdForAssign()!)" class="px-5 py-2.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black text-blue-600 uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                          Cambiar Mandos
                        </button>
                        <button (click)="removeAssignment(assignment.hierarchyId)" class="w-10 h-10 bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all shadow-sm">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    }
                  </div>

                  <div class="p-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <!-- Lado Izquierdo: Mandos -->
                      <div class="space-y-6">
                        <h5 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Vínculo de Mandos</h5>
                        
                        @if (editingGroupIdForAssign() === selectedGroupIdForAssign()) {
                          <form [formGroup]="assignForm" (ngSubmit)="assign()" class="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100 space-y-5 animate-in slide-in-from-top-4">
                            <div class="space-y-2">
                              <label class="text-[10px] font-black uppercase text-blue-600 tracking-widest pl-1">Coordinador Principal</label>
                              <select formControlName="coordinator_id" class="w-full bg-white border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm focus:border-blue-300 outline-none transition-all">
                                <option value="">Seleccionar Coordinador...</option>
                                @for (c of coordinators(); track c.id) {
                                  <option [value]="c.id">{{ c.name }} {{ c.last_name }}</option>
                                }
                              </select>
                            </div>
                            <div class="space-y-2">
                              <label class="text-[10px] font-black uppercase text-blue-600 tracking-widest pl-1">Supervisor de Grupo</label>
                              <select formControlName="supervisor_id" class="w-full bg-white border-2 border-transparent rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm focus:border-blue-300 outline-none transition-all">
                                <option value="">Seleccionar Supervisor...</option>
                                @for (s of availableSupervisors(); track s.id) {
                                  <option [value]="s.id">{{ s.name }} {{ s.last_name }}</option>
                                }
                              </select>
                            </div>
                            <div class="flex gap-3 pt-2">
                               <button type="submit" [disabled]="assignForm.invalid || assignLoading()" class="flex-1 py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
                                 {{ editingHierarchyId() ? 'Guardar Cambios' : 'Vincular Ahora' }}
                               </button>
                               <button type="button" (click)="cancelAssign()" class="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all">
                                 Cancelar
                               </button>
                            </div>
                            @if (assignError()) {
                               <p class="text-[10px] text-red-500 font-bold bg-white/50 p-3 rounded-xl border border-red-100">{{ assignError() }}</p>
                            }
                          </form>
                        } @else if (assignment) {
                          <div class="space-y-4">
                             <div class="p-6 rounded-[28px] bg-slate-50 border border-slate-100 flex items-center gap-5">
                                <div class="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600">
                                   <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                </div>
                                <div>
                                   <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Coordinador</p>
                                   <p class="text-base font-black text-slate-800">{{ assignment.coordName }}</p>
                                </div>
                             </div>
                             <div class="p-6 rounded-[28px] bg-slate-50 border border-slate-100 flex items-center gap-5">
                                <div class="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600">
                                   <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                </div>
                                <div>
                                   <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Supervisor</p>
                                   <p class="text-base font-black text-slate-800">{{ assignment.supName }}</p>
                                </div>
                             </div>
                          </div>
                        } @else {
                          <div class="bg-indigo-50/30 border-2 border-dashed border-indigo-100 rounded-[32px] p-10 text-center flex flex-col items-center">
                             <div class="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-300 mb-4 text-2xl font-black italic">?</div>
                             <p class="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6">Requiere Vinculación</p>
                             <button (click)="startAssign(selectedGroupIdForAssign()!)" class="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                               Vincular Grupo
                             </button>
                          </div>
                        }
                      </div>

                      <!-- Lado Derecho: Equipo de Campo -->
                      <div class="space-y-6">
                        <div class="flex items-center justify-between pl-1">
                          <h5 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Equipo de Campo</h5>
                          <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{{ assignment?.members?.length || 0 }} activos</span>
                        </div>

                        @if (assignment) {
                          <div class="space-y-4">
                            <!-- Selector Rápido -->
                            <div class="relative">
                               <select #quickSelect (change)="addMemberToGroup(selectedGroupIdForAssign()!, +quickSelect.value); quickSelect.value = ''"
                                 class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-600 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-100">
                                  <option value="" disabled selected>+ Sumar Encuestador</option>
                                  @for (e of availableEncuestadores(); track e.id) {
                                     <option [value]="e.id">{{ e.name }} {{ e.last_name }}</option>
                                  }
                               </select>
                               <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                               </div>
                            </div>

                            <!-- Lista de Miembros -->
                            <div class="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                               @for (m of assignment.members; track m.id) {
                                  <div class="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 group/mem hover:border-blue-200 transition-all">
                                     <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                                           {{ m.name.charAt(0) }}
                                        </div>
                                        <span class="text-xs font-bold text-slate-700">{{ m.name }}</span>
                                     </div>
                                     <button (click)="removeMemberFromGroup(selectedGroupIdForAssign()!, m.id)" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover/mem:opacity-100 transition-all">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                     </button>
                                  </div>
                               } @empty {
                                  <div class="py-12 border-2 border-dashed border-slate-50 rounded-[32px] text-center">
                                     <p class="text-[10px] text-slate-300 font-black uppercase tracking-widest">Sin miembros asignados</p>
                                  </div>
                               }
                            </div>
                          </div>
                        } @else {
                          <div class="p-10 text-center bg-slate-50 rounded-[32px] border border-slate-100">
                             <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-loose">Debes vincular responsables<br>para gestionar el equipo</p>
                          </div>
                        }
                      </div>

                    </div>
                  </div>
                </div>

              } @else {
                <div class="bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100 h-full min-h-[500px] flex flex-col items-center justify-center p-12 text-center">
                   <div class="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-200 mb-8">
                     <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                   </div>
                   <h5 class="text-xl font-black text-slate-800 tracking-tight">Selecciona un Grupo Operativo</h5>
                   <p class="text-sm text-slate-400 mt-2 max-w-xs mx-auto">Elige un grupo de la lista de la izquierda para gestionar su línea de mando y equipo de campo.</p>
                </div>
              }
            </div>

          </div>
        }

        <!-- ── Tab: Miembros (Paso 3) ────────────────────────────────────────── -->
        @if (activeTab() === 'members') {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4 duration-500">
            <!-- Selector de Grupo -->
            <div class="lg:col-span-1 space-y-6">
              <div class="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                <h4 class="text-lg font-black text-slate-800 mb-6">Selecciona Grupo</h4>
                <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  @for (g of groups(); track g.id) {
                    <button 
                      (click)="selectGroupForMembers(g)"
                      class="w-full p-4 rounded-2xl border text-left transition-all"
                      [class.border-blue-600]="selectedGroupId() === g.id"
                      [class.bg-blue-50]="selectedGroupId() === g.id"
                      [class.border-slate-100]="selectedGroupId() !== g.id"
                      [class.hover:bg-slate-50]="selectedGroupId() !== g.id"
                    >
                      <p class="text-sm font-bold" [class.text-blue-700]="selectedGroupId() === g.id" [class.text-slate-700]="selectedGroupId() !== g.id">{{ g.name }}</p>
                      <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{{ g.members_count || 0 }} encuestadores</p>
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Gestión de Miembros -->
            <div class="lg:col-span-2 space-y-6">
              @if (selectedGroupId()) {
                <div class="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animte-in fade-in">
                  <div class="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h4 class="text-xl font-black text-slate-800">{{ selectedGroupName() }}</h4>
                      <p class="text-xs text-slate-400">Gestiona el equipo de campo asignado a este grupo.</p>
                    </div>
                  </div>

                  <div class="p-8">
                    <!-- Buscador de Encuestadores Libres -->
                    <div class="relative mb-8">
                       <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Agregar Encuestador</label>
                       <div class="flex gap-3">
                          <select #memberSelect
                            class="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer">
                            <option value="">Seleccionar encuestador activo...</option>
                            @for (e of availableEncuestadores(); track e.id) {
                              <option [value]="e.id">{{ e.name }} {{ e.last_name }} ({{ e.phone }})</option>
                            }
                          </select>
                          <button (click)="loadDropdowns()" class="w-12 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm" title="Refrescar lista">
                             <svg class="w-5 h-5" [class.animate-spin]="loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                          </button>
                          <button 
                            (click)="addMember(memberSelect.value); memberSelect.value = ''"
                            class="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                          >
                            Sumar a este grupo
                          </button>
                       </div>
                    </div>

                    <!-- Lista de Miembros Actuales -->
                    <div class="space-y-3">
                       <h5 class="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Equipo del Grupo ({{ groupMembers().length }})</h5>
                       @for (member of groupMembers(); track member.id) {
                         <div class="flex items-center justify-between p-4 rounded-[22px] bg-slate-50 border border-slate-100 group">
                            <div class="flex items-center gap-4">
                               <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 font-bold shadow-sm">
                                  {{ member.name.charAt(0) }}
                               </div>
                               <div>
                                  <p class="text-sm font-bold text-slate-700">{{ member.name }}</p>
                                  <p class="text-[10px] text-blue-500 font-black uppercase">Encuestador</p>
                               </div>
                            </div>
                            <button (click)="removeMember(member.id)" class="w-9 h-9 rounded-xl bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                         </div>
                       } @empty {
                         <div class="py-12 text-center bg-slate-50/50 rounded-[28px] border-2 border-dashed border-slate-100">
                            <p class="text-slate-300 text-xs italic">Aún no hay encuestadores asignados.</p>
                         </div>
                       }
                    </div>
                  </div>
                </div>
              } @else {
                <div class="bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100 h-full flex flex-col items-center justify-center py-20">
                   <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                     <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                   </div>
                   <p class="text-slate-400 font-bold text-sm uppercase tracking-widest">Selecciona un grupo a la izquierda</p>
                </div>
              }
            </div>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
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
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }
    .animate-shake { animation: shake 0.3s ease-in-out; }
  `]
})
export class HierarchyComponent implements OnInit {
  private svc = inject(HierarchyService);
  private fb  = inject(FormBuilder);

  readonly cities = [
    'Barranquilla',
    'Soledad',
    'Santa Marta',
    'Sincelejo',
    'Cartagena'
  ];

  readonly tabs = [
    { key: 'groups' as ActiveTab, label: '1. Grupos' },
    { key: 'assign' as ActiveTab, label: '2. Asignación' },
    { key: 'members' as ActiveTab, label: '3. Equipo' },
    { key: 'location' as ActiveTab, label: '4. Por Ciudad' },
    { key: 'tree' as ActiveTab,   label: 'Estructura Final' },
  ];

  // Filters for city view
  cityViewFilter = signal('');

  groupsByCity = computed(() => {
    const all = this.groups();
    const filter = this.cityViewFilter().toLowerCase();
    
    // Group them
    const grouped: Record<string, Group[]> = {};
    all.forEach(g => {
      const city = g.location || 'Sin Ciudad';
      if (!grouped[city]) grouped[city] = [];
      
      // Apply search filter if any
      const matchesSearch = g.name.toLowerCase().includes(filter) || 
                            city.toLowerCase().includes(filter);
                            
      if (matchesSearch) {
        grouped[city].push(g);
      }
    });
    
    // Sort cities (alphabetical)
    return Object.keys(grouped).sort().map(city => ({
      name: city,
      groups: grouped[city]
    })).filter(c => c.groups.length > 0);
  });

  activeTab    = signal<ActiveTab>('groups');
  loading      = signal(false);
  tree         = signal<HierarchyNode[]>([]);
  groups       = signal<Group[]>([]);
  coordinators = signal<any[]>([]);
  supervisors  = signal<any[]>([]);
  encuestadores = signal<any[]>([]);
  selectedGroupId = signal<number | null>(null);
  selectedGroupName = signal<string>('');
  groupMembers = signal<GroupMember[]>([]);
  showGroupForm = signal(false);
  editingGroupId = signal<number | null>(null);
  assignLoading = signal(false);
  assignError   = signal('');
  editingHierarchyId = signal<number | null>(null);
  editingGroupIdForAssign = signal<number | null>(null);
  selectedGroupIdForAssign = signal<number | null>(null);

  groupForm = this.fb.group({
    name:        ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    location:    ['', [Validators.maxLength(255)]],
  });

  assignForm = this.fb.group({
    coordinator_id: ['', Validators.required],
    supervisor_id:  ['', Validators.required],
    group_id:       ['', Validators.required],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loadTree();
    this.loadGroups();
    this.loadDropdowns();
  }

  loadTree(): void {
    this.loading.set(true);
    this.svc.getTree().pipe(finalize(() => this.loading.set(false))).subscribe({
      next:     t => this.tree.set(t),
      error:    () => {}
    });
  }

  loadGroups(search?: string): void {
    this.svc.getGroups({ search, per_page: 50 }).subscribe({
      next: res => this.groups.set(res.data ?? res),
    });
  }

  loadDropdowns(): void {
    this.svc.getCoordinators().subscribe(c => this.coordinators.set(c));
    this.svc.getSupervisors().subscribe(s => this.supervisors.set(s));
    this.svc.getEncuestadores().subscribe(e => this.encuestadores.set(e));
  }

  // ── Dynamic Filtering ──
  
  availableSupervisors = computed(() => {
    const all = this.supervisors();
    const tree = this.tree();
    const editingGroupId = this.editingGroupIdForAssign();
    
    // Find all assigned supervisor IDs except for the group currently being edited
    const assignedIds = new Set<number>();
    for (const coord of tree) {
      for (const sup of coord.supervisors) {
        // If this supervisor is assigned to THIS group we are editing, we keep him in list
        // Otherwise, if assigned to ANY OTHER group, we exclude
        const isAssignedToOther = sup.groups.some(g => g.id !== editingGroupId);
        if (isAssignedToOther) {
          assignedIds.add(sup.id);
        }
      }
    }
    
    return all.filter(s => !assignedIds.has(s.id));
  });

  availableEncuestadores = computed(() => {
    const all = this.encuestadores();
    const tree = this.tree();
    
    // Find ALL assigned pollster IDs globally
    const assignedIds = new Set<number>();
    for (const coord of tree) {
      for (const sup of coord.supervisors) {
        for (const grp of sup.groups) {
          for (const mem of grp.members || []) {
            assignedIds.add(mem.id);
          }
        }
      }
    }
    
    return all.filter(e => !assignedIds.has(e.id));
  });

  getAssignmentForGroup(groupId: number): any {
    for (const coord of this.tree()) {
      for (const sup of coord.supervisors) {
        for (const grp of sup.groups) {
          if (grp.id === groupId) {
            return {
              coordName: coord.name,
              supName: sup.name,
              hierarchyId: grp.hierarchy_id,
              coordinatorId: coord.id,
              supervisorId: sup.id,
              members: grp.members || []
            };
          }
        }
      }
    }
    return null;
  }

  getAssignedCount(): number {
    let count = 0;
    for (const coord of this.tree()) {
      for (const sup of coord.supervisors) {
        count += sup.groups.length;
      }
    }
    return count;
  }

  // ── Card Management Actions ──

  addMemberToGroup(groupId: number, userId: number): void {
    if (!userId) return;
    this.svc.addMember(groupId, userId).subscribe({
      next: () => {
        this.loadTree(); // Refresh hierarchy data
        this.loadGroups(); // Update counts
      }
    });
  }

  removeMemberFromGroup(groupId: number, userId: number): void {
    this.svc.removeMember(groupId, userId).subscribe({
      next: () => {
        this.loadTree();
        this.loadGroups();
      }
    });
  }

  startAssign(groupId: number): void {
    this.editingGroupIdForAssign.set(groupId);
    const existing = this.getAssignmentForGroup(groupId);
    this.assignError.set('');
    
    if (existing) {
      this.editingHierarchyId.set(existing.hierarchyId);
      this.assignForm.patchValue({
        coordinator_id: existing.coordinatorId,
        supervisor_id: existing.supervisorId,
        group_id: groupId as any
      });
    } else {
      this.editingHierarchyId.set(null);
      this.assignForm.reset({
        group_id: groupId as any,
        coordinator_id: '',
        supervisor_id: ''
      });
    }
  }

  cancelAssign(): void {
    this.editingGroupIdForAssign.set(null);
    this.editingHierarchyId.set(null);
    this.assignForm.reset();
  }

  selectGroupForAssign(group: Group): void {
    this.selectedGroupIdForAssign.set(group.id);
    this.assignError.set('');
    // If not already editing, we just reset state
    if (this.editingGroupIdForAssign() !== group.id) {
       this.editingGroupIdForAssign.set(null);
    }
  }

  selectGroupForMembers(group: Group): void {
    this.selectedGroupId.set(group.id);
    this.selectedGroupName.set(group.name);
    this.loadGroupMembers(group.id);
  }

  loadGroupMembers(groupId: number): void {
    this.svc.getGroupMembers(groupId).subscribe(m => this.groupMembers.set(m));
  }

  addMember(userIdStr: string): void {
    const userId = parseInt(userIdStr);
    if (!userId || !this.selectedGroupId()) return;
    this.svc.addMember(this.selectedGroupId()!, userId).subscribe({
      next: () => {
        this.loadGroupMembers(this.selectedGroupId()!);
        this.loadTree(); // CRITICAL: Refresh to update available list
        this.loadGroups(); // Update counts
      }
    });
  }

  removeMember(userId: number): void {
    if (!this.selectedGroupId()) return;
    this.svc.removeMember(this.selectedGroupId()!, userId).subscribe({
      next: () => {
        this.loadGroupMembers(this.selectedGroupId()!);
        this.loadTree(); // CRITICAL: Refresh to update available list
        this.loadGroups(); // Update counts
      }
    });
  }

  onGroupSearch(e: Event): void {
    this.loadGroups((e.target as HTMLInputElement).value);
  }

  openGroup(groupId: number): void {
    // Phase 2 Detail view expansion point
    console.log('Open group detail', groupId);
  }

  saveGroup(): void {
    if (this.groupForm.invalid) return;
    const val = this.groupForm.getRawValue();
    const data = { 
      name: val.name!, 
      description: val.description ?? undefined,
      location: val.location ?? undefined
    };
    
    const obs = this.editingGroupId() 
      ? this.svc.updateGroup(this.editingGroupId()!, data)
      : this.svc.createGroup(data);

    obs.subscribe({
      next: () => {
        this.showGroupForm.set(false);
        this.editingGroupId.set(null);
        this.groupForm.reset();
        this.loadGroups();
      },
    });
  }

  startCreateGroup(): void {
    this.editingGroupId.set(null);
    const nextNum = this.groups().length + 1;
    this.groupForm.reset({
      name: `Grupo ${nextNum}`,
      description: '',
      location: ''
    });
    this.showGroupForm.set(true);
  }

  editGroup(group: Group): void {
    this.editingGroupId.set(group.id);
    this.groupForm.patchValue({
      name: group.name,
      description: group.description,
      location: group.location
    });
    this.showGroupForm.set(true);
  }

  gestionarGrupo(group: Group): void {
    this.activeTab.set('assign');
    this.selectedGroupIdForAssign.set(group.id);
  }

  cancelGroupEdit(): void {
    this.showGroupForm.set(false);
    this.editingGroupId.set(null);
    this.groupForm.reset();
  }

  toggleGroupActive(group: Group): void {
    this.svc.updateGroup(group.id, { is_active: !group.is_active }).subscribe({
      next: () => this.loadGroups(),
    });
  }

  assign(): void {
    if (this.assignForm.invalid) return;
    this.assignLoading.set(true);
    this.assignError.set('');
    const v = this.assignForm.value;
    const obs = this.editingHierarchyId() 
      ? this.svc.updateAssignment(this.editingHierarchyId()!, +v.coordinator_id!, +v.supervisor_id!, +v.group_id!)
      : this.svc.assign(+v.coordinator_id!, +v.supervisor_id!, +v.group_id!);

    obs.subscribe({
      next: () => {
        this.assignLoading.set(false);
        this.editingHierarchyId.set(null);
        this.editingGroupIdForAssign.set(null); // Clear inline state
        this.assignForm.reset();
        this.loadTree();
      },
      error: err => {
        this.assignError.set(err.error?.message ?? 'Error al asignar.');
        this.assignLoading.set(false);
      },
    });
  }

  editAssignment(assign: any): void {
    this.editingHierarchyId.set(assign.hierarchy_id);
    this.assignForm.patchValue({
      coordinator_id: String(assign.coordinator_id),
      supervisor_id:  String(assign.supervisor_id),
      group_id:       String(assign.group_id)
    });
    this.activeTab.set('assign');
  }

  cancelEdit(): void {
    this.editingHierarchyId.set(null);
    this.assignForm.reset();
  }

  removeAssignment(hierarchyId: number): void {
    if (!confirm('¿Seguro que deseas quitar este grupo de la jerarquía?')) return;
    this.svc.removeAssignment(hierarchyId).subscribe({
      next: () => {
        this.loadTree();
        this.loadGroups();
      }
    });
  }

  removeSupervisor(coordinatorId: number, supervisorId: number): void {
    if (!confirm('¿Deseas desvincular este supervisor y todos sus grupos de este coordinador?')) return;
    this.svc.removeSupervisor(coordinatorId, supervisorId).subscribe({
      next: () => {
        this.loadTree();
        this.loadGroups();
      }
    });
  }
}
