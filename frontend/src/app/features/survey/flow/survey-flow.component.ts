import {
  Component, OnInit, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { PublishedForm, SurveyField, SurveyPayload, SurveyService } from './survey.service';
import { OfflineSurveyService } from './offline-survey.service';
import { catchError, finalize, of } from 'rxjs';

type FlowStep = 'form-select' | 'phone' | 'otp' | 'survey' | 'success';

@Component({
  selector: 'app-survey-flow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col font-['Inter']">
      
      <!-- ── Premium Header ─────────────────────────────────────────── -->
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm transition-all duration-300">
        <div class="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center gap-3">
             @if (step() !== 'form-select' && step() !== 'success') {
               <button (click)="goBack()" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
               </button>
             }
             <div>
               <h1 class="text-sm font-black text-slate-800 tracking-tight leading-none">
                 {{ activeForm() ? activeForm()!.name : 'Pulxo Operativo' }}
               </h1>
               <div class="flex items-center gap-1.5 mt-1">
                 <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ stepLabel() }}</span>
               </div>
             </div>
          </div>
          
          <div class="flex items-center gap-2">
            <div class="text-right mr-2 hidden xs:block">
              <p class="text-[10px] font-black text-slate-400 leading-none">HOY</p>
              <p class="text-xs font-black text-blue-600 leading-none mt-0.5">{{ todayCount() }}</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shadow-md shadow-blue-100">
              {{ auth.user()?.name?.charAt(0) }}
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="h-1 bg-slate-100 overflow-hidden">
          <div class="h-full bg-blue-500 transition-all duration-700 ease-out" [style.width.%]="progress()"></div>
        </div>
      </header>

      <main class="flex-1 max-w-xl mx-auto w-full p-4 space-y-6">
        
        <!-- ═══ STEP: form-select ══════════════════════════════════════════ -->
        @if (step() === 'form-select') {
          <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 px-2 pt-4">
            <h2 class="text-2xl font-black text-slate-900 leading-tight">Bienvenido, {{ (auth.user()?.name ?? '').split(' ')[0] }}</h2>
            <p class="text-slate-500 text-sm mt-2">Selecciona el formulario que aplicarás en esta jornada.</p>

            <div class="grid grid-cols-1 gap-4 mt-8">
              @if (loadingForms()) {
                @for (i of [1,2,3]; track i) {
                  <div class="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse"></div>
                }
              } @else {
                @for (f of forms(); track f.id) {
                  <button (click)="selectForm(f)"
                    class="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all text-left relative overflow-hidden">
                    <div class="flex items-start gap-4">
                      <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      </div>
                      <div class="flex-1">
                        <h3 class="font-black text-slate-800 transition-colors group-hover:text-blue-600">{{ f.name }}</h3>
                        <p class="text-xs text-slate-500 mt-1 line-clamp-1">{{ f.description || 'Sin descripción' }}</p>
                        <div class="flex items-center gap-3 mt-3">
                          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-2 py-0.5 rounded-full">{{ f.fields_count ?? 0 }} preguntas</span>
                          <span class="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">Comenzar →</span>
                        </div>
                      </div>
                    </div>
                  </button>
                }
              }
            </div>
          </div>
        }

        <!-- ═══ STEP: phone ════════════════════════════════════════════════ -->
        @if (step() === 'phone') {
          <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-sm mx-auto pt-8">
            <div class="text-center mb-8">
              <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              </div>
              <h2 class="text-2xl font-black text-slate-900">Validación de Celular</h2>
              <p class="text-slate-500 text-sm mt-2 px-4">Ingresa el número del respondente para verificar su identidad y evitar duplicados.</p>
            </div>

            <form [formGroup]="phoneForm" (ngSubmit)="submitPhone()" class="space-y-4">
              <div class="relative">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-4 bg-slate-50 px-1 z-10">Número Celular</label>
                <input formControlName="phone" type="tel" inputmode="numeric"
                  placeholder="300 000 0000"
                  class="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-lg font-bold focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-300" />
              </div>

              @if (error()) {
                <div class="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs flex items-center gap-3 animate-in fade-in zoom-in-95">
                  <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p class="leading-relaxed">{{ error() }}</p>
                </div>
              }

              <button type="submit" [disabled]="phoneForm.invalid || busy()"
                class="w-full bg-slate-950 text-white py-4 rounded-2xl text-sm font-black shadow-xl shadow-slate-200 hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                @if (busy()) { <span class="animate-spin text-xl">◌</span> }
                Continuar a OTP
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </form>
          </div>
        }

        <!-- ═══ STEP: otp ══════════════════════════════════════════════════ -->
        @if (step() === 'otp') {
          <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-sm mx-auto pt-8">
            <div class="text-center mb-8">
              <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <h2 class="text-2xl font-black text-slate-900">Verificar Código</h2>
              <p class="text-slate-500 text-sm mt-2">Hemos enviado un código de 4 dígitos a <br><strong class="text-slate-900">{{ phoneDisplay() }}</strong></p>
              @if (testOtp()) {
                <div class="mt-4 p-2 bg-yellow-50 border border-yellow-100 rounded-xl">
                  <p class="text-[10px] font-black text-yellow-700 uppercase tracking-widest">Código Test (Temp)</p>
                  <p class="text-lg font-black text-yellow-800">{{ testOtp() }}</p>
                </div>
              }
            </div>

            <form [formGroup]="otpForm" (ngSubmit)="submitOtp()" class="space-y-8">
              <div class="flex gap-3 justify-center">
                @for (i of [0,1,2,3]; track i) {
                  <input [id]="'otp-' + i" type="text" inputmode="numeric" maxlength="1"
                    class="w-16 h-16 text-center text-3xl font-black border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white focus:outline-none bg-white/50 transition-all shadow-sm"
                    (input)="onOtpInput($event, i)"
                    (keydown)="onOtpKeydown($event, i)" />
                }
              </div>

              @if (error()) {
                <div class="bg-red-50 text-red-600 p-4 rounded-xl text-xs text-center border border-red-100">
                  {{ error() }}
                </div>
              }

              <div class="space-y-4">
                <button type="submit" [disabled]="otpCode().length !== 4 || busy()"
                  class="w-full bg-slate-900 text-white py-4 rounded-2xl text-sm font-black shadow-xl disabled:opacity-50 transition-all active:scale-95">
                  @if (busy()) { <span class="animate-spin mr-2">◌</span> Verificando... }
                  @else { Verificar y Comenzar }
                </button>
                
                <div class="text-center">
                  <button type="button" (click)="resendOtp()" [disabled]="busy()"
                    class="text-xs font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 disabled:opacity-30">
                    Reenviar código
                  </button>
                  <p class="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">Expira {{ otpExpiresAt() }}</p>
                </div>
              </div>
            </form>
          </div>
        }

        <!-- ═══ STEP: survey (Fixed + Dynamic Combined) ════════════════════ -->
        @if (step() === 'survey') {
          <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-32">
            
            <!-- Context Header -->
            <div class="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
              <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div class="relative z-10">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Encuesta Activa</p>
                <h2 class="text-xl font-black leading-tight">{{ activeForm()?.name }}</h2>
                <div class="flex items-center gap-2 mt-4">
                  <div class="flex -space-x-2">
                    <div class="w-6 h-6 rounded-full border-2 border-blue-600 bg-white/20"></div>
                    <div class="w-6 h-6 rounded-full border-2 border-blue-600 bg-white/40"></div>
                  </div>
                  <span class="text-xs font-bold opacity-90">{{ phoneDisplay() }}</span>
                </div>
              </div>
            </div>

            <form (ngSubmit)="submitSurvey()" class="space-y-8">
              
              <!-- ── Sección A: Identificación (Demo) ── -->
              <div [formGroup]="demoForm" class="space-y-6">
                <div class="flex items-center gap-3 px-2">
                  <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                  <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest">A. Información de Perfil</h3>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nombre</label>
                    <input formControlName="name" type="text" placeholder="Ej. Juan" class="clean-input" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Apellidos</label>
                    <input formControlName="last_name" type="text" placeholder="Ej. Pérez" class="clean-input" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Género</label>
                    <select formControlName="gender" class="clean-select">
                      <option value="">Selecciona...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="O">Otro</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Edad</label>
                    <input formControlName="age" type="number" placeholder="Años" class="clean-input" />
                  </div>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Ocupación</label>
                  <input formControlName="occupation" type="text" placeholder="¿A qué se dedica?" class="clean-input" />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Barrio</label>
                    <input formControlName="neighborhood" type="text" placeholder="Barrio" class="clean-input" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Dirección</label>
                    <input formControlName="address" type="text" placeholder="Calle/Cra" class="clean-input" />
                  </div>
                </div>

                <!-- ── Sección B: Opinión (Fixed) ── -->
                <div class="flex items-center gap-3 px-2 pt-4">
                  <span class="w-1.5 h-6 bg-[#25d366] rounded-full"></span>
                  <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest">B. Percepción Nacional</h3>
                </div>

                <!-- Clima -->
                <div class="space-y-3">
                  <p class="text-sm font-black text-slate-800 px-2 leading-snug">¿Considera usted que el país está hoy...?</p>
                  <div class="space-y-2">
                    <label class="radio-card">
                      <input type="radio" formControlName="clima" value="Avanzando" class="hidden" />
                      <div class="radio-ui"></div>
                      <span class="text-sm font-bold text-slate-700">Avanzando</span>
                    </label>
                    <label class="radio-card">
                      <input type="radio" formControlName="clima" value="Estancado" class="hidden" />
                      <div class="radio-ui"></div>
                      <span class="text-sm font-bold text-slate-700">Estancado</span>
                    </label>
                    <label class="radio-card">
                      <input type="radio" formControlName="clima" value="Retrocediendo" class="hidden" />
                      <div class="radio-ui"></div>
                      <span class="text-sm font-bold text-slate-700">Retrocediendo</span>
                    </label>
                  </div>
                </div>

                <!-- Problema -->
                <div class="space-y-3 pt-4">
                  <p class="text-sm font-black text-slate-800 px-2 leading-snug">¿Cuál es hoy el principal problema que afecta a su familia?</p>
                  <div class="grid grid-cols-1 gap-2">
                    @for (prob of ['Inseguridad', 'Falta de empleo', 'Costo de vida', 'Salud', 'Corrupción', 'Falta de oportunidades', 'Otro']; track prob) {
                      <label class="radio-card p-4">
                        <input type="radio" formControlName="problema" [value]="prob" class="hidden" />
                        <div class="radio-ui"></div>
                        <span class="text-sm font-bold text-slate-700 uppercase tracking-tighter">{{ prob }}</span>
                      </label>
                    }
                  </div>
                </div>

                <!-- Liderazgo -->
                <div class="space-y-3 pt-4">
                  <p class="text-sm font-black text-slate-800 px-2 leading-snug">¿Qué tipo de liderazgo cree que necesita Colombia?</p>
                  <div class="space-y-2">
                    <label class="radio-card">
                      <input type="radio" formControlName="liderazgo" value="Unión y Firmeza" class="hidden" />
                      <div class="radio-ui"></div>
                      <span class="text-sm font-bold text-slate-700">Unión y decisiones firmes</span>
                    </label>
                    <label class="radio-card">
                      <input type="radio" formControlName="liderazgo" value="Continuidad" class="hidden" />
                      <div class="radio-ui"></div>
                      <span class="text-sm font-bold text-slate-700">Mantener las cosas como están</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- ── Sección C: Preguntas Específicas (Dynamic) ── -->
              @if (activeFields().length > 0) {
                <div [formGroup]="fieldsForm" class="space-y-6 pt-4">
                  <div class="flex items-center gap-3 px-2">
                    <span class="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest">C. Bloque Formulario</h3>
                  </div>

                  @for (field of activeFields(); track field.id) {
                    <div class="space-y-3">
                      <p class="text-sm font-black text-slate-800 px-2 leading-snug">{{ field.label }}</p>
                      
                      @if (field.field_type === 'text') {
                        <input [formControlName]="field.field_key" type="text" class="clean-input" />
                      }

                      @if (field.field_type === 'radio') {
                        <div class="space-y-2">
                          @for (opt of field.options; track opt.value) {
                            <label class="radio-card">
                              <input type="radio" [formControlName]="field.field_key" [value]="opt.value" class="hidden" />
                              <div class="radio-ui"></div>
                              <span class="text-sm font-bold text-slate-700">{{ opt.label }}</span>
                            </label>
                          }
                        </div>
                      }

                      @if (field.field_type === 'checkbox') {
                        <div class="space-y-2">
                          @for (opt of field.options; track opt.value) {
                            <label class="radio-card">
                              <input type="checkbox" [value]="opt.value" class="hidden" 
                                (change)="onCheckbox(field.field_key, opt.value, $event)"
                                [checked]="isChecked(field.field_key, opt.value)" />
                              <div class="checkbox-ui"></div>
                              <span class="text-sm font-bold text-slate-700">{{ opt.label }}</span>
                            </label>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- ── Sección D: Ubicación ── -->
              <div class="space-y-6 pt-8">
                <div class="flex items-center gap-3 px-2">
                  <span class="w-1.5 h-6 bg-red-500 rounded-full"></span>
                  <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest">D. Verificación Georeferenciada</h3>
                </div>

                <div class="bg-slate-100 rounded-[2.5rem] p-8 text-center space-y-4 border-2 border-dashed border-slate-200">
                  @if (gpsStatus() === 'captured') {
                    <div class="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-100 animate-in zoom-in">
                       <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <p class="text-xs font-black text-green-600 uppercase tracking-widest">📍 Ubicación Capturada</p>
                  } @else {
                    <button type="button" (click)="captureGps()" [disabled]="gpsStatus() === 'loading'"
                      class="px-8 py-3 bg-white border-2 border-slate-300 rounded-full text-xs font-black tracking-widest hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-2 mx-auto disabled:opacity-50">
                      @if (gpsStatus() === 'loading') { <span class="animate-spin text-lg">◌</span> Capturando... }
                      @else { 📍 CAPTURAR GPS }
                    </button>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">La captura es obligatoria para validar la visita.</p>
                  }
                </div>
              </div>

              <!-- Submit -->
              <div class="pt-8 px-2">
                @if (error()) {
                  <p class="text-xs font-bold text-red-500 text-center mb-4 animate-bounce">{{ error() }}</p>
                }
                
                <button type="submit" [disabled]="!canSubmit() || busy()"
                  class="w-full bg-slate-950 text-white py-5 rounded-[2rem] text-sm font-black shadow-2xl shadow-slate-300 hover:shadow-slate-400 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale">
                  {{ busy() ? 'Sincronizando...' : 'FINALIZAR ENCUESTA ✅' }}
                </button>
              </div>

            </form>
          </div>
        }

        <!-- ═══ STEP: success ══════════════════════════════════════════════ -->
        @if (step() === 'success') {
          <div class="animate-in fade-in zoom-in duration-700 pt-20 px-6 text-center space-y-8">
            <div class="w-24 h-24 bg-green-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-green-200 rotate-12">
               <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
            </div>
            
            <div class="space-y-2">
              <h2 class="text-3xl font-black text-slate-900 tracking-tight">¡Excelente trabajo!</h2>
              <p class="text-slate-500 font-medium">La encuesta ha sido registrada con éxito en el sistema nacional.</p>
            </div>

            <div class="bg-blue-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
               <div class="relative z-10 text-center space-y-1">
                 <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Meta Personal</p>
                 <p class="text-4xl font-black">{{ todayCount() }}</p>
                 <p class="text-xs font-bold opacity-80 pt-1">ENCUESTAS LOGRADAS HOY</p>
               </div>
               <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
            </div>

            <button (click)="startNew()" 
              class="w-full py-5 bg-white border-2 border-slate-200 rounded-[2rem] text-sm font-black text-slate-800 shadow-xl shadow-slate-100 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95">
              NUEVA ENCUESTA
            </button>
          </div>
        }
      </main>
    </div>
  `,
})
export class SurveyFlowComponent implements OnInit {
  readonly auth = inject(AuthService);
  private svc     = inject(SurveyService);
  private offline = inject(OfflineSurveyService);
  private fb      = inject(FormBuilder);

  // ── State ─────────────────────────────────────────────────────────────────
  step          = signal<FlowStep>('form-select');
  forms         = signal<PublishedForm[]>([]);
  activeForm    = signal<PublishedForm | null>(null);
  loadingForms  = signal(true);
  busy          = signal(false);
  error         = signal<string | null>(null);
  todayCount    = signal(0);

  // OTP
  otpCode       = signal('');
  otpExpiresAt  = signal<string | null>(null);
  testOtp       = signal<string | null>(null);

  // Phone
  normalizedPhone = signal('');

  phoneDisplay = computed(() => {
    const p = this.normalizedPhone();
    if (p.length === 12) return `+${p.slice(0,2)} ${p.slice(2,5)} ${p.slice(5,8)} ${p.slice(8)}`;
    return p;
  });

  // GPS
  encLat       = signal<number | null>(null);
  encLng       = signal<number | null>(null);
  gpsStatus    = signal<'idle' | 'loading' | 'captured' | 'denied'>('idle');

  // Checkbox state (field_key → Set of values)
  private checkboxState: Record<string, Set<string>> = {};

  // Field GPS (address_gps fields)
  private fieldGps: Record<string, { lat: number; lng: number }> = {};

  // ── Group (from sessionStorage) ───────────────────────────────────────────
  private get groupId(): number | null {
    try {
      const raw = sessionStorage.getItem('pulxo_group');
      return raw ? JSON.parse(raw).id : null;
    } catch { return null; }
  }

  activeFields = computed<SurveyField[]>(() => {
    const form = this.activeForm();
    if (!form?.fields) return [];
    return form.fields;
  });

  // ── Step labels ───────────────────────────────────────────────────────────
  stepLabel = computed(() => {
    const steps: FlowStep[] = ['form-select', 'phone', 'otp', 'survey', 'success'];
    const current = this.step();
    const idx = steps.indexOf(current);
    
    if (current === 'success') return 'Finalizado';

    const labels: Record<FlowStep, string> = {
      'form-select':  'Iniciando',
      'phone':        'Celular',
      'otp':          'Validando',
      'survey':       'Encuesta',
      'success':      'Éxito',
    };
    return labels[current];
  });

  // ── Forms ─────────────────────────────────────────────────────────────────
  phoneForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^[0-9\s\+\-]{7,15}$/)]],
  });

  otpForm = this.fb.group({});

  demoForm = this.fb.group({
    name:         ['', Validators.required],
    last_name:    ['', Validators.required],
    gender:       [''],
    age:          [null as number | null],
    occupation:   [''],
    neighborhood: ['', Validators.required],
    address:      ['', Validators.required],
    // Political
    clima:        ['', Validators.required],
    problema:     ['', Validators.required],
    liderazgo:    ['', Validators.required],
  });

  fieldsForm: FormGroup = this.fb.group({});

  // ── Progress tracking ───────────────────────────────────────────────────
  progress = computed(() => {
    const steps: FlowStep[] = ['form-select', 'phone', 'otp', 'survey', 'success'];
    const current = this.step();
    const idx = steps.indexOf(current);
    return ((idx + 1) / steps.length) * 100;
  });

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadForms();
    this.loadTodayCount();
    // Don't auto-resume here to avoid UI jump, we'll do it after form selection or via a "Resume" button
  }

  loadForms(): void {
    this.loadingForms.set(true);
    this.svc.getPublishedForms().subscribe({
      next: (res: { data: PublishedForm[] } | PublishedForm[]) => { 
        const data = Array.isArray(res) ? res : res.data;
        this.forms.set(data); 
        this.loadingForms.set(false); 
      },
      error: () => this.loadingForms.set(false),
    });
  }

  loadTodayCount(): void {
    this.svc.getMySurveys().subscribe({ next: (s: any[]) => this.todayCount.set(s.length) });
  }

  selectForm(form: PublishedForm): void {
    this.busy.set(true);
    this.svc.getForm(form.id).subscribe({
      next: (full: PublishedForm) => {
        this.activeForm.set(full);
        this.buildFieldsForm(full.fields ?? []);
        this.busy.set(false);
        this.checkExistingDraft(full.id);
      },
      error: () => this.busy.set(false),
    });
  }

  private async checkExistingDraft(formId: number): Promise<void> {
    const draft = await this.offline.getDraft(`draft_${formId}`);
    if (draft) {
      if (confirm(`Se encontró un borrador pendiente para ${this.activeForm()?.name}. ¿Deseas retomarlo?`)) {
        this.resumeDraft(draft);
        return;
      } else {
        await this.offline.deleteDraft(draft.id);
      }
    }
    this.step.set('phone');
  }

  private resumeDraft(draft: any): void {
    this.normalizedPhone.set(draft.data.phone || '');
    this.phoneForm.patchValue({ phone: draft.data.phone || '' });
    this.demoForm.patchValue(draft.data.demographics || {});
    this.fieldsForm.patchValue(draft.data.responses || {});
    this.step.set(draft.step as FlowStep);
  }

  private async saveCurrentDraft(): Promise<void> {
    if (!this.activeForm()) return;
    const draftId = `draft_${this.activeForm()!.id}`;
    await this.offline.saveDraft({
      id: draftId,
      formId: this.activeForm()!.id,
      step: this.step(),
      data: {
        phone: this.normalizedPhone(),
        demographics: this.demoForm.value,
        responses: this.fieldsForm.value
      },
      updated_at: Date.now()
    });
  }

  // ── Phone step ────────────────────────────────────────────────────────────

  submitPhone(): void {
    if (this.phoneForm.invalid) return;
    const raw = this.phoneForm.value.phone!;
    const digits = raw.replace(/\D/g, '');
    const phone  = digits.length === 10 ? '57' + digits : digits;
    this.normalizedPhone.set(phone);
    this.error.set(null);
    this.busy.set(true);

    this.svc.checkDuplicate(phone, this.activeForm()!.id).subscribe({
      next: res => {
        if (res.duplicate) {
           // We'll handle registration date if backend returns it in res
           // but traditionally checkDuplicate returns duplicate: true
           // If we use sendOtp directly, it also checks for duplicate and returns 409
           // Let's rely on sendOtp for the registration date as it's more efficient
        }
        
        this.svc.sendOtp(phone, this.activeForm()!.id).subscribe({
          next: otp => {
            this.otpExpiresAt.set(new Date(otp.expires_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
            this.testOtp.set(otp.code || null);
            this.busy.set(false);
            this.step.set('otp');
            this.saveCurrentDraft();
          },
          error: err => {
            if (err.status === 409 && err.error?.submitted_at) {
              this.error.set(`Este número ya fue registrado el día ${err.error.submitted_at}. No se puede duplicar.`);
            } else {
              this.error.set(err?.error?.message ?? 'Error enviando OTP. Intenta de nuevo.');
            }
            this.busy.set(false);
          },
        });
      },
      error: () => { 
        this.error.set('Error verificando el número. Intenta de nuevo.'); 
        this.busy.set(false); 
      },
    });
  }

  // ── OTP step ──────────────────────────────────────────────────────────────

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val   = input.value.replace(/\D/g, '').slice(-1);
    input.value = val;

    const digits = Array.from({ length: 4 }, (_, i) => {
      const el = document.getElementById(`otp-${i}`) as HTMLInputElement;
      return el?.value ?? '';
    });
    this.otpCode.set(digits.join(''));

    // Auto-advance
    if (val && index < 3) {
      (document.getElementById(`otp-${index + 1}`) as HTMLInputElement)?.focus();
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !(event.target as HTMLInputElement).value && index > 0) {
      (document.getElementById(`otp-${index - 1}`) as HTMLInputElement)?.focus();
    }
  }

  submitOtp(): void {
    if (this.otpCode().length !== 4) return;
    this.error.set(null);
    this.busy.set(true);

    this.svc.verifyOtp(this.normalizedPhone(), this.activeForm()!.id, this.otpCode()).subscribe({
      next: res => {
        this.busy.set(false);
        if (res.verified) {
          this.step.set('survey');
          this.saveCurrentDraft();
        } else {
          this.error.set(res.message);
          // Clear OTP boxes
          for (let i = 0; i < 4; i++) {
            const el = document.getElementById(`otp-${i}`) as HTMLInputElement;
            if (el) el.value = '';
          }
          this.otpCode.set('');
        }
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Error verificando el código.');
        this.busy.set(false);
      },
    });
  }

  resendOtp(): void {
    this.error.set(null);
    this.busy.set(true);
    this.svc.sendOtp(this.normalizedPhone(), this.activeForm()!.id).subscribe({
      next: otp => {
        this.otpExpiresAt.set(new Date(otp.expires_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
        this.testOtp.set(otp.code || null);
        this.busy.set(false);
        // Clear boxes
        for (let i = 0; i < 4; i++) {
          const el = document.getElementById(`otp-${i}`) as HTMLInputElement;
          if (el) el.value = '';
        }
        this.otpCode.set('');
      },
      error: () => { this.error.set('Error reenviando el código.'); this.busy.set(false); },
    });
  }


  // ── Fields step ───────────────────────────────────────────────────────────

  private buildFieldsForm(fields: SurveyField[]): void {
    const controls: Record<string, any> = {};
    for (const f of fields) {
      if (f.field_type === 'separator' || f.field_type === 'heading') continue;
      const validators = f.is_required ? [Validators.required] : [];
      controls[f.field_key] = [null, validators];
    }
    this.fieldsForm = this.fb.group(controls);
  }

  onCheckbox(fieldKey: string, value: string, event: Event): void {
    if (!this.checkboxState[fieldKey]) this.checkboxState[fieldKey] = new Set();
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.checkboxState[fieldKey].add(value);
    else          this.checkboxState[fieldKey].delete(value);
    this.fieldsForm.get(fieldKey)?.setValue([...this.checkboxState[fieldKey]]);
  }

  isChecked(fieldKey: string, value: string): boolean {
    return this.checkboxState[fieldKey]?.has(value) ?? false;
  }

  captureFieldGps(fieldKey: string): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      this.fieldGps[fieldKey] = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    });
  }


  // ── GPS step ──────────────────────────────────────────────────────────────

  captureGps(): void {
    if (!navigator.geolocation) { this.gpsStatus.set('denied'); return; }
    this.gpsStatus.set('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.encLat.set(pos.coords.latitude);
        this.encLng.set(pos.coords.longitude);
        this.gpsStatus.set('captured');
      },
      () => this.gpsStatus.set('denied'),
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  submitSurvey(): void {
    this.busy.set(true);
    const demo    = this.demoForm.value;
    const fields  = this.fieldsForm.value;

    // Find address_gps field keys and add their lat/lng from fieldGps
    let addressLat: number | undefined;
    let addressLng: number | undefined;
    const firstGpsKey = Object.keys(this.fieldGps)[0];
    if (firstGpsKey) {
      addressLat = this.fieldGps[firstGpsKey].lat;
      addressLng = this.fieldGps[firstGpsKey].lng;
    }

    const payload = {
      form_id:                this.activeForm()!.id,
      group_id:               this.groupId!,
      respondent_phone:       this.normalizedPhone(),
      respondent_name:        demo.name || undefined,
      respondent_last_name:   demo.last_name || undefined,
      respondent_gender:      demo.gender || undefined,
      respondent_age:         demo.age || undefined,
      respondent_occupation:  demo.occupation || undefined,
      respondent_neighborhood:demo.neighborhood || undefined,
      respondent_address:     demo.address || undefined,
      encuestador_lat:        this.encLat() ?? undefined,
      encuestador_lng:        this.encLng() ?? undefined,
      address_lat:            addressLat,
      address_lng:            addressLng,
      responses:              {
        ...fields,
        clima: demo.clima,
        problema: demo.problema,
        liderazgo: demo.liderazgo
      },
    };

    this.svc.submitSurvey(payload as any).subscribe({
      next: () => {
        this.busy.set(false);
        this.todayCount.update((n: number) => n + 1);
        this.offline.deleteDraft(`draft_${this.activeForm()!.id}`);
        this.step.set('success');
      },
      error: (err: { status: number; error: { message: string } }) => {
        if (err.status === 0 || err.status >= 500) {
           this.handleOfflineSubmission(payload);
           return;
        }
        this.error.set(err?.error?.message ?? 'Error al guardar la encuesta. Intenta de nuevo.');
        this.busy.set(false);
      },
    });
  }

  canSubmit = computed(() => {
    return this.demoForm.valid && this.fieldsForm.valid && (this.gpsStatus() === 'captured' || this.gpsStatus() === 'denied');
  });

  private async handleOfflineSubmission(payload: SurveyPayload): Promise<void> {
    await this.offline.saveSurvey(payload as any);
    this.offline.deleteDraft(`draft_${this.activeForm()!.id}`);
    this.busy.set(false);
    this.step.set('success');
    this.error.set('Sin conexión: La encuesta se guardó localmente y se enviará automáticamente al recuperar internet.');
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goBack(): void {
    const prevMap: Record<FlowStep, FlowStep> = {
      'form-select':  'form-select',
      'phone':        'form-select',
      'otp':          'phone',
      'survey':       'otp',
      'success':      'success',
    };
    this.error.set(null);
    this.step.set(prevMap[this.step()]);
  }

  startNew(): void {
    this.step.set('form-select');
    this.activeForm.set(null);
    this.normalizedPhone.set('');
    this.otpCode.set('');
    this.otpExpiresAt.set(null);
    this.gpsStatus.set('idle');
    this.encLat.set(null);
    this.encLng.set(null);
    this.checkboxState = {};
    this.fieldGps = {};
    this.error.set(null);
    this.phoneForm.reset();
    this.demoForm.reset();
    this.fieldsForm = this.fb.group({});
    this.loadForms();
  }
}
