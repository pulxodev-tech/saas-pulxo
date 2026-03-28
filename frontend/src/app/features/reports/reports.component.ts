import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService, SummaryResponse } from './reports.service';

type ReportTab = 'surveys' | 'summary';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">

      <!-- ── Header ───────────────────────────────────────────────────── -->
      <div>
        <h2 class="text-2xl font-bold text-slate-800">Reportes</h2>
        <p class="text-slate-500 text-sm mt-1">Analiza y exporta los resultados de encuestas</p>
      </div>

      <!-- ── Filters ───────────────────────────────────────────────────── -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Formulario (ID)</label>
            <input type="number" min="1" placeholder="ID del formulario"
              #formIdInput
              class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Desde</label>
            <input type="date" #fromInput
              class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Hasta</label>
            <input type="date" #toInput
              class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <button (click)="applyFilters(formIdInput.value, fromInput.value, toInput.value)"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
            Buscar
          </button>
        </div>
      </div>

      <!-- ── Tabs + Export buttons ──────────────────────────────────────── -->
      <div class="border-b border-slate-200 flex items-end gap-6">
        @for (tab of tabs; track tab.key) {
          <button (click)="activeTab.set(tab.key)"
            class="pb-3 text-sm font-medium border-b-2 transition-colors -mb-px"
            [class.border-indigo-600]="activeTab() === tab.key"
            [class.text-indigo-600]="activeTab() === tab.key"
            [class.border-transparent]="activeTab() !== tab.key"
            [class.text-slate-500]="activeTab() !== tab.key">
            {{ tab.label }}
          </button>
        }
        <div class="ml-auto flex gap-2 pb-2">
          <button (click)="downloadExcel('detail')" [disabled]="exporting()"
            class="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
            📥 Excel detalle
          </button>
          <button (click)="downloadExcel('summary')" [disabled]="exporting()"
            class="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-50">
            📥 Excel resumen
          </button>
          <button (click)="downloadPdf()" [disabled]="exporting() || !filters().form_id"
            [title]="!filters().form_id ? 'Selecciona un formulario primero' : ''"
            class="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-50">
            📄 PDF
          </button>
        </div>
      </div>

      <!-- ═══ Surveys list ═════════════════════════════════════════════════ -->
      @if (activeTab() === 'surveys') {
        @if (loadingSurveys()) {
          <div class="space-y-2">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="bg-white rounded-lg border border-slate-200 h-12 animate-pulse"></div>
            }
          </div>
        } @else if (!surveysData() || surveysData()?.data?.length === 0) {
          <div class="text-center py-16 text-slate-400">
            <p class="text-4xl mb-3">📊</p>
            <p class="font-medium text-slate-600">Sin encuestas con estos filtros</p>
            <p class="text-sm mt-1">Ajusta los filtros y presiona Buscar</p>
          </div>
        } @else {
          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">ID</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Formulario</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Encuestador</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Grupo</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Teléfono</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Respondente</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">GPS</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (s of surveysData()?.data; track s.id) {
                    <tr class="hover:bg-slate-50">
                      <td class="px-4 py-2.5 text-slate-400 text-xs">#{{ s.id }}</td>
                      <td class="px-4 py-2.5 text-slate-700 text-xs max-w-[140px] truncate">{{ s.form?.name }}</td>
                      <td class="px-4 py-2.5 text-slate-700 text-xs">{{ s.encuestador?.name }} {{ s.encuestador?.last_name }}</td>
                      <td class="px-4 py-2.5 text-slate-500 text-xs">{{ s.group?.name }}</td>
                      <td class="px-4 py-2.5 font-mono text-xs text-slate-600">{{ s.respondent_phone }}</td>
                      <td class="px-4 py-2.5 text-slate-700 text-xs">{{ s.respondent_name }} {{ s.respondent_last_name }}</td>
                      <td class="px-4 py-2.5 text-center text-sm">{{ s.encuestador_lat ? '📍' : '—' }}</td>
                      <td class="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                        {{ s.submitted_at | date:'dd/MM/yy HH:mm' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (surveysData()?.last_page > 1) {
              <div class="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                <p class="text-xs text-slate-500">
                  {{ surveysData()?.from }}–{{ surveysData()?.to }} de {{ surveysData()?.total }}
                </p>
                <div class="flex gap-1">
                  <button (click)="changePage(surveysData()?.current_page - 1)"
                    [disabled]="surveysData()?.current_page === 1"
                    class="px-2 py-1 rounded border border-slate-300 text-xs disabled:opacity-40">←</button>
                  <span class="px-3 py-1 text-xs text-slate-600">{{ surveysData()?.current_page }} / {{ surveysData()?.last_page }}</span>
                  <button (click)="changePage(surveysData()?.current_page + 1)"
                    [disabled]="surveysData()?.current_page === surveysData()?.last_page"
                    class="px-2 py-1 rounded border border-slate-300 text-xs disabled:opacity-40">→</button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ═══ Summary by field ══════════════════════════════════════════════ -->
      @if (activeTab() === 'summary') {
        @if (!filters().form_id) {
          <div class="text-center py-16 text-slate-400">
            <p class="text-4xl mb-3">🔍</p>
            <p class="font-medium text-slate-600">Selecciona un formulario para ver el resumen</p>
          </div>
        } @else if (loadingSummary()) {
          <div class="space-y-4">
            @for (i of [1,2,3]; track i) {
              <div class="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-32"></div>
            }
          </div>
        } @else if (summaryData()) {
          <div class="mb-2 flex items-center gap-3">
            <span class="font-semibold text-slate-700">{{ summaryData()!.form.name }}</span>
            <span class="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {{ summaryData()!.total }} encuestas
            </span>
          </div>
          <div class="space-y-4">
            @for (field of summaryData()!.fields; track field.field_key) {
              <div class="bg-white rounded-xl border border-slate-200 p-5">
                <h4 class="font-semibold text-slate-700 text-sm mb-3">{{ field.label }}</h4>
                @if (field.rows.length === 0) {
                  <p class="text-xs text-slate-400">Sin respuestas registradas</p>
                } @else {
                  <div class="space-y-2">
                    @for (row of field.rows; track row.value) {
                      <div class="flex items-center gap-3">
                        <span class="text-xs text-slate-600 w-44 truncate" [title]="row.answer">{{ row.answer }}</span>
                        <div class="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div class="bg-indigo-400 h-2.5 rounded-full" [style.width.%]="row.pct"></div>
                        </div>
                        <span class="text-xs font-bold text-slate-700 w-8 text-right">{{ row.count }}</span>
                        <span class="text-xs text-slate-400 w-10 text-right">{{ row.pct }}%</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      }

    </div>
  `,
})
export class ReportsComponent implements OnInit {
  private svc = inject(ReportsService);

  activeTab      = signal<ReportTab>('surveys');
  loadingSurveys = signal(false);
  loadingSummary = signal(false);
  exporting      = signal(false);
  surveysData    = signal<any>(null);
  summaryData    = signal<SummaryResponse | null>(null);

  private _filters = signal<{ form_id?: number; from?: string; to?: string }>({});
  filters = this._filters.asReadonly();
  private currentPage = 1;

  readonly tabs = [
    { key: 'surveys' as ReportTab, label: '📋 Lista de encuestas' },
    { key: 'summary' as ReportTab, label: '📊 Resumen por campo' },
  ];

  ngOnInit(): void {
    this.loadSurveys();
  }

  applyFilters(formId: string, from: string, to: string): void {
    this._filters.set({
      form_id: formId ? +formId : undefined,
      from:    from   || undefined,
      to:      to     || undefined,
    });
    this.currentPage = 1;
    this.loadSurveys();
    if (this._filters().form_id) this.loadSummary();
  }

  loadSurveys(): void {
    this.loadingSurveys.set(true);
    this.svc.getSurveys({ ...this.filters(), per_page: 50 }).subscribe({
      next: data => { this.surveysData.set(data); this.loadingSurveys.set(false); },
      error: ()  => this.loadingSurveys.set(false),
    });
  }

  loadSummary(): void {
    if (!this.filters().form_id) return;
    this.loadingSummary.set(true);
    this.svc.getSummary(this.filters() as any).subscribe({
      next: data => { this.summaryData.set(data); this.loadingSummary.set(false); },
      error: ()  => this.loadingSummary.set(false),
    });
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadSurveys();
  }

  downloadExcel(type: 'detail' | 'summary'): void {
    this.exporting.set(true);
    this.svc.exportExcel(type, this.filters() as any).subscribe({
      next: blob => {
        this.triggerDownload(blob, `pulxo_${type}_${this.today()}.xlsx`);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  downloadPdf(): void {
    if (!this.filters().form_id) return;
    this.exporting.set(true);
    this.svc.exportPdf(this.filters() as any).subscribe({
      next: blob => {
        this.triggerDownload(blob, `pulxo_reporte_${this.today()}.pdf`);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  private today(): string { return new Date().toISOString().slice(0, 10); }
}
