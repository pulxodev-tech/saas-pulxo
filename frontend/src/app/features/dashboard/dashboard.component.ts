import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DashboardService, DashboardStats } from './dashboard.service';
import { MapPreviewComponent } from '../../shared/components/map-preview.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, MapPreviewComponent],
  template: `
    <div class="space-y-8 pb-10">

      <!-- ── Header + Filters ─────────────────────────────────────────── -->
      <div class="flex items-center justify-between flex-wrap gap-4 bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm sticky top-0 z-20">
        <div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Panel de Control</h2>
          <div class="flex items-center gap-2 mt-1">
            <span class="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <p class="text-slate-500 text-xs font-medium uppercase tracking-wider">Monitoreo en tiempo real · {{ lastUpdate() }}</p>
          </div>
        </div>
        <div class="flex gap-3 flex-wrap items-center">
            <div class="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <input type="date" [value]="dateFrom()" (change)="setDate('from', $event)"
                    class="px-3 py-2 text-sm focus:outline-none border-r border-slate-100" />
                <span class="text-slate-300 px-1">/</span>
                <input type="date" [value]="dateTo()" (change)="setDate('to', $event)"
                    class="px-3 py-2 text-sm focus:outline-none" />
            </div>
          <button (click)="reload()" 
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2">
            <span class="text-lg leading-none">🔄</span>
            Actualizar
          </button>
        </div>
      </div>

      <!-- ── KPI Cards ─────────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) {
            <div class="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse h-32 shadow-sm"></div>
          }
        } @else if (stats()) {
          <!-- Total Card -->
          <div class="group relative bg-indigo-600 rounded-2xl p-6 overflow-hidden shadow-xl shadow-indigo-100 transition-all hover:-translate-y-1">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <p class="text-xs font-bold text-indigo-100 uppercase tracking-widest opacity-80">Total Período</p>
            <p class="text-4xl font-black text-white mt-1">{{ stats()!.total_surveys | number }}</p>
            <div class="mt-4 flex items-center gap-1.5 text-xs text-indigo-100 font-medium">
               <span class="bg-white/20 px-2 py-0.5 rounded-full">Encuestas</span>
            </div>
          </div>

          <!-- Today Card -->
          <div class="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Hoy</p>
            <p class="text-4xl font-black text-green-600 mt-1">{{ stats()!.total_today | number }}</p>
            <div class="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
               <span class="flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
               Nuevas hoy
            </div>
          </div>

          <!-- Actives Card -->
          <div class="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Activos (Hr)</p>
            <p class="text-4xl font-black text-amber-500 mt-1">{{ stats()!.active_encuestadores }}</p>
            <div class="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
               En campo de {{ stats()!.total_encuestadores }}
            </div>
          </div>

          <!-- GPS Card -->
          <div class="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Cobertura GPS</p>
            <p class="text-4xl font-black text-blue-500 mt-1">{{ stats()!.gps_coverage_pct }}%</p>
            <div class="mt-4 flex items-center gap-2">
                <div class="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-blue-500 h-full transition-all duration-500" [style.width.%]="stats()!.gps_coverage_pct"></div>
                </div>
            </div>
          </div>

          <!-- Hourly Card -->
          <div class="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Ritmo Actual</p>
            <p class="text-4xl font-black text-purple-600 mt-1">{{ currentHourCount() }}</p>
            <div class="mt-4 flex items-center gap-1.5 text-xs text-purple-500 font-semibold">
               Encuestas / Hora
            </div>
          </div>
        }
      </div>

      <!-- ── Map row (Phase 5) ──────────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 h-[450px]">
           <app-map-preview [points]="stats()?.recent_points || []"></app-map-preview>
        </div>
        
        <!-- Top encuestadores (Sidebar style) -->
        <div class="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
            <div class="flex items-center justify-between mb-6">
                <h3 class="font-extrabold text-slate-800 text-sm tracking-tight uppercase">Top Encuestadores</h3>
                <span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500">PERÍODO</span>
            </div>
            
            @if (loading() || !stats()) {
                <div class="space-y-4 animate-pulse">
                    @for (i of [1,2,3,4,5,6]; track i) {
                        <div class="h-8 bg-slate-50 rounded-lg"></div>
                    }
                </div>
            } @else if (stats()!.by_encuestador.length === 0) {
                <div class="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-25 rounded-xl border-2 border-dashed border-slate-100">
                    <span class="text-2xl mb-2">📊</span>
                    <p class="text-xs">Sin datos aún</p>
                </div>
            } @else {
                <div class="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    @for (enc of stats()!.by_encuestador.slice(0, 10); track enc.id; let i = $index) {
                      <div class="flex items-center gap-3 group">
                        <div class="w-6 h-6 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            {{ i + 1 }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-baseline mb-1">
                                <p class="text-xs font-bold text-slate-700 truncate">{{ enc.full_name }}</p>
                                <span class="text-xs font-black text-indigo-600">{{ enc.total }}</span>
                            </div>
                            <div class="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden">
                              <div class="bg-indigo-400 h-full rounded-full transition-all duration-700" 
                                [style.width.%]="maxEncCount() > 0 ? (enc.total / maxEncCount() * 100) : 0"></div>
                            </div>
                        </div>
                      </div>
                    }
                </div>
            }
        </div>
      </div>

      <!-- ── Secondary Row (Charts & Tables) ────────────────────────────── -->
      @if (stats()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

          <!-- Hourly activity -->
          <div class="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
            <h3 class="font-extrabold text-slate-800 mb-8 text-sm uppercase tracking-tight">Actividad por Hora (Hoy)</h3>
            <div class="flex items-end gap-1.5 h-48">
              @for (bar of hourlyBars(); track bar.hour) {
                <div class="flex-1 flex flex-col items-center gap-2 group" [title]="bar.hour + ':00h - ' + bar.count + ' encuestas'">
                  <div class="w-full rounded-t-lg transition-all duration-300 relative"
                    [style.height.%]="bar.heightPct"
                    [class]="bar.isCurrentHour ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-200 group-hover:bg-indigo-300'"
                    style="min-height: 4px;">
                        <!-- Tooltip on hover -->
                        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                            {{ bar.count }} encuestas
                        </div>
                    </div>
                  @if (bar.hour % 3 === 0) {
                    <span class="text-[9px] font-bold text-slate-400">{{ bar.hour }}h</span>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Bottom double grid (Group & Form) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <!-- By Group -->
              <div class="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 class="font-bold text-slate-800 mb-5 text-xs uppercase tracking-widest text-center border-b border-slate-50 pb-3">Por Grupo</h3>
                @if (stats()!.by_group.length === 0) {
                  <p class="text-xs text-slate-400 text-center py-10">Sin datos aún</p>
                } @else {
                  <div class="space-y-4">
                    @for (g of stats()!.by_group; track g.group_name) {
                      <div>
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-[11px] font-bold text-slate-500 truncate">{{ g.group_name }}</span>
                            <span class="text-[11px] font-black text-slate-800">{{ g.total }}</span>
                        </div>
                        <div class="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden">
                          <div class="bg-green-400 h-full rounded-full transition-all duration-700" 
                            [style.width.%]="stats()!.total_surveys > 0 ? (g.total / stats()!.total_surveys * 100) : 0"></div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- By Form -->
              <div class="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 class="font-bold text-slate-800 mb-5 text-xs uppercase tracking-widest text-center border-b border-slate-50 pb-3">Por Formulario</h3>
                @if (stats()!.by_form.length === 0) {
                  <p class="text-xs text-slate-400 text-center py-10">Sin datos aún</p>
                } @else {
                  <div class="space-y-3">
                    @for (f of stats()!.by_form; track f.form_name) {
                      <div class="flex items-center justify-between p-2 bg-slate-25 rounded-xl border border-slate-50">
                        <span class="text-[11px] font-semibold text-slate-600 flex-1 truncate">{{ f.form_name }}</span>
                        <span class="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg ml-2">{{ f.total }}</span>
                      </div>
                    }
                  </div>
                }
              </div>

          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private svc   = inject(DashboardService);
  private timer: any = null;
  
  lastUpdate = signal(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  stats    = signal<DashboardStats | null>(null);
  loading  = signal(true);
  dateFrom = signal(new Date().toISOString().slice(0, 10));
  dateTo   = signal(new Date().toISOString().slice(0, 10));

  hourlyBars = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const currentHour = new Date().getHours();
    const max = Math.max(...Object.values(s.hourly_today), 1);
    return Array.from({ length: 24 }, (_, h) => ({
      hour:          h,
      count:         s.hourly_today[h] ?? 0,
      heightPct:     Math.round(((s.hourly_today[h] ?? 0) / max) * 100),
      isCurrentHour: h === currentHour,
    }));
  });

  currentHourCount = computed(() => this.stats()?.hourly_today[new Date().getHours()] ?? 0);

  maxEncCount = computed(() => {
    const list = this.stats()?.by_encuestador ?? [];
    return list.length > 0 ? Math.max(...list.map(e => e.total)) : 1;
  });

  ngOnInit(): void {
    this.reload();
    this.timer = setInterval(() => this.reload(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  reload(): void {
    this.svc.getStats({ date_from: this.dateFrom(), date_to: this.dateTo() }).subscribe({
      next: data => { 
        this.stats.set(data); 
        this.loading.set(false); 
        this.lastUpdate.set(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      },
      error: ()  => this.loading.set(false),
    });
  }

  setDate(which: 'from' | 'to', event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (which === 'from') this.dateFrom.set(val);
    else                  this.dateTo.set(val);
    this.reload();
  }
}
