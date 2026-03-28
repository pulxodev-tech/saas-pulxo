import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { ToolbarModule } from 'primeng/toolbar';
import { SurveyService } from './flow/survey.service';
import { finalize, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-survey-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, TagModule, ButtonModule,
    InputTextModule, SelectModule, DialogModule, DatePickerModule, ToolbarModule
  ],
  template: `
    <div class="min-h-screen bg-[#f8fafc] p-4 lg:p-8 font-['Inter']">
      
      <!-- ── Premium Header & Analytics ────────────────────────────── -->
      <div class="max-w-7xl mx-auto space-y-8">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div class="space-y-1">
            <h1 class="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span class="w-2 h-10 bg-blue-600 rounded-full"></span>
              MONITOREO OPERATIVO
            </h1>
            <p class="text-slate-500 font-medium">Control en tiempo real de levantamiento de información en campo.</p>
          </div>
          <div class="flex items-center gap-3">
            @if (activeTab() === 'complete') {
              <button (click)="startExport()" [disabled]="exportJob()?.status === 'queued' || exportJob()?.status === 'processing'"
                class="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl text-sm font-black transition-all shadow-sm"
                [class.opacity-50]="exportJob()?.status === 'queued' || exportJob()?.status === 'processing'"
                [class.cursor-not-allowed]="exportJob()?.status === 'queued' || exportJob()?.status === 'processing'"
                [class.text-slate-700]="true" [class.hover:bg-slate-50]="true">
                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                EXPORTAR DATA
              </button>
            }
            <button (click)="reload()" class="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>

        <!-- ── Tabs ─────────────────────────────────────────────────── -->
        <div class="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
          <button (click)="setTab('complete')"
            class="px-5 py-2.5 rounded-xl text-sm font-black transition-all"
            [class.bg-white]="activeTab() === 'complete'"
            [class.shadow-sm]="activeTab() === 'complete'"
            [class.text-slate-900]="activeTab() === 'complete'"
            [class.text-slate-500]="activeTab() !== 'complete'">
            Completadas
            <span class="ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full"
              [class.bg-blue-100]="activeTab() === 'complete'"
              [class.text-blue-600]="activeTab() === 'complete'"
              [class.bg-slate-200]="activeTab() !== 'complete'"
              [class.text-slate-500]="activeTab() !== 'complete'">
              {{ activeTab() === 'complete' ? totalCount() : '' }}
            </span>
          </button>
          <button (click)="setTab('incomplete')"
            class="px-5 py-2.5 rounded-xl text-sm font-black transition-all"
            [class.bg-white]="activeTab() === 'incomplete'"
            [class.shadow-sm]="activeTab() === 'incomplete'"
            [class.text-slate-900]="activeTab() === 'incomplete'"
            [class.text-slate-500]="activeTab() !== 'incomplete'">
            Incompletas
            <span class="ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full"
              [class.bg-amber-100]="activeTab() === 'incomplete'"
              [class.text-amber-600]="activeTab() === 'incomplete'"
              [class.bg-slate-200]="activeTab() !== 'incomplete'"
              [class.text-slate-500]="activeTab() !== 'incomplete'">
              {{ activeTab() === 'incomplete' ? totalCount() : '' }}
            </span>
          </button>
        </div>

        <!-- ── Search & Filter ──────────────────────────────────────── -->
        <div class="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
          <div class="flex-1 min-w-[260px] relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input type="text" placeholder="Buscar por celular o nombre del ciudadano..."
              [(ngModel)]="filters.search" (keyup.enter)="reload()"
              class="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none" />
          </div>

          <p-select [options]="groups()" [(ngModel)]="filters.group_id" optionLabel="name" optionValue="id"
            placeholder="Todos los Grupos" [showClear]="true" styleClass="border-none bg-slate-50 rounded-2xl font-bold text-sm h-12 flex items-center px-4" (onChange)="reload()" />

          <p-select [options]="encuestadores()" [(ngModel)]="filters.encuestador_id" optionLabel="name" optionValue="id"
            placeholder="Todos los Encuestadores" [showClear]="true" styleClass="border-none bg-slate-50 rounded-2xl font-bold text-sm h-12 flex items-center px-4" (onChange)="reload()" />

          <p-datepicker [(ngModel)]="dateRange" selectionMode="range" [readonlyInput]="true"
            placeholder="Rango de fechas" styleClass="border-none bg-slate-50 rounded-2xl font-bold text-sm h-12" (onSelect)="onDateSelect()" />

          <button (click)="clearFilters()" class="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors">Limpiar</button>
        </div>

        <!-- ── KPI Cards ────────────────────────────────────────────── -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
             <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-black">
               {{ totalCount() }}
             </div>
             <div>
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total</p>
               <p class="text-xl font-black text-slate-900 mt-1">Encuestas</p>
             </div>
           </div>
           <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
             <div class="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl font-black">
               {{ getUniqueGroups() }}
             </div>
             <div>
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cobertura</p>
               <p class="text-xl font-black text-slate-900 mt-1">Grupos</p>
             </div>
           </div>
           <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
             <div class="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-2xl font-black">
               {{ getWithGpsCount() }}
             </div>
             <div>
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Con Ubicación</p>
               <p class="text-xl font-black text-slate-900 mt-1">Con GPS</p>
             </div>
           </div>
           <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
             <div class="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl font-black">
               {{ getWithoutGpsCount() }}
             </div>
             <div>
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sin Ubicación</p>
               <p class="text-xl font-black text-slate-900 mt-1">Sin GPS</p>
             </div>
           </div>
        </div>

        <!-- ── Data Table ───────────────────────────────────────────── -->
        <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <p-table [value]="surveys()" [loading]="loading()" [paginator]="true" [rows]="12" 
            responsiveLayout="scroll" styleClass="p-datatable-lg"
            [showCurrentPageReport]="true" currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords}">
            
            <ng-template pTemplate="header">
              <tr class="!bg-slate-50/50 border-b border-slate-100">
                <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Ciudadano</th>
                <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Ubicación</th>
                <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Encuestador</th>
                <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Registro</th>
                <th class="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Acción</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-s>
              <tr class="hover:bg-blue-50/30 transition-all duration-300 border-b border-slate-50 overflow-hidden group">
                <td class="p-6">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                      {{ s.respondent_phone?.slice(-2) }}
                    </div>
                    <div class="flex flex-col">
                      <span class="font-black text-slate-800 tracking-tight">{{ s.respondent_phone }}</span>
                      @if (s.respondent_name) {
                        <span class="text-xs font-bold text-slate-500">{{ s.respondent_name }} {{ s.respondent_last_name }}</span>
                      } @else {
                        <span class="text-xs font-bold text-slate-300 italic">Sin nombre</span>
                      }
                    </div>
                  </div>
                </td>
                <td class="p-6">
                  <div class="flex flex-col gap-1">
                    @if (s.encuestador_lat) {
                      <div class="flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-100 rounded-full w-fit">
                        <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        <span class="text-[10px] font-black text-green-700 uppercase tracking-widest">Con GPS</span>
                      </div>
                      <span class="text-[9px] font-mono text-slate-400 pl-1">{{ s.encuestador_lat | number:'1.4-4' }}, {{ s.encuestador_lng | number:'1.4-4' }}</span>
                      @if (geoAddress(s.encuestador_lat, s.encuestador_lng); as addr) {
                        <span class="text-[9px] font-bold text-slate-500 pl-1 leading-tight max-w-[160px] truncate">{{ addr }}</span>
                      }
                    } @else {
                      <div class="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full w-fit">
                        <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                        <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sin GPS</span>
                      </div>
                    }
                    @if (s.address_source === 'gps') {
                      <div class="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full w-fit mt-0.5">
                        <span class="text-[10px]">🏠</span>
                        <span class="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Casa · GPS</span>
                      </div>
                    } @else if (s.address_source === 'maps') {
                      <div class="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full w-fit mt-0.5">
                        <span class="text-[10px]">🗺️</span>
                        <span class="text-[9px] font-black text-blue-700 uppercase tracking-widest">Calle · Maps</span>
                      </div>
                    }
                  </div>
                </td>
                <td class="p-6">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-[10px] font-black text-orange-600 shadow-sm border border-orange-200">
                      {{ (s.encuestador?.name || 'E') | slice:0:1 }}
                    </div>
                    <div class="flex flex-col">
                      <span class="text-xs font-black text-slate-700 tracking-tight">{{ s.encuestador?.name }}</span>
                      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{{ s.group?.name }}</span>
                    </div>
                  </div>
                </td>
                <td class="p-6">
                  @if (s.submitted_at) {
                    <div class="flex flex-col">
                      <span class="text-xs font-black text-slate-800">{{ s.submitted_at | date:'dd MMM yyyy' }}</span>
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ s.submitted_at | date:'HH:mm' }}</span>
                    </div>
                  } @else {
                    <div class="flex flex-col gap-1">
                      <span class="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg w-fit uppercase tracking-widest">Borrador</span>
                      <span class="text-[10px] font-bold text-slate-400">{{ s.updated_at | date:'dd MMM HH:mm' }}</span>
                    </div>
                  }
                </td>
                <td class="p-6 text-center">
                  <button (click)="viewDetail(s)" class="p-3 hover:bg-white hover:shadow-md rounded-2xl text-blue-600 transition-all active:scale-95 border border-transparent hover:border-slate-100 group-hover:bg-slate-50">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  </button>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="5" class="p-24 text-center">
                  <div class="max-w-xs mx-auto space-y-4">
                    <div class="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto"
                      [class.bg-slate-50]="activeTab() === 'complete'"
                      [class.text-slate-200]="activeTab() === 'complete'"
                      [class.bg-amber-50]="activeTab() === 'incomplete'"
                      [class.text-amber-200]="activeTab() === 'incomplete'">
                       <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                    </div>
                    <div>
                      <h4 class="font-black text-slate-800">
                        {{ activeTab() === 'complete' ? 'No hay encuestas completadas' : 'No hay borradores incompletos' }}
                      </h4>
                      <p class="text-sm text-slate-400 mt-1">
                        {{ activeTab() === 'complete' ? 'Ajusta los filtros o asegúrate de que el operativo esté capturando datos.' : 'Los borradores aparecen cuando un encuestador cancela una encuesta en progreso.' }}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>
    </div>

  <!-- ── Floating Export Progress Panel ──────────────────────────────── -->
  @if (exportJob()) {
    <div class="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-4 flex items-center justify-between border-b border-slate-100">
        <div class="flex items-center gap-3">
          @if (exportJob()?.status === 'done') {
            <div class="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            </div>
          } @else if (exportJob()?.status === 'failed') {
            <div class="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
              <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
          } @else {
            <div class="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            </div>
          }
          <div>
            <p class="text-xs font-black text-slate-800">
              @if (exportJob()?.status === 'queued') { Preparando exportación... }
              @else if (exportJob()?.status === 'processing') { Exportando datos... }
              @else if (exportJob()?.status === 'done') { ¡Exportación lista! }
              @else if (exportJob()?.status === 'failed') { Error en exportación }
            </p>
            @if (exportJob()?.total) {
              <p class="text-[10px] text-slate-400 font-bold">{{ exportJob()?.processed ?? exportJob()?.total }} de {{ exportJob()?.total }} registros</p>
            }
          </div>
        </div>
        <button (click)="dismissExport()" class="text-slate-300 hover:text-slate-500 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="h-1.5 bg-slate-100">
        <div class="h-full transition-all duration-500 rounded-full"
          [style.width.%]="exportJob()?.progress ?? 0"
          [class.bg-blue-500]="exportJob()?.status === 'processing' || exportJob()?.status === 'queued'"
          [class.bg-green-500]="exportJob()?.status === 'done'"
          [class.bg-red-500]="exportJob()?.status === 'failed'"></div>
      </div>
      @if (exportJob()?.status === 'done') {
        <div class="px-5 py-3">
          <button (click)="downloadExport()" class="w-full py-2.5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Descargar Excel
          </button>
        </div>
      }
    </div>
  }

    <!-- ── Premium Detail Dialog ────────────────────────────────────── -->
    <p-dialog [(visible)]="displayDetail" [modal]="true" [draggable]="false" [resizable]="false" 
      [style]="{width: '100%', maxWidth: '850px', borderRadius: '2.5rem'}" styleClass="survey-premium-modal">
      
      <ng-template pTemplate="header">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-[1.25rem] bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <div>
            <h3 class="text-xl font-black text-slate-900 leading-none">Detalles de la Encuesta</h3>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              ID: {{ selectedSurvey()?.id }} <span class="w-1 h-1 rounded-full bg-slate-300"></span> {{ selectedSurvey()?.respondent_phone }}
            </p>
          </div>
        </div>
      </ng-template>

      @if (selectedSurvey()) {
        <div class="grid grid-cols-1 md:grid-cols-12 gap-8 py-2">
          
          <!-- Column 1: Metadata & Maps -->
          <div class="md:col-span-4 space-y-6">
            <div class="bg-slate-50 rounded-[2rem] p-6 space-y-6 border border-slate-100">
               <div class="space-y-1">
                 <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Información Básica</p>
                 <h4 class="font-black text-slate-800 text-lg">{{ selectedSurvey()?.respondent_name }} {{ selectedSurvey()?.respondent_last_name }}</h4>
                 <p class="text-sm font-bold text-slate-500">{{ selectedSurvey()?.respondent_age }} años · {{ formatGender(selectedSurvey()?.respondent_gender) }}</p>
               </div>
               
               <div class="h-px bg-slate-200"></div>

               <div class="space-y-4">
                 <div class="flex items-start gap-4">
                   <div class="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-200">
                     📍
                   </div>
                   <div>
                     <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ubicación</p>
                     <p class="text-xs font-bold text-slate-700 mt-1 leading-tight">{{ selectedSurvey()?.respondent_neighborhood }}</p>
                     <p class="text-[10px] text-slate-400 mt-0.5">{{ selectedSurvey()?.respondent_address }}</p>
                     @if (selectedSurvey()?.address_source === 'gps') {
                       <span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[9px] font-black text-emerald-700 uppercase tracking-widest">🏠 Casa · GPS</span>
                     } @else if (selectedSurvey()?.address_source === 'maps') {
                       <span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-[9px] font-black text-blue-700 uppercase tracking-widest">🗺️ Calle · Maps</span>
                     }
                   </div>
                 </div>

                 @if (selectedSurvey()?.encuestador_lat) {
                    <a [href]="'https://www.google.com/maps?q=' + selectedSurvey()?.encuestador_lat + ',' + selectedSurvey()?.encuestador_lng" target="_blank"
                      class="flex items-center justify-center gap-2 w-full bg-slate-950 text-white py-3 rounded-2xl text-[10px] font-black tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                      VER EN MAPS
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </a>
                 }
               </div>
            </div>

            <div class="bg-blue-600 rounded-[2rem] p-6 text-white space-y-1 relative overflow-hidden">
               <div class="relative z-10">
                 <p class="text-[10px] font-black uppercase tracking-widest opacity-60">Operativo</p>
                 <p class="text-sm font-black">{{ selectedSurvey()?.encuestador?.name }} {{ selectedSurvey()?.encuestador?.last_name }}</p>
                 <p class="text-[10px] font-bold opacity-80 mt-1">GRUPO: {{ selectedSurvey()?.group?.name }}</p>
               </div>
               <div class="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
            </div>
          </div>

          <!-- Column 2: Responses -->
          <div class="md:col-span-8 space-y-6">
            
            <!-- All Responses -->
            <div class="space-y-2">
              @for (entry of getAllResponses(selectedSurvey()?.responses); track entry.key) {
                <div class="rounded-2xl border p-4 transition-all"
                     [class]="entry.highlight ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-transparent hover:border-slate-100'">
                  <p class="text-[10px] font-black uppercase tracking-widest mb-1"
                     [class]="entry.highlight ? 'text-blue-500' : 'text-slate-400'">{{ entry.label }}</p>
                  <p class="text-sm font-black text-slate-800 leading-snug break-words whitespace-normal">{{ formatResponseValue(entry.value) }}</p>
                </div>
              }
              @if (getAllResponses(selectedSurvey()?.responses).length === 0) {
                <p class="text-center py-8 text-xs text-slate-300 font-bold italic">No se registraron respuestas.</p>
              }
            </div>

          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="p-2">
          <button (click)="displayDetail = false" class="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95">
            Cerrar Detalles
          </button>
        </div>
      </ng-template>
    </p-dialog>

    <style>
      :host ::ng-deep .p-datatable-lg .p-datatable-thead > tr > th { background: transparent; border-bottom: 2px solid #f1f5f9; }
      :host ::ng-deep .p-datatable-lg .p-datatable-tbody > tr > td { border-bottom: 1px solid #f8fafc; }
      :host ::ng-deep .p-paginator { background: transparent; border: none; padding-top: 2rem; }
      
      :host ::ng-deep .survey-premium-modal .p-dialog-header { padding: 2.5rem 2.5rem 1rem 2.5rem; border: none; background: white; }
      :host ::ng-deep .survey-premium-modal .p-dialog-content { padding: 0 2.5rem 2rem 2.5rem; border: none; background: white; }
      :host ::ng-deep .survey-premium-modal .p-dialog-footer { padding: 0 2.5rem 2.5rem 2.5rem; border: none; background: white; border-bottom-left-radius: 2.5rem; border-bottom-right-radius: 2.5rem; text-align: right; }
      :host ::ng-deep .survey-premium-modal .p-dialog-header-icons .p-dialog-header-close { width: 3rem; height: 3rem; border-radius: 1.5rem; background: #f8fafc; border: 1px solid #f1f5f9; }
      
      .radio-ui { @apply w-4 h-4 rounded-full border-2 border-slate-200 transition-all relative; }
    </style>
  `,
})
export class SurveyListComponent implements OnInit, OnDestroy {
  private svc  = inject(SurveyService);
  private http = inject(HttpClient);

