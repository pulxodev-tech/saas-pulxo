import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Audience, Campaign, CampaignsService } from './campaigns.service';

type CampaignTab = 'campaigns' | 'audiences';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">

      <!-- ── Header ───────────────────────────────────────────────────── -->
      <div>
        <h2 class="text-2xl font-bold text-slate-800">Campañas</h2>
        <p class="text-slate-500 text-sm mt-1">Envíos masivos SMS a respondentes segmentados</p>
      </div>

      <!-- ── Tabs ──────────────────────────────────────────────────────── -->
      <div class="border-b border-slate-200 flex gap-6">
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
      </div>

      <!-- ═══ CAMPAIGNS ════════════════════════════════════════════════════ -->
      @if (activeTab() === 'campaigns') {

        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">{{ campaigns().length }} campañas</span>
          <button (click)="showCampaignForm.set(true)"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            + Nueva campaña
          </button>
        </div>

        @if (showCampaignForm()) {
          <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-3">
            <h4 class="font-semibold text-slate-700">Nueva campaña SMS</h4>
            <form [formGroup]="campaignForm" (ngSubmit)="createCampaign()" class="space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-500 block mb-1">Nombre *</label>
                  <input formControlName="name" type="text" placeholder="Ej: Campaña votaciones marzo"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">Canal *</label>
                  <select formControlName="channel"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="sms">SMS</option>
                    <option value="sms_flash">SMS Flash</option>
                  </select>
                </div>
                <div class="md:col-span-2">
                  <label class="text-xs text-slate-500 block mb-1">Audiencia *</label>
                  <select formControlName="audience_id"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Selecciona audiencia...</option>
                    @for (a of audiences(); track a.id) {
                      <option [value]="a.id">{{ a.name }} (≈{{ a.estimated_count }} respondentes)</option>
                    }
                  </select>
                </div>
                <div class="md:col-span-2">
                  <label class="text-xs text-slate-500 block mb-1">
                    Mensaje (max 160 car.) — usa <code class="bg-slate-100 px-1 rounded">&#123;nombre&#125;</code> para personalizar *
                  </label>
                  <textarea formControlName="message_template" rows="3" maxlength="160"
                    placeholder="Hola {nombre}, recuerda que el día de las elecciones es el próximo domingo. ¡Tu voto cuenta!"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"></textarea>
                  <p class="text-xs text-slate-400 mt-1">
                    {{ campaignForm.get('message_template')?.value?.length ?? 0 }} / 160 caracteres
                  </p>
                </div>
              </div>
              <div class="flex gap-2">
                <button type="submit" [disabled]="campaignForm.invalid || saving()"
                  class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {{ saving() ? 'Guardando…' : 'Crear campaña' }}
                </button>
                <button type="button" (click)="showCampaignForm.set(false); campaignForm.reset({ channel: 'sms' })"
                  class="border border-slate-300 px-4 py-2 rounded-lg text-sm text-slate-600">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        }

        @if (loading()) {
          <div class="space-y-3">
            @for (i of [1,2,3]; track i) {
              <div class="bg-white rounded-xl border border-slate-200 h-20 animate-pulse"></div>
            }
          </div>
        } @else if (campaigns().length === 0) {
          <div class="text-center py-16 text-slate-400">
            <p class="text-4xl mb-3">📣</p>
            <p class="font-medium text-slate-600">Sin campañas aún</p>
            <p class="text-sm mt-1">Crea tu primera campaña SMS masiva</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (c of campaigns(); track c.id) {
              <div class="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                <div class="flex items-start justify-between gap-3 flex-wrap">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="font-semibold text-slate-800 text-sm">{{ c.name }}</h3>
                      <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                        [class]="statusClass(c.status)">{{ statusLabel(c.status) }}</span>
                      <span class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {{ c.channel.toUpperCase() }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-1">{{ c.message_template }}</p>
                    <p class="text-xs text-slate-400 mt-1">
                      {{ c.audience?.name ?? 'Audiencia' }} ·
                      @if (c.total_recipients > 0) {
                        {{ c.sent_count }}/{{ c.total_recipients }} enviados
                        @if (c.failed_count > 0) { · {{ c.failed_count }} fallidos }
                      }
                    </p>
                  </div>
                  <div class="flex gap-2 flex-shrink-0">
                    @if (c.status === 'draft' || c.status === 'scheduled') {
                      <button (click)="dispatch(c)" [disabled]="dispatching() === c.id"
                        class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                        {{ dispatching() === c.id ? '⏳' : '🚀 Enviar' }}
                      </button>
                    }
                    @if (c.status === 'sending') {
                      <div class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
                        <span class="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                        <span class="text-xs text-amber-700 font-medium">Enviando…</span>
                      </div>
                      <button (click)="cancelCampaign(c.id)"
                        class="text-xs px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg">
                        Cancelar
                      </button>
                    }
                    @if (c.status === 'draft') {
                      <button (click)="deleteCampaign(c.id)"
                        class="text-xs px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">🗑</button>
                    }
                  </div>
                </div>

                @if (c.status === 'sending' || c.status === 'completed') {
                  <div class="mt-3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-green-500 h-1.5 rounded-full transition-all"
                      [style.width.%]="c.total_recipients > 0 ? (c.sent_count / c.total_recipients * 100) : 0"></div>
                  </div>
                }
              </div>
            }
          </div>
        }
      }

      <!-- ═══ AUDIENCES ════════════════════════════════════════════════════ -->
      @if (activeTab() === 'audiences') {

        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">{{ audiences().length }} audiencias</span>
          <button (click)="showAudienceForm.set(true)"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            + Nueva audiencia
          </button>
        </div>

        @if (showAudienceForm()) {
          <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-3">
            <h4 class="font-semibold text-slate-700">Segmentar audiencia</h4>
            <form [formGroup]="audienceForm" (ngSubmit)="createAudience()" class="space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="md:col-span-2">
                  <label class="text-xs text-slate-500 block mb-1">Nombre de la audiencia *</label>
                  <input formControlName="name" type="text" placeholder="Ej: Mujeres 25-40 Barrio Norte"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">Form ID (filtrar por formulario)</label>
                  <input formControlName="form_id" type="number" min="1" placeholder="ID del formulario"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">Género</label>
                  <select formControlName="gender"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Todos</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">Edad mínima</label>
                  <input formControlName="age_min" type="number" min="1" max="120" placeholder="Ej: 18"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">Edad máxima</label>
                  <input formControlName="age_max" type="number" min="1" max="120" placeholder="Ej: 60"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">Barrio (contiene)</label>
                  <input formControlName="neighborhood" type="text" placeholder="Ej: La Candelaria"
                    class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>

              <!-- Preview count -->
              <div class="flex items-center gap-3">
                <button type="button" (click)="previewCount()" [disabled]="previewing()"
                  class="border border-indigo-400 text-indigo-600 px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-50 disabled:opacity-50">
                  {{ previewing() ? '…' : '🔍 Ver estimado' }}
                </button>
                @if (audiencePreviewCount() !== null) {
                  <span class="text-sm font-semibold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
                    ≈ {{ audiencePreviewCount() }} respondentes
                  </span>
                }
              </div>

              <div class="flex gap-2">
                <button type="submit" [disabled]="audienceForm.invalid || saving()"
                  class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {{ saving() ? 'Guardando…' : 'Crear audiencia' }}
                </button>
                <button type="button" (click)="cancelAudienceForm()"
                  class="border border-slate-300 px-4 py-2 rounded-lg text-sm text-slate-600">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        }

        @if (audiences().length === 0) {
          <div class="text-center py-16 text-slate-400">
            <p class="text-4xl mb-3">👥</p>
            <p class="font-medium text-slate-600">Sin audiencias aún</p>
            <p class="text-sm mt-1">Define segmentos de respondentes para tus campañas</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (a of audiences(); track a.id) {
              <div class="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-slate-800 text-sm">{{ a.name }}</h3>
                    <p class="text-xs text-slate-400 mt-1">{{ filtersLabel(a.filters) }}</p>
                  </div>
                  <button (click)="deleteAudience(a.id)"
                    class="text-red-400 hover:text-red-600 text-xs px-2 py-1 hover:bg-red-50 rounded">🗑</button>
                </div>
                <div class="mt-3 flex items-center gap-2">
                  <span class="text-2xl font-bold text-indigo-600">{{ a.estimated_count | number }}</span>
                  <span class="text-xs text-slate-400">respondentes estimados</span>
                </div>
              </div>
            }
          </div>
        }
      }

    </div>
  `,
})
export class CampaignsComponent implements OnInit {
  private svc = inject(CampaignsService);
  private fb  = inject(FormBuilder);

  activeTab         = signal<CampaignTab>('campaigns');
  campaigns         = signal<Campaign[]>([]);
  audiences         = signal<Audience[]>([]);
  loading           = signal(true);
  saving            = signal(false);
  dispatching       = signal<number | null>(null);
  showCampaignForm  = signal(false);
  showAudienceForm  = signal(false);
  audiencePreviewCount = signal<number | null>(null);
  previewing        = signal(false);

  readonly tabs = [
    { key: 'campaigns' as CampaignTab, label: '📣 Campañas' },
    { key: 'audiences' as CampaignTab, label: '👥 Audiencias' },
  ];

  campaignForm = this.fb.group({
    name:             ['', Validators.required],
    channel:          ['sms', Validators.required],
    audience_id:      ['', Validators.required],
    message_template: ['', [Validators.required, Validators.maxLength(160)]],
  });

  audienceForm = this.fb.group({
    name:         ['', Validators.required],
    form_id:      [null as number | null],
    gender:       [''],
    age_min:      [null as number | null],
    age_max:      [null as number | null],
    neighborhood: [''],
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.svc.getCampaigns().subscribe({
      next: res => { this.campaigns.set(res.data ?? res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getAudiences().subscribe({ next: a => this.audiences.set(a) });
  }

  createCampaign(): void {
    if (this.campaignForm.invalid) return;
    this.saving.set(true);
    const v = this.campaignForm.value;
    this.svc.createCampaign({ ...v, audience_id: +v.audience_id! } as any).subscribe({
      next: c => {
        this.campaigns.update(list => [c, ...list]);
        this.showCampaignForm.set(false);
        this.campaignForm.reset({ channel: 'sms' });
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  dispatch(c: Campaign): void {
    if (!confirm(`¿Enviar "${c.name}" a todos los respondentes de la audiencia?`)) return;
    this.dispatching.set(c.id);
    this.svc.dispatch(c.id).subscribe({
      next: res => {
        alert(res.message);
        this.campaigns.update(list => list.map(x => x.id === c.id ? { ...x, status: 'sending' as any } : x));
        this.dispatching.set(null);
      },
      error: err => {
        alert(err?.error?.message ?? 'Error al despachar la campaña.');
        this.dispatching.set(null);
      },
    });
  }

  cancelCampaign(id: number): void {
    if (!confirm('¿Cancelar esta campaña?')) return;
    this.svc.cancel(id).subscribe({
      next: () => this.campaigns.update(list => list.map(c => c.id === id ? { ...c, status: 'cancelled' as any } : c)),
    });
  }

  deleteCampaign(id: number): void {
    if (!confirm('¿Eliminar esta campaña?')) return;
    this.svc.deleteCampaign(id).subscribe({
      next: () => this.campaigns.update(list => list.filter(c => c.id !== id)),
    });
  }

  previewCount(): void {
    const v = this.audienceForm.value;
    const filters: Record<string, any> = {};
    if (v.form_id)      filters['form_id']      = v.form_id;
    if (v.gender)       filters['gender']        = v.gender;
    if (v.age_min)      filters['age_min']       = v.age_min;
    if (v.age_max)      filters['age_max']       = v.age_max;
    if (v.neighborhood) filters['neighborhood']  = v.neighborhood;

    this.previewing.set(true);
    this.svc.previewAudience(filters).subscribe({
      next: res => { this.audiencePreviewCount.set(res.count); this.previewing.set(false); },
      error: ()  => this.previewing.set(false),
    });
  }

  createAudience(): void {
    if (this.audienceForm.invalid) return;
    this.saving.set(true);
    const v = this.audienceForm.value;
    const filters: Record<string, any> = {};
    if (v.form_id)      filters['form_id']      = v.form_id;
    if (v.gender)       filters['gender']        = v.gender;
    if (v.age_min)      filters['age_min']       = v.age_min;
    if (v.age_max)      filters['age_max']       = v.age_max;
    if (v.neighborhood) filters['neighborhood']  = v.neighborhood;

    this.svc.createAudience({ name: v.name!, filters, estimated_count: this.audiencePreviewCount() ?? 0 } as any).subscribe({
      next: a => {
        this.audiences.update(list => [a, ...list]);
        this.cancelAudienceForm();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  cancelAudienceForm(): void {
    this.showAudienceForm.set(false);
    this.audienceForm.reset();
    this.audiencePreviewCount.set(null);
  }

  deleteAudience(id: number): void {
    if (!confirm('¿Eliminar esta audiencia?')) return;
    this.svc.deleteAudience(id).subscribe({
      next: () => this.audiences.update(list => list.filter(a => a.id !== id)),
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      draft:     'bg-slate-100 text-slate-500',
      scheduled: 'bg-blue-100 text-blue-600',
      sending:   'bg-amber-100 text-amber-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-500',
    };
    return map[status] ?? 'bg-slate-100 text-slate-500';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador', scheduled: 'Programada',
      sending: 'Enviando', completed: 'Completada', cancelled: 'Cancelada',
    };
    return map[status] ?? status;
  }

  filtersLabel(filters: Record<string, any>): string {
    const parts: string[] = [];
    if (filters['form_id'])      parts.push(`Form #${filters['form_id']}`);
    if (filters['gender']) {
      const gMap: Record<string, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' };
      parts.push(gMap[filters['gender']] ?? filters['gender']);
    }
    if (filters['age_min'] || filters['age_max']) parts.push(`${filters['age_min'] ?? '?'}–${filters['age_max'] ?? '?'} años`);
    if (filters['neighborhood']) parts.push(filters['neighborhood']);
    return parts.length ? parts.join(' · ') : 'Sin filtros (todos)';
  }
}
