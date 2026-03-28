import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ParameterGroup, ParameterField, TestResult, ParametersService } from './parameters.service';

@Component({
  selector: 'app-parameters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ToastModule],
  providers: [MessageService],
  template: `
<p-toast position="top-right" />

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold text-slate-800">Parámetros del Sistema</h2>
      <p class="text-sm text-slate-500 mt-0.5">Configura integraciones y servicios externos</p>
    </div>
    <div class="flex items-center gap-2 text-sm text-slate-500">
      <span class="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
        <span class="w-2 h-2 rounded-full bg-green-500"></span>
        {{ configuredCount() }} de {{ totalGroups() }} grupos configurados
      </span>
    </div>
  </div>

  @if (loading()) {
    <div class="flex items-center justify-center py-24 text-slate-400">
      <svg class="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Cargando parámetros...
    </div>
  } @else {
    <div class="flex gap-6 items-start">

      <!-- Sidebar: group list -->
      <nav class="w-64 shrink-0 space-y-1 sticky top-4">
        @for (group of groups(); track group.id) {
          <button
            (click)="setActiveGroup(group.id)"
            class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium"
            [class]="activeGroupId() === group.id
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'"
          >
            <span class="text-lg leading-none shrink-0">{{ groupIcon(group.icon) }}</span>
            <span class="flex-1 truncate">{{ group.label }}</span>
            @if (isGroupConfigured(group)) {
              <span class="w-2 h-2 rounded-full bg-green-400 shrink-0"></span>
            } @else {
              <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
            }
          </button>
        }
      </nav>

      <!-- Main area -->
      <div class="flex-1 min-w-0">
        @for (group of groups(); track group.id) {
          @if (activeGroupId() === group.id) {
            <div class="space-y-5">

              <!-- Group header -->
              <div class="bg-white rounded-2xl border border-slate-200 p-6">
                <div class="flex items-start justify-between mb-5">
                  <div class="flex items-center gap-3">
                    <div class="text-3xl">{{ groupIcon(group.icon) }}</div>
                    <div>
                      <h3 class="text-lg font-semibold text-slate-800">{{ group.label }}</h3>
                      <p class="text-sm text-slate-500 mt-0.5">{{ group.description }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs px-2.5 py-1 rounded-full font-medium"
                      [class]="isGroupConfigured(group)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'"
                    >
                      {{ group.configured }}/{{ group.total }} campos
                    </span>
                  </div>
                </div>

                <!-- Form fields -->
                @if (forms[group.id]) {
                  <form [formGroup]="forms[group.id]" (ngSubmit)="save(group)" class="space-y-4">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      @for (field of group.fields; track field.key) {
                        <div [class]="field.type === 'url' || field.type === 'email' ? 'sm:col-span-2' : ''">
                          <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            {{ field.label }}
                            @if (field.encrypted) {
                              <span class="ml-1 text-amber-500" title="Campo encriptado">🔒</span>
                            }
                          </label>

                          @if (field.type === 'select') {
                            <select
                              [formControlName]="field.key"
                              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                            >
                              @for (opt of field.options!; track opt) {
                                <option [value]="opt">{{ opt }}</option>
                              }
                            </select>
                          } @else if (field.type === 'password') {
                            <div class="relative">
                              <input
                                [type]="showPasswords[field.key] ? 'text' : 'password'"
                                [formControlName]="field.key"
                                [placeholder]="field.has_value ? '••••••••  (guardado)' : (field.placeholder ?? '')"
                                class="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                                autocomplete="new-password"
                              />
                              <button
                                type="button"
                                (click)="toggleShowPassword(field.key)"
                                class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                              >
                                @if (showPasswords[field.key]) { 🙈 } @else { 👁 }
                              </button>
                            </div>
                            @if (field.has_value) {
                              <p class="text-xs text-green-600 mt-1">✓ Valor guardado — deja vacío para mantenerlo</p>
                            }
                          } @else {
                            <input
                              [type]="field.type"
                              [formControlName]="field.key"
                              [placeholder]="field.placeholder ?? ''"
                              class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                            />
                          }

                          @if (field.description) {
                            <p class="text-xs text-slate-400 mt-1">{{ field.description }}</p>
                          }
                        </div>
                      }
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-3 pt-2 border-t border-slate-100">
                      <button
                        type="submit"
                        [disabled]="saving()"
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors"
                      >
                        @if (saving()) {
                          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Guardando...
                        } @else {
                          💾 Guardar
                        }
                      </button>

                      <button
                        type="button"
                        (click)="testConnection(group)"
                        [disabled]="testing()"
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        @if (testing()) {
                          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Probando...
                        } @else {
                          🔌 Probar Conexión
                        }
                      </button>

                      <button
                        type="button"
                        (click)="toggleSendTest(group.id)"
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-white border text-sm font-medium rounded-xl transition-colors"
                        [class]="showSendTest() === group.id
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'"
                      >
                        📨 Enviar Prueba Real
                      </button>
                    </div>

                    <!-- Send test panel -->
                    @if (showSendTest() === group.id) {
                      <div class="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
                        <p class="text-sm font-semibold text-indigo-800">
                          {{ sendTestTitle(group.id) }}
                        </p>
                        <p class="text-xs text-indigo-600">{{ sendTestDescription(group.id) }}</p>

                        @if (group.id !== 'n8n') {
                          <div class="space-y-2">
                            <!-- Phone / email / address input -->
                            <input
                              [value]="sendTestTargetValue()"
                              (input)="sendTestTargetValue.set($any($event.target).value)"
                              [type]="sendTestInputType(group.id)"
                              [placeholder]="sendTestPlaceholder(group.id)"
                              class="w-full px-3 py-2 border border-indigo-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />

                            <!-- SMS: text area + send button -->
                            @if (group.id === 'sms') {
                              <textarea
                                [value]="sendTestMessage()"
                                (input)="sendTestMessage.set($any($event.target).value)"
                                placeholder="Texto del SMS (máx 160 caracteres). Vacío = mensaje por defecto."
                                maxlength="160"
                                rows="2"
                                class="w-full px-3 py-2 border border-indigo-200 bg-white rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              ></textarea>
                              <div class="flex items-center justify-between">
                                <span class="text-xs text-indigo-500">{{ sendTestMessage().length }}/160 caracteres</span>
                                <button
                                  type="button"
                                  (click)="doSendTest(group)"
                                  [disabled]="sendTesting() || !sendTestTargetValue().trim()"
                                  class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                  @if (sendTesting()) {
                                    <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                    </svg>
                                    Enviando...
                                  } @else {
                                    Enviar SMS →
                                  }
                                </button>
                              </div>
                            } @else {
                              <!-- Other groups: single send button -->
                              <button
                                type="button"
                                (click)="doSendTest(group)"
                                [disabled]="sendTesting() || !sendTestTargetValue().trim()"
                                class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                              >
                                @if (sendTesting()) {
                                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                  </svg>
                                  Enviando...
                                } @else {
                                  Enviar →
                                }
                              </button>
                            }
                          </div>
                        } @else {
                          <button
                            type="button"
                            (click)="doSendTest(group)"
                            [disabled]="sendTesting()"
                            class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            @if (sendTesting()) {
                              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                              Disparando webhooks...
                            } @else {
                              ⚡ Disparar todos los webhooks n8n
                            }
                          </button>
                        }

                        <!-- Send test result -->
                        @if (sendTestResult()) {
                          <div class="rounded-lg overflow-hidden border"
                            [class]="sendTestResult()!.success ? 'border-green-200' : 'border-red-200'">
                            <div class="flex items-center gap-2 px-4 py-3"
                              [class]="sendTestResult()!.success ? 'bg-green-50' : 'bg-red-50'">
                              <span>{{ sendTestResult()!.success ? '✅' : '❌' }}</span>
                              <p class="text-sm font-medium"
                                [class]="sendTestResult()!.success ? 'text-green-800' : 'text-red-800'">
                                {{ sendTestResult()!.message }}
                              </p>
                            </div>
                            @if (sendTestResultDetails().length > 0) {
                              <div class="px-4 py-3 bg-white space-y-1">
                                @for (d of sendTestResultDetails(); track d.key) {
                                  <div class="flex gap-2 text-xs">
                                    <span class="text-slate-500 font-medium shrink-0">{{ d.key }}:</span>
                                    <span class="text-slate-700">{{ d.value }}</span>
                                  </div>
                                }
                              </div>
                            }
                            <div class="bg-slate-900 p-3 font-mono text-xs space-y-1 max-h-36 overflow-y-auto">
                              @for (entry of sendTestResult()!.log; track $index) {
                                <div class="flex gap-2 items-start">
                                  <span class="text-slate-500 shrink-0">{{ entry.time }}</span>
                                  <span class="shrink-0 w-14"
                                    [class]="entry.level === 'success' ? 'text-green-400'
                                           : entry.level === 'error'   ? 'text-red-400'
                                           : 'text-blue-400'"
                                  >{{ entry.level.toUpperCase() }}</span>
                                  <span class="text-slate-300 break-all">{{ entry.message }}</span>
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </form>
                }
              </div>

              <!-- Test result panel -->
              @if (testResult()) {
                <div class="bg-white rounded-2xl border overflow-hidden"
                  [class]="testResult()!.success ? 'border-green-200' : 'border-red-200'">

                  <!-- Result header -->
                  <div class="flex items-center gap-3 px-5 py-4"
                    [class]="testResult()!.success ? 'bg-green-50' : 'bg-red-50'">
                    <span class="text-xl">{{ testResult()!.success ? '✅' : '❌' }}</span>
                    <div class="flex-1">
                      <p class="font-semibold text-sm"
                        [class]="testResult()!.success ? 'text-green-800' : 'text-red-800'">
                        {{ testResult()!.message }}
                      </p>
                    </div>
                    <button (click)="testResult.set(null)" class="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none">×</button>
                  </div>

                  <!-- Details -->
                  @if (testResultDetails().length > 0) {
                    <div class="px-5 py-3 border-b border-slate-100">
                      <div class="grid grid-cols-2 gap-x-6 gap-y-2">
                        @for (detail of testResultDetails(); track detail.key) {
                          <div class="flex gap-2 text-sm">
                            <span class="text-slate-500 font-medium shrink-0">{{ detail.key }}:</span>
                            <span class="text-slate-800 truncate">{{ detail.value }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Debug log -->
                  <div class="bg-slate-900 rounded-b-2xl p-4 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
                    <p class="text-slate-400 mb-2 font-sans font-semibold text-xs uppercase tracking-wide">Debug Log</p>
                    @for (entry of testResult()!.log; track $index) {
                      <div class="flex gap-3 items-start">
                        <span class="text-slate-500 shrink-0">{{ entry.time }}</span>
                        <span class="shrink-0 w-14"
                          [class]="entry.level === 'success' ? 'text-green-400'
                                 : entry.level === 'error'   ? 'text-red-400'
                                 : 'text-blue-400'"
                        >{{ entry.level.toUpperCase() }}</span>
                        <span class="text-slate-300 break-all">{{ entry.message }}</span>
                      </div>
                    }
                    @if (testResult()!.log.length === 0) {
                      <span class="text-slate-500">Sin entradas de log.</span>
                    }
                  </div>
                </div>
              }

            </div>
          }
        }
      </div>

    </div>
  }
</div>
  `,
})
export class ParametersComponent implements OnInit {
  private svc = inject(ParametersService);
  private fb  = inject(FormBuilder);
  private ms  = inject(MessageService);