  surveys        = signal<any[]>([]);
  totalCount     = signal<number>(0);
  forms          = signal<any[]>([]);
  groups         = signal<any[]>([]);
  encuestadores  = signal<any[]>([]);
  geoAddresses   = signal<Map<string, string>>(new Map());
  exportJob      = signal<any>(null);
  private geoCache      = new Map<string, string>();
  private pollTimer?: ReturnType<typeof setInterval>;
  loading        = signal(false);
  activeTab      = signal<'complete' | 'incomplete'>('complete');
  displayDetail  = false;
  selectedSurvey = signal<any>(null);

  filters: any = {
    search: '',
    form_id: null,
    group_id: null,
    encuestador_id: null,
    from: null,
    to: null
  };

  dateRange: Date[] = [];

  ngOnInit(): void {
    this.loadSurveys();
    this.loadForms();
    this.loadGroups();
    this.loadEncuestadores();
    this.restoreExportFromStorage();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  setTab(tab: 'complete' | 'incomplete'): void {
    this.activeTab.set(tab);
    this.reload();
  }

  reload(): void {
    this.activeTab() === 'complete' ? this.loadSurveys() : this.loadIncomplete();
  }

  loadSurveys(): void {
    this.loading.set(true);
    this.svc.getSurveys(this.filters)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res: any) => {
          const data = res.data || [];
          this.surveys.set(data);
          this.totalCount.set(res.total || data.length);
          this.resolveAddresses(data);
        },
        error: () => {}
      });
  }

  loadIncomplete(): void {
    this.loading.set(true);
    this.svc.getIncompleteSurveys(this.filters)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res: any) => {
          const data = res.data || [];
          this.surveys.set(data);
          this.totalCount.set(res.total || 0);
          this.resolveAddresses(data);
        },
        error: () => {}
      });
  }

  private async resolveAddresses(surveys: any[]): Promise<void> {
    const unique = new Set<string>();
    for (const s of surveys) {
      if (s.encuestador_lat && s.encuestador_lng) {
        unique.add(`${s.encuestador_lat},${s.encuestador_lng}`);
      }
    }
    for (const key of unique) {
      if (this.geoCache.has(key)) continue;
      const [lat, lng] = key.split(',');
      try {
        const res: any = await firstValueFrom(
          this.http.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        );
        const a = res?.address ?? {};
        const street = a.road ?? a.pedestrian ?? a.footway ?? '';
        const city   = a.city ?? a.town ?? a.municipality ?? a.county ?? '';
        this.geoCache.set(key, [street, city].filter(Boolean).join(', ') || res?.display_name || key);
      } catch {
        this.geoCache.set(key, '');
      }
      this.geoAddresses.set(new Map(this.geoCache));
      // Nominatim: máx 1 req/seg
      await new Promise(r => setTimeout(r, 1100));
    }
  }

  geoAddress(lat: number, lng: number): string {
    return this.geoAddresses().get(`${lat},${lng}`) ?? '';
  }

  loadForms(): void {
    this.svc.getPublishedForms().subscribe({
      next: (res: any) => this.forms.set(res.data || res)
    });
  }

  loadGroups(): void {
    this.svc.getGroups().subscribe({
      next: (res: any) => this.groups.set(res.data || res || [])
    });
  }

  loadEncuestadores(): void {
    this.svc.getEncuestadores().subscribe({
      next: (res: any) => {
        const list = res.data || res || [];
        this.encuestadores.set(list.map((e: any) => ({
          id: e.id,
          name: `${e.name} ${e.last_name ?? ''}`.trim()
        })));
      }
    });
  }

  getUniqueGroups(): number {
    const groups = new Set(this.surveys().map((s: any) => s.group_id).filter((id: any) => !!id));
    return groups.size;
  }

  getWithGpsCount(): number {
    return this.surveys().filter((s: any) => s.encuestador_lat).length;
  }

  getWithoutGpsCount(): number {
    return this.surveys().filter((s: any) => !s.encuestador_lat).length;
  }

  formatGender(gender: string): string {
    const map: Record<string, string> = { 'M': 'Masculino', 'F': 'Femenino', 'O': 'Otro' };
    return map[gender] || gender || 'No especificado';
  }

  // ── Export (background job) ─────────────────────────────────────────

  startExport(): void {
    const job = this.exportJob();
    if (job?.status === 'queued' || job?.status === 'processing') return;

    this.svc.startExport(this.filters).subscribe({
      next: ({ export_id }) => {
        const state = { id: export_id, status: 'queued', progress: 0 };
        this.exportJob.set(state);
        localStorage.setItem('pulxo_export', JSON.stringify(state));
        this.startPolling(export_id);
      }
    });
  }

  downloadExport(): void {
    const job = this.exportJob();
    if (!job?.id) return;
    this.svc.downloadExport(job.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `encuestas_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.dismissExport();
      },
      error: (err) => {
        console.error('Download failed', err);
        alert('Error al descargar el archivo: ' + (err.message || 'Error de servidor'));
      }
    });
  }

  dismissExport(): void {
    this.stopPolling();
    this.exportJob.set(null);
    localStorage.removeItem('pulxo_export');
  }

  private restoreExportFromStorage(): void {
    const raw = localStorage.getItem('pulxo_export');
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      if (!state?.id) return;
      if (state.status === 'done' || state.status === 'failed') {
        this.exportJob.set(state);
      } else {
        this.exportJob.set(state);
        this.startPolling(state.id);
      }
    } catch { localStorage.removeItem('pulxo_export'); }
  }

  private startPolling(id: string): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      this.svc.getExportStatus(id).subscribe({
        next: (data: any) => {
          const state = { ...data, id };
          this.exportJob.set(state);
          localStorage.setItem('pulxo_export', JSON.stringify(state));
          if (data.status === 'done' || data.status === 'failed') {
            this.stopPolling();
          }
        },
        error: () => this.stopPolling()
      });
    }, 2000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  onDateSelect(): void {
    if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
      this.filters.from = this.dateRange[0].toISOString().split('T')[0];
      this.filters.to = this.dateRange[1].toISOString().split('T')[0];
      this.loadSurveys();
    }
  }

  clearFilters(): void {
    this.filters = { search: '', form_id: null, group_id: null, encuestador_id: null, from: null, to: null };
    this.dateRange = [];
    this.reload();
  }

  viewDetail(survey: any): void {
    this.selectedSurvey.set(survey);
    this.displayDetail = true;
  }

  private readonly HIGHLIGHT_KEYS: Record<string, string> = {
    clima_pais:          'Clima País',
    problema_principal:  'Problema Principal',
    liderazgo:           'Liderazgo',
  };

  private readonly LABEL_MAP: Record<string, string> = {
    celular:    'Celular',
    nombre:     'Nombre',
    apellidos:  'Apellidos',
    genero:     'Género',
    edad:       'Edad',
    ocupacion:  'Ocupación',
    barrio:     'Barrio',
    direccion:  'Dirección',
  };

  getAllResponses(responses: any): { key: string; label: string; value: any; highlight: boolean }[] {
    if (!responses) return [];
    return Object.entries(responses).map(([key, value]) => ({
      key,
      label:     this.HIGHLIGHT_KEYS[key] ?? this.LABEL_MAP[key] ?? key,
      value:     Array.isArray(value) ? value.join(', ') : value,
      highlight: key in this.HIGHLIGHT_KEYS,
    }));
  }

  formatResponseValue(value: any): string {
    if (value === null || value === undefined || value === '') return '—';
    return String(value).replace(/_/g, ' ');
  }
}