  groups        = signal<ParameterGroup[]>([]);
  activeGroupId = signal<string>('whatsapp_otp');
  loading       = signal(true);
  saving        = signal(false);
  testing       = signal(false);
  testResult    = signal<TestResult | null>(null);

  // Send test
  showSendTest        = signal<string | null>(null);
  sendTesting         = signal(false);
  sendTestResult      = signal<TestResult | null>(null);
  sendTestTargetValue = signal('');
  sendTestMessage     = signal('');

  forms: Record<string, FormGroup> = {};
  showPasswords: Record<string, boolean> = {};

  configuredCount = computed(() =>
    this.groups().filter(g => g.configured === g.total).length
  );
  totalGroups = computed(() => this.groups().length);

  testResultDetails = computed(() => {
    const r = this.testResult();
    if (!r) return [];
    return Object.entries(r.details).map(([key, value]) => ({ key, value }));
  });

  sendTestResultDetails = computed(() => {
    const r = this.sendTestResult();
    if (!r) return [];
    return Object.entries(r.details).map(([key, value]) => ({ key, value }));
  });

  ngOnInit() {
    this.loadGroups();
  }

  setActiveGroup(id: string) {
    this.activeGroupId.set(id);
    this.testResult.set(null);
  }

  loadGroups() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: (groups) => {
        this.groups.set(groups);
        groups.forEach(group => {
          const controls: Record<string, FormControl> = {};
          group.fields.forEach(field => {
            controls[field.key] = new FormControl(
              field.encrypted ? '' : (field.value ?? field.default ?? '')
            );
            if (field.type === 'password') {
              this.showPasswords[field.key] = false;
            }
          });
          this.forms[group.id] = this.fb.group(controls);
        });
        this.loading.set(false);
      },
      error: () => {
        this.ms.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los parámetros.' });
        this.loading.set(false);
      },
    });
  }

  save(group: ParameterGroup) {
    const form = this.forms[group.id];
    if (!form) return;
    this.saving.set(true);
    this.svc.save(group.id, form.getRawValue()).subscribe({
      next: () => {
        this.ms.add({ severity: 'success', summary: 'Guardado', detail: `Parámetros de ${group.label} guardados.` });
        this.saving.set(false);
        this.loadGroups();
      },
      error: (e) => {
        this.ms.add({ severity: 'error', summary: 'Error', detail: e.error?.message ?? 'Error al guardar.' });
        this.saving.set(false);
      },
    });
  }

  testConnection(group: ParameterGroup) {
    this.testing.set(true);
    this.testResult.set(null);
    this.svc.testConnection(group.id).subscribe({
      next: (result) => {
        this.testResult.set(result);
        this.testing.set(false);
      },
      error: (e) => {
        this.testResult.set({
          success: false,
          message: e.error?.message ?? 'Error de red al probar la conexión.',
          details: {},
          log: [],
        });
        this.testing.set(false);
      },
    });
  }

  toggleShowPassword(key: string) {
    this.showPasswords[key] = !this.showPasswords[key];
  }

  toggleSendTest(groupId: string) {
    if (this.showSendTest() === groupId) {
      this.showSendTest.set(null);
    } else {
      this.showSendTest.set(groupId);
      this.sendTestTargetValue.set('');
      this.sendTestMessage.set('');
      this.sendTestResult.set(null);
    }
  }

  doSendTest(group: ParameterGroup) {
    this.sendTesting.set(true);
    this.sendTestResult.set(null);
    this.svc.sendTest(group.id, this.sendTestTargetValue().trim(), this.sendTestMessage().trim() || undefined).subscribe({
      next: (result) => {
        this.sendTestResult.set(result);
        this.sendTesting.set(false);
      },
      error: (e) => {
        this.sendTestResult.set({
          success: false,
          message: e.error?.message ?? 'Error al enviar la prueba.',
          details: {},
          log: [],
        });
        this.sendTesting.set(false);
      },
    });
  }

  sendTestInputType(groupId: string): string {
    return groupId === 'email' ? 'email' : 'text';
  }

  sendTestPlaceholder(groupId: string): string {
    if (groupId === 'email')  return 'correo@ejemplo.com';
    if (groupId === 'maps')   return 'Bogotá, Colombia';
    return '+57 300 000 0000';
  }

  sendTestTitle(groupId: string): string {
    const titles: Record<string, string> = {
      whatsapp_otp:      'Enviar OTP de prueba por WhatsApp',
      whatsapp_template: 'Probar envío de template (Cuenta 2)',
      sms:               'Enviar SMS de prueba',
      calls:             'Iniciar llamada de prueba',
      email:             'Enviar email de prueba',
      maps:              'Geocodificar una dirección',
      n8n:               'Disparar todos los webhooks de n8n',
    };
    return titles[groupId] ?? 'Enviar prueba';
  }

  sendTestDescription(groupId: string): string {
    const desc: Record<string, string> = {
      whatsapp_otp:      'Se enviará la plantilla OTP configurada con el código "1234" al número que ingreses.',
      whatsapp_template: 'Se enviará un payload de prueba al webhook de templates de n8n (o se verifican las credenciales).',
      sms:               'Se enviará un SMS real con mensaje de prueba al número que ingreses.',
      calls:             'Se iniciará una llamada de prueba con el audio configurado al número que ingreses.',
      email:             'Se enviará un correo de prueba a la dirección que ingreses usando la configuración SMTP guardada.',
      maps:              'Se geocodificará la dirección ingresada con la API de Google Maps configurada.',
      n8n:               'Se enviará un payload de prueba a todos los webhooks configurados simultáneamente.',
    };
    return desc[groupId] ?? '';
  }

  isGroupConfigured(group: ParameterGroup): boolean {
    return group.configured > 0;
  }

  groupIcon(icon: string): string {
    const icons: Record<string, string> = {
      whatsapp: '💬',
      sms:      '📱',
      phone:    '📞',
      email:    '✉️',
      map:      '🗺️',
      settings: '⚙️',
    };
    return icons[icon] ?? '🔧';
  }
}
