import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, AbstractControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PublishedForm, SurveyField, SurveyService } from './survey.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

type PublicFlowStep = 'identity' | 'phone' | 'otp' | 'survey' | 'success' | 'cancelled';

const OTP_CACHE_TTL_MS  = 10 * 60 * 60 * 1000; // 10 horas
const NO_GPS_WARN_LIMIT = 3;

@Component({
  selector: 'app-public-flow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />

    <!-- ── GPS Confirm Dialog ─────────────────────────────────────── -->
    @if (showGpsConfirm()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-sm p-8 space-y-6 shadow-2xl">
          <div class="text-center space-y-3">
            <div class="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto">
              <svg class="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <h3 class="text-lg font-black text-slate-900">Sin Ubicación GPS</h3>
            <p class="text-sm text-slate-500">No se detectó ubicación. Las encuestas sin GPS dificultan el análisis territorial. ¿Deseas enviar de todas formas?</p>
          </div>
          <div class="flex gap-3">
            <button (click)="cancelGpsConfirm()" class="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button (click)="confirmSendWithoutGps()" class="flex-1 py-3 rounded-2xl bg-orange-500 text-white text-sm font-black shadow-lg hover:bg-orange-600 transition-colors">
              Enviar igual
            </button>
          </div>
        </div>
      </div>
    }

    <div class="min-h-screen bg-slate-50 flex flex-col font-['Inter']">

      <!-- ── Header ─────────────────────────────────────────────────── -->
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div class="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center gap-3">
            @if (step() !== 'identity' && step() !== 'success') {
              <button (click)="goBack()" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
            }
            <div>
              <h1 class="text-sm font-black text-slate-800 tracking-tight leading-none">
                {{ activeForm() ? activeForm()!.name : 'Pulxo' }}
              </h1>
              <div class="flex items-center gap-1.5 mt-1">
                <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ stepLabel() }}</span>
              </div>
            </div>
          </div>

          @if (pollsterName()) {
            <div class="flex items-center gap-2">
              <div class="text-right mr-1 hidden xs:block">
                <p class="text-[10px] font-black text-slate-400 leading-none uppercase">Encuestador</p>
                <p class="text-[10px] font-black text-blue-600 leading-none mt-0.5 truncate max-w-[80px]">{{ pollsterName() }}</p>
              </div>
              <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">
                {{ pollsterName()!.charAt(0) }}
              </div>
              <button (click)="clearPollsterSession()" title="Cambiar agente"
                class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              </button>
            </div>
          }
        </div>
        <div class="h-1 bg-slate-100 overflow-hidden">
          <div class="h-full bg-blue-500 transition-all duration-700 ease-out" [style.width.%]="progress()"></div>
        </div>
      </header>

      <main class="flex-1 max-w-xl mx-auto w-full p-4 space-y-6">

        <!-- ═══ STEP: identity ══════════════════════════════════════════ -->
        @if (step() === 'identity') {
          <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-sm mx-auto pt-8">
            <div class="text-center mb-8">
              <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <h2 class="text-2xl font-black text-slate-900 leading-tight">Ingresa tu PIN</h2>
              <p class="text-slate-500 text-sm mt-2 px-4">Código de 4 dígitos asignado a tu usuario.</p>
            </div>

            <div class="flex gap-3 justify-center mb-6">
              @for (i of [0,1,2,3]; track i) {
                <input [id]="'pin-' + i" type="password" inputmode="numeric" maxlength="1"
                  class="w-16 h-16 text-center text-2xl font-black border-2 border-slate-200 rounded-2xl bg-white focus:border-blue-500 outline-none transition-colors"
                  (input)="onPinInput($event, i)" (keydown.backspace)="onPinBackspace($event, i)" />
              }
            </div>

            @if (error()) {
              <div class="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs mb-4 text-center">{{ error() }}</div>
            }

            <button (click)="submitIdentity()" [disabled]="pinCode().length < 4 || busy()"
              class="w-full bg-slate-950 text-white py-4 rounded-2xl text-sm font-black shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
              @if (busy()) { <span class="animate-spin text-xl">◌</span> }
              Ingresar
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        }

        <!-- ═══ STEP: phone ════════════════════════════════════════════════ -->
        @if (step() === 'phone') {
          <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-sm mx-auto pt-8">
            <div class="text-center mb-8">
              <h2 class="text-2xl font-black text-slate-900 leading-tight">Celular del Ciudadano</h2>
              <p class="text-slate-500 text-sm mt-2 px-4">Iniciando encuesta con {{ pollsterName()?.split(' ')[0] }}</p>
            </div>
            <form [formGroup]="phoneForm" (ngSubmit)="submitPhone()" class="space-y-4">
              <div class="relative">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-4 bg-slate-50 px-1 z-10">Celular del Ciudadano</label>
                <input formControlName="phone" type="tel" inputmode="numeric"
                  placeholder="300 000 0000" maxlength="10"
                  (input)="onlyDigits($event)"
                  class="w-full bg-white border-2 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none transition-all"
                  [class.border-slate-200]="!phoneForm.get('phone')?.touched || phoneForm.get('phone')?.valid"
                  [class.focus:border-blue-500]="true"
                  [class.border-red-300]="phoneForm.get('phone')?.touched && phoneForm.get('phone')?.invalid" />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black"
                  [class.text-green-500]="(phoneForm.get('phone')?.value?.length || 0) === 10"
                  [class.text-slate-300]="(phoneForm.get('phone')?.value?.length || 0) !== 10">
                  {{ phoneForm.get('phone')?.value?.length || 0 }}/10
                </span>
              </div>
              @if (phoneForm.get('phone')?.touched && phoneForm.get('phone')?.invalid) {
                <div class="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs text-center">
                  Debe ser un número de celular de exactamente 10 dígitos.
                </div>
              }
              @if (error()) { <div class="text-red-600 text-xs px-2 text-center">{{ error() }}</div> }
              <button type="submit" [disabled]="phoneForm.invalid || busy()" class="w-full bg-blue-600 text-white py-4 rounded-2xl text-sm font-black shadow-lg disabled:opacity-50 transition-all">
                @if (busy()) { <span class="animate-spin">◌</span> } Continuar
              </button>
            </form>
          </div>
        }

        <!-- ═══ STEP: otp ══════════════════════════════════════════════════ -->
        @if (step() === 'otp') {
          <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-sm mx-auto pt-8">
            <div class="text-center mb-8 text-slate-900">
              <h2 class="text-2xl font-black">Validar OTP</h2>
              <p class="text-sm opacity-60 mt-2">Enviamos un código a <strong>{{ normalizedPhone() }}</strong></p>
              @if (testOtp()) {
                <div class="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-xl max-w-[200px] mx-auto text-center">
                  <p class="text-[9px] font-black text-yellow-700 uppercase tracking-widest">Código Test</p>
                  <p class="text-2xl font-black text-yellow-800 tracking-widest">{{ testOtp() }}</p>
                </div>
              }
            </div>

            <div class="flex gap-3 justify-center mb-8">
              @for (i of [0,1,2,3]; track i) {
                <input [id]="'otp-' + i" type="text" inputmode="numeric" maxlength="1"
                  class="w-14 h-14 text-center text-2xl font-black border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-colors"
                  (input)="onOtpInput($event, i)" (keydown.backspace)="onOtpBackspace($event, i)" />
              }
            </div>

            @if (error()) {
              <div class="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs mb-4 text-center">{{ error() }}</div>
            }

            <button (click)="submitOtp()" [disabled]="otpCode().length < 4 || busy()"
              class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50">
              @if (busy()) { <span class="animate-spin">◌</span> } Verificar Código
            </button>

            @if (resendCountdown() === 0) {
              <div class="text-center mt-6">
                <button (click)="resendOtp()" [disabled]="busy()"
                  class="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-30 transition-all">
                  Reenviar Código
                </button>
              </div>
            }
          </div>
        }

        <!-- ═══ STEP: survey (Dinámico) ═══════════════════════════════════ -->
        @if (step() === 'survey') {
          <div class="animate-in fade-in slide-in-from-bottom-4 space-y-4 pb-24">

            <!-- Alert: 3+ surveys without GPS -->
            @if (noGpsCount() >= NO_GPS_WARN_LIMIT) {
              <div class="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-2xl flex items-start gap-3">
                <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                <div>
                  <p class="text-[11px] font-black uppercase tracking-widest">Atención GPS</p>
                  <p class="text-xs mt-0.5">Has enviado {{ noGpsCount() }} encuestas sin ubicación. Por favor activa el GPS para las próximas.</p>
                </div>
              </div>
            }

            <!-- Form Header -->
            <div class="bg-indigo-600 p-6 rounded-3xl text-white">
              <p class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Encuesta</p>
              <h2 class="text-xl font-black leading-tight">{{ activeForm()?.name }}</h2>
            </div>

            <!-- GPS Status Banner -->
            <div class="rounded-2xl border overflow-hidden transition-all"
              [class.border-green-200]="gpsStatus() === 'captured'"
              [class.bg-green-50]="gpsStatus() === 'captured'"
              [class.border-orange-200]="gpsStatus() === 'denied'"
              [class.bg-orange-50]="gpsStatus() === 'denied'"
              [class.border-slate-200]="gpsStatus() === 'idle' || gpsStatus() === 'loading'"
              [class.bg-slate-50]="gpsStatus() === 'idle' || gpsStatus() === 'loading'">

              @if (gpsStatus() === 'captured') {
                <div class="p-4 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                  </div>
                  <div>
                    <p class="text-[10px] font-black text-green-700 uppercase tracking-widest">Ubicación Capturada</p>
                    <p class="text-[10px] text-green-600">{{ coords.lat.toFixed(5) }}, {{ coords.lng.toFixed(5) }}</p>
                  </div>
                </div>
              }

              @else if (gpsStatus() === 'loading') {
                <div class="p-4 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500 animate-pulse">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                  </div>
                  <p class="text-[11px] font-black text-slate-500 uppercase tracking-widest">Obteniendo ubicación...</p>
                </div>
              }

              @else if (gpsStatus() === 'denied') {
                <div class="p-4 flex items-start gap-3">
                  <div class="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 flex-shrink-0 mt-0.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-[10px] font-black text-orange-700 uppercase tracking-widest">Por favor inicia el GPS</p>
                    <p class="text-[10px] text-orange-600 mt-0.5">{{ gpsError() }}</p>
                    <button (click)="captureGps()" class="mt-2 text-[10px] font-black text-orange-700 underline">Intentar de nuevo</button>
                  </div>
                </div>
              }

              @else {
                <div class="p-4 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ubicación GPS</p>
                    <p class="text-[10px] text-slate-400">Se capturará al enviar la encuesta</p>
                  </div>
                  <button type="button" (click)="captureGps()" class="text-[10px] font-black text-blue-600 underline flex-shrink-0">
                    Capturar ahora
                  </button>
                </div>
              }
            </div>

            @if (!dynamicForm() || sortedActiveFields().length === 0) {
              <div class="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-2xl text-sm text-center">
                Este formulario no tiene preguntas activas configuradas.
              </div>
            }

            @if (dynamicForm() && sortedActiveFields().length > 0) {
              <form [formGroup]="dynamicForm()!" (ngSubmit)="onSubmitClick()" class="space-y-3">

                @for (field of sortedActiveFields(); track field.id) {

                  <!-- Separator -->
                  @if (field.field_type === 'separator') {
                    <div class="h-px bg-slate-200 my-2"></div>
                  }
                  <!-- Heading -->
                  @else if (field.field_type === 'heading') {
                    <div class="pt-3 pb-1">
                      <p class="text-sm font-black text-slate-700 uppercase tracking-wider">{{ field.label }}</p>
                    </div>
                  }
                  <!-- Input fields -->
                  @else {
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                      <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest">
                        {{ field.label }}
                        @if (field.is_required) { <span class="text-red-400 ml-0.5">*</span> }
                      </label>

                      <!-- text / email -->
                      @if (field.field_type === 'text' || field.field_type === 'email') {
                        <input [formControlName]="field.field_key"
                          [type]="field.field_type === 'email' ? 'email' : 'text'"
                          [placeholder]="field.placeholder || ''"
                          class="w-full border-b border-slate-200 py-2 outline-none font-bold text-slate-800 bg-transparent focus:border-blue-500 transition-colors" />
                      }

                      <!-- phone — readonly if pre-filled with validated number -->
                      @else if (field.field_type === 'phone') {
                        <input [formControlName]="field.field_key"
                          type="tel" inputmode="numeric"
                          maxlength="10"
                          (input)="onlyDigits($event)"
                          [placeholder]="field.placeholder || '300 000 0000'"
                          [attr.readonly]="isPhonePreFilled(field.field_key) ? true : null"
                          [class.bg-slate-50]="isPhonePreFilled(field.field_key)"
                          [class.text-slate-400]="isPhonePreFilled(field.field_key)"
                          [class.cursor-not-allowed]="isPhonePreFilled(field.field_key)"
                          class="w-full border-b border-slate-200 py-2 outline-none font-bold text-slate-800 bg-transparent focus:border-blue-500 transition-colors" />
                        @if (isPhonePreFilled(field.field_key)) {
                          <p class="text-[10px] text-blue-500 font-bold mt-1">✓ Validado con OTP</p>
                        }
                      }

                      <!-- date -->
                      @else if (field.field_type === 'date') {
                        <input [formControlName]="field.field_key" type="date"
                          class="w-full border-b border-slate-200 py-2 outline-none font-bold text-slate-800 bg-transparent focus:border-blue-500 transition-colors" />
                      }

                      <!-- textarea -->
                      @else if (field.field_type === 'textarea') {
                        <textarea [formControlName]="field.field_key"
                          [placeholder]="field.placeholder || ''"
                          rows="3"
                          class="w-full border border-slate-200 rounded-xl p-3 outline-none font-bold text-slate-800 resize-none focus:border-blue-500 transition-colors"></textarea>
                      }

                      <!-- number -->
                      @else if (field.field_type === 'number') {
                        <input [formControlName]="field.field_key" type="number" inputmode="numeric"
                          [placeholder]="field.placeholder || '0'"
                          min="1" max="120"
                          class="w-full border-b border-slate-200 py-2 outline-none font-bold text-slate-800 bg-transparent focus:border-blue-500 transition-colors" />
                      }

                      <!-- select -->
                      @else if (field.field_type === 'select') {
                        <select [formControlName]="field.field_key"
                          class="w-full border border-slate-200 rounded-xl p-3 outline-none font-bold text-slate-800 bg-white focus:border-blue-500 transition-colors">
                          <option value="">Selecciona una opción...</option>
                          @for (opt of field.options; track opt.value) {
                            <option [value]="opt.value">{{ opt.label }}</option>
                          }
                        </select>
                      }

                      <!-- radio -->
                      @else if (field.field_type === 'radio') {
                        <div class="space-y-2 pt-1">
                          @for (opt of field.options; track opt.value) {
                            <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors"
                              [class.border-blue-400]="dynamicForm()!.get(field.field_key)?.value === opt.value"
                              [class.bg-blue-50]="dynamicForm()!.get(field.field_key)?.value === opt.value"
                              [class.border-slate-100]="dynamicForm()!.get(field.field_key)?.value !== opt.value">
                              <input type="radio" [formControlName]="field.field_key" [value]="opt.value" class="hidden" />
                              <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                [class.border-blue-500]="dynamicForm()!.get(field.field_key)?.value === opt.value"
                                [class.border-slate-300]="dynamicForm()!.get(field.field_key)?.value !== opt.value">
                                @if (dynamicForm()!.get(field.field_key)?.value === opt.value) {
                                  <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                                }
                              </div>
                              <span class="text-sm font-bold text-slate-700">{{ opt.label }}</span>
                            </label>
                          }
                        </div>
                      }

                      <!-- checkbox -->
                      @else if (field.field_type === 'checkbox') {
                        <div class="space-y-2 pt-1">
                          @for (opt of field.options; track opt.value) {
                            <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors"
                              [class.border-blue-400]="isChecked(field.field_key, opt.value)"
                              [class.bg-blue-50]="isChecked(field.field_key, opt.value)"
                              [class.border-slate-100]="!isChecked(field.field_key, opt.value)">
                              <input type="checkbox"
                                [checked]="isChecked(field.field_key, opt.value)"
                                (change)="onCheckboxChange(field.field_key, opt.value, $any($event.target).checked)"
                                class="hidden" />
                              <div class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                                [class.bg-blue-500]="isChecked(field.field_key, opt.value)"
                                [class.border-blue-500]="isChecked(field.field_key, opt.value)"
                                [class.border-slate-300]="!isChecked(field.field_key, opt.value)">
                                @if (isChecked(field.field_key, opt.value)) {
                                  <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                }
                              </div>
                              <span class="text-sm font-bold text-slate-700">{{ opt.label }}</span>
                            </label>
                          }
                        </div>
                      }

                      <!-- address_gps — Casa / Calle toggle -->
                      @else if (field.field_type === 'address_gps') {
                        <!-- Casa / Calle toggle -->
                        <div class="flex gap-2 mb-3">
                          <button type="button"
                            (click)="setAddressSource('casa', field.field_key)"
                            class="flex-1 py-2 rounded-xl border-2 text-xs font-black transition-all"
                            [class.border-green-500]="addressSource() === 'casa'"
                            [class.bg-green-50]="addressSource() === 'casa'"
                            [class.text-green-700]="addressSource() === 'casa'"
                            [class.border-slate-200]="addressSource() !== 'casa'"
                            [class.text-slate-500]="addressSource() !== 'casa'">
                            🏠 Casa
                          </button>
                          <button type="button"
                            (click)="setAddressSource('calle', field.field_key)"
                            class="flex-1 py-2 rounded-xl border-2 text-xs font-black transition-all"
                            [class.border-blue-500]="addressSource() === 'calle'"
                            [class.bg-blue-50]="addressSource() === 'calle'"
                            [class.text-blue-700]="addressSource() === 'calle'"
                            [class.border-slate-200]="addressSource() !== 'calle'"
                            [class.text-slate-500]="addressSource() !== 'calle'">
                            🗺️ Calle
                          </button>
                        </div>

                        <!-- Casa: GPS automático -->
                        @if (addressSource() === 'casa') {
                          <input [formControlName]="field.field_key" type="text"
                            [placeholder]="field.placeholder || 'Calle 123 # 45-67 (opcional)'"
                            class="w-full border-b border-slate-200 py-2 outline-none font-bold text-slate-800 bg-transparent focus:border-blue-500 transition-colors" />
                          @if (gpsStatus() === 'captured') {
                            <p class="text-[10px] text-green-600 font-bold mt-1">✓ Coordenadas GPS capturadas: {{ coords.lat.toFixed(5) }}, {{ coords.lng.toFixed(5) }}</p>
                          } @else {
                            <p class="text-[10px] text-slate-400 font-bold mt-1">Las coordenadas se capturarán del GPS del dispositivo al enviar.</p>
                          }
                        }

                        <!-- Calle: Google Maps manual autocomplete (debounced) -->
                        @if (addressSource() === 'calle') {
                          <div class="relative">
                            <input [formControlName]="field.field_key"
                              type="text"
                              placeholder="Escribe mínimo 5 caracteres..."
                              autocomplete="off"
                              (input)="onAddressInput($event, field.field_key)"
                              (blur)="closeAddressSuggestions()"
                              class="w-full border-b border-slate-200 py-2 outline-none font-bold text-slate-800 bg-transparent focus:border-blue-500 transition-colors" />
                            @if (addressSearching()) {
                              <span class="absolute right-0 top-2 text-[10px] text-slate-400 font-bold animate-pulse">Buscando...</span>
                            }
                            <!-- Suggestions dropdown -->
                            @if (addressSuggestions().length > 0) {
                              <div class="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                @for (s of addressSuggestions(); track s.place_id) {
                                  <button type="button"
                                    (mousedown)="selectAddressSuggestion(s, field.field_key)"
                                    class="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors">
                                    <span class="text-blue-600 font-black">{{ s.structured_formatting?.main_text }}</span>
                                    <span class="text-slate-400 ml-1">{{ s.structured_formatting?.secondary_text }}</span>
                                  </button>
                                }
                              </div>
                            }
                          </div>
                          @if (addressCoords().lat !== 0) {
                            <p class="text-[10px] text-blue-600 font-bold mt-1">✓ Coordenadas: {{ addressCoords().lat.toFixed(5) }}, {{ addressCoords().lng.toFixed(5) }}</p>
                          } @else {
                            <p class="text-[10px] text-slate-400 font-bold mt-1">Escribe la dirección y selecciona de la lista (mín. 5 caracteres, espera 600ms).</p>
                          }
                        }

                        <!-- No source selected yet -->
                        @if (!addressSource()) {
                          <p class="text-[10px] text-slate-400 italic">Selecciona si la dirección es Casa (GPS) o Calle (búsqueda en mapa).</p>
                        }
                      }

                      <!-- Validation error -->
                      @if (dynamicForm()!.get(field.field_key)?.invalid && dynamicForm()!.get(field.field_key)?.touched) {
                        <p class="text-[11px] text-red-500 font-bold">Este campo es requerido.</p>
                      }
                    </div>
                  }
                }

                @if (error()) {
                  <div class="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs">{{ error() }}</div>
                }

                <button type="submit" [disabled]="busy()"
                  class="w-full bg-slate-900 text-white py-5 rounded-3xl font-black shadow-xl disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2">
                  @if (busy()) {
                    <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Enviando...
                  } @else {
                    FINALIZAR ENCUESTA
                  }
                </button>

                <button type="button" (click)="cancelSurvey()" [disabled]="busy()"
                  class="w-full border-2 border-slate-200 text-slate-500 py-4 rounded-3xl font-black hover:bg-slate-50 disabled:opacity-40 transition-all">
                  Cancelar Encuesta
                </button>
              </form>
            }
          </div>
        }

        <!-- ═══ STEP: success ══════════════════════════════════════════════ -->
        @if (step() === 'success') {
          <div class="text-center pt-16 space-y-6 max-w-sm mx-auto">
            <div class="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white shadow-xl">
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <h2 class="text-2xl font-black text-slate-900">¡Encuesta Completada!</h2>
              <p class="text-slate-500 mt-2 text-sm">Los datos han sido registrados correctamente.</p>
            </div>
            <!-- Daily summary -->
            <div class="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-1">
              <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest">Tu progreso de hoy</p>
              <p class="text-4xl font-black text-blue-700">{{ dailySurveyCount() }}</p>
              <p class="text-xs font-bold text-blue-500">{{ dailySurveyCount() === 1 ? 'encuesta registrada hoy' : 'encuestas registradas hoy' }}</p>
            </div>
            <button (click)="reset()" class="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
              Iniciar nueva encuesta
            </button>
          </div>
        }

        <!-- ═══ STEP: cancelled ════════════════════════════════════════════ -->
        @if (step() === 'cancelled') {
          <div class="text-center pt-20 space-y-6 max-w-sm mx-auto">
            <div class="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <h2 class="text-2xl font-black text-slate-900">Encuesta Pausada</h2>
              <p class="text-slate-500 mt-2 text-sm">El borrador fue guardado. Puedes retomarlo cuando estés listo usando el mismo número de respondente.</p>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-1">
              <p class="text-[10px] font-black text-amber-700 uppercase tracking-widest">Número guardado</p>
              <p class="text-lg font-black text-amber-800">{{ normalizedPhone() }}</p>
            </div>
            <button (click)="reset()" class="text-blue-600 font-black uppercase text-xs tracking-widest hover:underline">
              Iniciar nueva encuesta
            </button>
          </div>
        }

      </main>
    </div>
  `,
})
export class PublicFlowComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private svc    = inject(SurveyService);
  private fb     = inject(FormBuilder);
  private msgSvc = inject(MessageService);

  // Expose constant to template
  readonly NO_GPS_WARN_LIMIT = NO_GPS_WARN_LIMIT;

  // ── State ────────────────────────────────────────────────────────────
  step            = signal<PublicFlowStep>('identity');
  activeForm      = signal<PublishedForm | null>(null);
  pollsterInfo    = signal<any>(null);
  dynamicForm     = signal<FormGroup | null>(null);
  busy            = signal(false);
  error           = signal<string | null>(null);
  testOtp         = signal<string | null>(null);
  normalizedPhone = signal('');
  otpCode         = signal('');
  gpsStatus       = signal<'idle' | 'loading' | 'captured' | 'denied'>('idle');
  gpsError        = signal<string | null>(null);
  coords          = { lat: 0, lng: 0 };
  resendCountdown = signal(30);
  showGpsConfirm  = signal(false);
  noGpsCount      = signal(0);
  dailySurveyCount = signal(0);

  // ── Address / Location ────────────────────────────────────────────────
  addressSource       = signal<'casa' | 'calle' | null>(null);
  addressCoords       = signal<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  addressSuggestions  = signal<any[]>([]);
  addressSearching    = signal(false);
  private mapsApiKey          = '';
  private addressDebounce?: ReturnType<typeof setTimeout>;
  private autocompleteService?: any; // google.maps.places.AutocompleteService
  private placesService?: any;       // google.maps.places.PlacesService
  private addressFieldKey     = '';

  private formId           = 0;
  private countdownTimer?: ReturnType<typeof setInterval>;
  private checkboxSets     = new Map<string, Set<string>>();

  // ── Computed ─────────────────────────────────────────────────────────
  pollsterName = computed(() => this.pollsterInfo()?.name ?? null);

  sortedActiveFields = computed(() =>
    (this.activeForm()?.fields ?? [])
      .filter(f => f.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  );

  stepLabel = computed(() => ({
    identity: 'Identificación', phone: 'Respondente',
    otp: 'Validación', survey: 'Formulario', success: 'Completado', cancelled: 'Pausado'
  } as Record<PublicFlowStep, string>)[this.step()]);

  progress = computed(() => {
    const steps: PublicFlowStep[] = ['identity', 'phone', 'otp', 'survey', 'success'];
    const idx = steps.indexOf(this.step() as any);
    return idx >= 0 ? ((idx + 1) / steps.length) * 100 : 100;
  });

  isPhonePreFilled(fieldKey: string): boolean {
    const val = this.dynamicForm()?.get(fieldKey)?.value;
    return !!val && val === this.normalizedPhone();
  }

  pinCode = signal('');

  // ── Static forms ─────────────────────────────────────────────────────
  phoneForm = this.fb.group({
    phone: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10), Validators.pattern(/^\d{10}$/)]]
  });

  // ── Lifecycle ────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.formId = Number(this.route.snapshot.params['id']);
    this.loadForm(this.formId);
    this.loadMapsKey();
    this.restorePollsterSession();
  }

  // ── Pollster session cache (10h) ──────────────────────────────────────
  private pollsterCacheKey(): string {
    return `pulxo_pollster_${this.formId}`;
  }

  private savePollsterSession(pollster: any): void {
    localStorage.setItem(this.pollsterCacheKey(), JSON.stringify({ pollster, ts: Date.now() }));
  }

  private restorePollsterSession(): void {
    const raw = localStorage.getItem(this.pollsterCacheKey());
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (Date.now() - data.ts < OTP_CACHE_TTL_MS && data.pollster) {
        this.pollsterInfo.set(data.pollster);
        this.loadNoGpsCount();
        this.loadDailyCount();
        this.step.set('phone');
      } else {
        localStorage.removeItem(this.pollsterCacheKey());
      }
    } catch {
      localStorage.removeItem(this.pollsterCacheKey());
    }
  }

  clearPollsterSession(): void {
    localStorage.removeItem(this.pollsterCacheKey());
    this.pollsterInfo.set(null);
    this.step.set('identity');
  }

  ngOnDestroy(): void {
    this.clearCountdown();
  }

  // ── Google Maps ───────────────────────────────────────────────────────
  private loadMapsKey(): void {
    this.svc.getMapsConfig().subscribe({
      next: res => { this.mapsApiKey = res.key; },
      error: () => { /* Maps key optional */ }
    });
  }

  setAddressSource(source: 'casa' | 'calle', fieldKey: string): void {
    this.addressSource.set(source);
    this.addressFieldKey = fieldKey;
    this.addressCoords.set({ lat: 0, lng: 0 });
    this.addressSuggestions.set([]);

    if (source === 'calle' && this.mapsApiKey) {
      this.loadMapsScript().then(() => this.initServices()).catch(() => {
        this.msgSvc.add({ severity: 'warn', summary: 'Maps', detail: 'No se pudo cargar Google Maps.' });
      });
    } else if (source === 'calle' && !this.mapsApiKey) {
      this.msgSvc.add({ severity: 'warn', summary: 'Maps', detail: 'Google Maps no configurado. Escribe la dirección manualmente.' });
    }
  }

  private loadMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.maps) { resolve(); return; }
      const existing = document.getElementById('gmaps-script');
      if (existing) { existing.addEventListener('load', () => resolve()); return; }
      const s = document.createElement('script');
      s.id      = 'gmaps-script';
      s.src     = `https://maps.googleapis.com/maps/api/js?key=${this.mapsApiKey}&libraries=places`;
      s.async   = true;
      s.onload  = () => resolve();
      s.onerror = () => reject();
      document.head.appendChild(s);
    });
  }

  private initServices(): void {
    const gMaps = (window as any).google?.maps;
    if (!gMaps?.places) return;
    if (!this.autocompleteService) {
      this.autocompleteService = new gMaps.places.AutocompleteService();
    }
    if (!this.placesService) {
      // PlacesService needs a DOM node or map
      const el = document.createElement('div');
      this.placesService = new gMaps.places.PlacesService(el);
    }
  }

  /** Debounced: fires Places predictions only after 600ms pause AND min 5 chars */
  onAddressInput(event: Event, _fieldKey: string): void {
    const val = (event.target as HTMLInputElement).value.trim();

    if (!val) {
      this.addressCoords.set({ lat: 0, lng: 0 });
      this.addressSuggestions.set([]);
      return;
    }

    // Clear coordinate when user edits the text
    this.addressCoords.set({ lat: 0, lng: 0 });

    // Don't fire API until min 5 characters
    if (val.length < 5 || !this.autocompleteService) {
      this.addressSuggestions.set([]);
      return;
    }

    // Cancel previous pending call
    if (this.addressDebounce) clearTimeout(this.addressDebounce);

    this.addressSearching.set(true);
    this.addressDebounce = setTimeout(() => {
      this.autocompleteService.getPlacePredictions(
        { input: val, types: ['address'], componentRestrictions: { country: 'co' } },
        (predictions: any[], status: string) => {
          this.addressSearching.set(false);
          if (status === 'OK' && predictions?.length) {
            this.addressSuggestions.set(predictions.slice(0, 5));
          } else {
            this.addressSuggestions.set([]);
          }
        }
      );
    }, 600);
  }

  selectAddressSuggestion(suggestion: any, fieldKey: string): void {
    this.addressSuggestions.set([]);
    this.dynamicForm()?.get(fieldKey)?.setValue(suggestion.description);

    if (!this.placesService) return;

    this.placesService.getDetails(
      { placeId: suggestion.place_id, fields: ['geometry'] },
      (place: any, status: string) => {
        if (status === 'OK' && place?.geometry?.location) {
          this.addressCoords.set({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      }
    );
  }

  closeAddressSuggestions(): void {
    // Small delay so mousedown on suggestions fires first
    setTimeout(() => this.addressSuggestions.set([]), 150);
  }

  loadForm(id: number): void {
    this.svc.getPublicForm(id).subscribe({
      next: form => {
        this.activeForm.set(form);
        this.buildDynamicForm(form.fields ?? []);
      },
      error: () => this.error.set('Formulario no encontrado o no publicado.')
    });
  }

  buildDynamicForm(fields: SurveyField[]): void {
    const controls: Record<string, AbstractControl> = {};
    this.checkboxSets.clear();

    for (const field of fields) {
      if (['separator', 'heading'].includes(field.field_type)) continue;
      const validators = field.is_required ? [Validators.required] : [];
      if (field.field_type === 'number') {
        validators.push(Validators.min(1), Validators.max(120));
      }
      controls[field.field_key] = this.fb.control('', validators);
      if (field.field_type === 'checkbox') {
        this.checkboxSets.set(field.field_key, new Set<string>());
      }
    }

    this.dynamicForm.set(this.fb.group(controls));
  }

  /** Restores saved draft responses into the dynamic form. */
  restoreDraft(responses: Record<string, any>): void {
    const form = this.dynamicForm();
    if (!form || !responses) return;
    Object.entries(responses).forEach(([key, value]) => {
      const ctrl = form.get(key);
      if (!ctrl) return;
      if (Array.isArray(value) && this.checkboxSets.has(key)) {
        const set = new Set<string>(value.map(String));
        this.checkboxSets.set(key, set);
        ctrl.setValue(value);
      } else {
        ctrl.setValue(value ?? '');
      }
    });
  }

  /** Saves the current form state as an incomplete draft, then shows cancelled step. */
  cancelSurvey(): void {
    this.busy.set(true);
    const payload = {
      form_id:          this.activeForm()!.id,
      group_id:         this.pollsterInfo().group_id,
      pollster_id:      this.pollsterInfo().id,
      respondent_phone: this.normalizedPhone(),
      responses:        this.dynamicForm()?.value ?? {},
    };
    this.svc.saveDraft(payload).subscribe({
      next:  () => { this.busy.set(false); this.step.set('cancelled'); },
      error: () => { this.busy.set(false); this.step.set('cancelled'); } // still navigate even if save fails
    });
  }

  /** Pre-fills all phone-type fields with the already-validated respondent phone. */
  private prefillPhoneFields(): void {
    const phone = this.normalizedPhone();
    if (!phone || !this.dynamicForm()) return;
    const activeFields = this.activeForm()?.fields ?? [];
    for (const field of activeFields) {
      if (field.field_type === 'phone') {
        this.dynamicForm()!.get(field.field_key)?.setValue(phone);
      }
    }
  }

  // ── OTP countdown ────────────────────────────────────────────────────
  startCountdown(): void {
    this.clearCountdown();
    this.resendCountdown.set(30);
    this.countdownTimer = setInterval(() => {
      this.resendCountdown.update(n => {
        if (n <= 1) { this.clearCountdown(); return 0; }
        return n - 1;
      });
    }, 1000);
  }

  clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }

  // ── OTP cache (1 hour) ───────────────────────────────────────────────
  private otpCacheKey(phone: string): string {
    return `pulxo_otp_${this.formId}_${phone}`;
  }

  private saveOtpCache(phone: string): void {
    localStorage.setItem(this.otpCacheKey(phone), JSON.stringify({
      phone,
      pollsterInfo: this.pollsterInfo(),
      ts: Date.now()
    }));
  }

  private checkOtpCache(phone: string): boolean {
    const raw = localStorage.getItem(this.otpCacheKey(phone));
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (Date.now() - data.ts < OTP_CACHE_TTL_MS) {
        // Restore pollster if needed
        if (data.pollsterInfo && !this.pollsterInfo()) {
          this.pollsterInfo.set(data.pollsterInfo);
          this.loadDailyCount();
        }
        return true;
      }
    } catch { /* ignore */ }
    localStorage.removeItem(this.otpCacheKey(phone));
    return false;
  }

  // ── No-GPS counter ───────────────────────────────────────────────────
  private loadNoGpsCount(): void {
    const pollsterId = this.pollsterInfo()?.id;
    if (!pollsterId) return;
    const raw = localStorage.getItem(`pulxo_no_gps_${pollsterId}`);
    this.noGpsCount.set(raw ? parseInt(raw, 10) : 0);
  }

  private incrementNoGpsCount(): void {
    const pollsterId = this.pollsterInfo()?.id;
    if (!pollsterId) return;
    const next = this.noGpsCount() + 1;
    this.noGpsCount.set(next);
    localStorage.setItem(`pulxo_no_gps_${pollsterId}`, String(next));
  }

  private resetNoGpsCount(): void {
    const pollsterId = this.pollsterInfo()?.id;
    if (!pollsterId) return;
    this.noGpsCount.set(0);
    localStorage.removeItem(`pulxo_no_gps_${pollsterId}`);
  }

  private dailyKey(): string {
    const pollsterId = this.pollsterInfo()?.id ?? 0;
    const date = new Date().toISOString().slice(0, 10);
    return `pulxo_daily_${pollsterId}_${date}`;
  }

  private loadDailyCount(): void {
    const raw = localStorage.getItem(this.dailyKey());
    this.dailySurveyCount.set(raw ? parseInt(raw, 10) : 0);
  }

  private incrementDailyCount(): void {
    const next = this.dailySurveyCount() + 1;
    this.dailySurveyCount.set(next);
    localStorage.setItem(this.dailyKey(), String(next));
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  onlyDigits(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 10);
    // Trigger Angular's change detection for form controls
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ── Step: identity (PIN) ─────────────────────────────────────────────
  onPinInput(ev: Event, idx: number): void {
    const input = ev.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 1);
    if (input.value && idx < 3) {
      (document.getElementById(`pin-${idx + 1}`) as HTMLInputElement)?.focus();
    }
    this.collectPinCode();
    if (this.pinCode().length === 4) this.submitIdentity();
  }

  onPinBackspace(ev: Event, idx: number): void {
    const input = ev.target as HTMLInputElement;
    if (!input.value && idx > 0) {
      (document.getElementById(`pin-${idx - 1}`) as HTMLInputElement)?.focus();
    }
    setTimeout(() => this.collectPinCode(), 0);
  }

  private collectPinCode(): void {
    const digits = Array.from({ length: 4 }, (_, i) =>
      ((document.getElementById(`pin-${i}`) as HTMLInputElement)?.value ?? '')
    );
    this.pinCode.set(digits.join(''));
  }

  private clearPinBoxes(): void {
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById(`pin-${i}`) as HTMLInputElement;
      if (el) el.value = '';
    }
    this.pinCode.set('');
  }

  submitIdentity(): void {
    if (this.pinCode().length < 4 || this.busy()) return;
    this.error.set(null);
    this.busy.set(true);
    this.svc.checkPollster(this.pinCode()).subscribe({
      next: res => {
        if (!res.pollster?.group_id) {
          this.error.set('No tienes un grupo asignado. Contacta al administrador.');
          this.clearPinBoxes();
          this.busy.set(false);
          return;
        }
        this.pollsterInfo.set(res.pollster);
        this.savePollsterSession(res.pollster);
        this.loadNoGpsCount();
        this.loadDailyCount();
        this.step.set('phone');
        this.busy.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'Código no válido o usuario inactivo.');
        this.clearPinBoxes();
        setTimeout(() => (document.getElementById('pin-0') as HTMLInputElement)?.focus(), 50);
        this.busy.set(false);
      }
    });
  }

  // ── Step: phone ──────────────────────────────────────────────────────
  submitPhone(): void {
    this.error.set(null);
    const phone = (this.phoneForm.value.phone ?? '').replace(/\D/g, '');
    this.normalizedPhone.set(phone);
    this.busy.set(true);

    // Check OTP cache — skip OTP step if verified within the last hour
    if (this.checkOtpCache(phone)) {
      // Try to restore existing draft
      this.svc.getDraft(phone, this.activeForm()!.id).subscribe({
        next: res => {
          if (res.draft?.responses) this.restoreDraft(res.draft.responses);
          this.busy.set(false);
          this.step.set('survey');
          this.prefillPhoneFields();
          this.captureGps();
        },
        error: () => {
          this.busy.set(false);
          this.step.set('survey');
          this.prefillPhoneFields();
          this.captureGps();
        }
      });
      return;
    }

    this.svc.sendOtp(phone, this.activeForm()!.id, this.pollsterInfo()?.id).subscribe({
      next: res => {
        this.testOtp.set(res.code || null);
        this.step.set('otp');
        this.startCountdown();
        this.busy.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'Error enviando OTP.');
        this.busy.set(false);
      }
    });
  }

  // ── Step: otp ────────────────────────────────────────────────────────
  onOtpInput(ev: Event, idx: number): void {
    const input = ev.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 1);
    if (input.value && idx < 3) {
      (document.getElementById(`otp-${idx + 1}`) as HTMLInputElement)?.focus();
    }
    this.collectOtpCode();
  }

  onOtpBackspace(ev: Event, idx: number): void {
    const input = ev.target as HTMLInputElement;
    if (!input.value && idx > 0) {
      (document.getElementById(`otp-${idx - 1}`) as HTMLInputElement)?.focus();
    }
    setTimeout(() => this.collectOtpCode(), 0);
  }

  private collectOtpCode(): void {
    const codes = Array.from({ length: 4 }, (_, i) =>
      ((document.getElementById(`otp-${i}`) as HTMLInputElement)?.value ?? '')
    );
    this.otpCode.set(codes.join(''));
  }

  submitOtp(): void {
    this.error.set(null);
    this.busy.set(true);
    this.svc.verifyOtp(this.normalizedPhone(), this.activeForm()!.id, this.otpCode()).subscribe({
      next: res => {
        if (res.verified) {
          this.saveOtpCache(this.normalizedPhone());
          this.step.set('survey');
          this.prefillPhoneFields();
          this.captureGps();
        } else {
          this.error.set(res.message || 'Código inválido. Intenta de nuevo.');
        }
        this.busy.set(false);
      },
      error: () => {
        this.error.set('Error verificando OTP. Intenta de nuevo.');
        this.busy.set(false);
      }
    });
  }

  resendOtp(): void {
    this.error.set(null);
    this.busy.set(true);
    this.svc.sendOtp(this.normalizedPhone(), this.activeForm()!.id, this.pollsterInfo()?.id).subscribe({
      next: res => {
        this.testOtp.set(res.code || null);
        this.startCountdown();
        this.busy.set(false);
        for (let i = 0; i < 4; i++) {
          const el = document.getElementById(`otp-${i}`) as HTMLInputElement;
          if (el) el.value = '';
        }
        this.otpCode.set('');
      },
      error: () => {
        this.error.set('Error reenviando OTP.');
        this.busy.set(false);
      }
    });
  }

  // ── GPS ──────────────────────────────────────────────────────────────
  captureGps(): void {
    if (!navigator.geolocation) {
      this.gpsStatus.set('denied');
      this.gpsError.set('Tu dispositivo no soporta geolocalización.');
      return;
    }
    this.gpsStatus.set('loading');
    this.gpsError.set(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.gpsStatus.set('captured');
      },
      err => {
        this.gpsStatus.set('denied');
        if (err.code === 1) {
          this.gpsError.set('Permiso denegado. Ve a Ajustes → Privacidad → Ubicación y actívala para este navegador.');
        } else if (err.code === 2) {
          this.gpsError.set('GPS no disponible. Por favor enciende la ubicación en tu dispositivo e intenta de nuevo.');
        } else {
          this.gpsError.set('No se pudo obtener la ubicación. Intenta de nuevo.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // ── Step: survey ─────────────────────────────────────────────────────
  isChecked(fieldKey: string, optValue: string): boolean {
    return this.checkboxSets.get(fieldKey)?.has(optValue) ?? false;
  }

  onCheckboxChange(fieldKey: string, optValue: string, checked: boolean): void {
    const set = this.checkboxSets.get(fieldKey) ?? new Set<string>();
    checked ? set.add(optValue) : set.delete(optValue);
    this.checkboxSets.set(fieldKey, set);
    this.dynamicForm()?.get(fieldKey)?.setValue(Array.from(set));
  }

  onSubmitClick(): void {
    if (!this.dynamicForm()?.valid) {
      this.dynamicForm()?.markAllAsTouched();
      this.error.set('Por favor completa todos los campos requeridos.');
      return;
    }

    if (this.gpsStatus() !== 'captured') {
      // Try to get GPS first, then show confirmation
      if (this.gpsStatus() === 'idle') {
        this.captureGps();
        // After short delay check result (GPS may return quickly)
        setTimeout(() => {
          if (this.gpsStatus() !== 'captured') {
            this.showGpsConfirm.set(true);
          } else {
            this.doSubmit();
          }
        }, 3000);
      } else {
        this.showGpsConfirm.set(true);
      }
      return;
    }

    this.doSubmit();
  }

  cancelGpsConfirm(): void {
    this.showGpsConfirm.set(false);
  }

  confirmSendWithoutGps(): void {
    this.showGpsConfirm.set(false);
    this.doSubmit();
  }

  private doSubmit(): void {
    this.error.set(null);
    this.busy.set(true);

    const rawValues = this.dynamicForm()!.value;
    const responses: Record<string, unknown> = { ...rawValues };
    this.checkboxSets.forEach((set, key) => {
      responses[key] = Array.from(set);
    });

    const withGps = this.gpsStatus() === 'captured';

    const src = this.addressSource();
    const addrCoords = this.addressCoords();
    const hasAddrCoords = addrCoords.lat !== 0 || addrCoords.lng !== 0;

    // For Casa: use pollster GPS as address coords; for Calle: use Maps autocomplete coords
    const addressLat = src === 'casa' && withGps ? this.coords.lat
                     : src === 'calle' && hasAddrCoords ? addrCoords.lat
                     : null;
    const addressLng = src === 'casa' && withGps ? this.coords.lng
                     : src === 'calle' && hasAddrCoords ? addrCoords.lng
                     : null;

    const payload = {
      form_id:                  this.activeForm()!.id,
      group_id:                 this.pollsterInfo().group_id,
      pollster_id:              this.pollsterInfo().id,
      respondent_phone:         this.normalizedPhone(),
      respondent_name:          rawValues['nombre']    ?? null,
      respondent_last_name:     rawValues['apellidos'] ?? null,
      respondent_gender:        rawValues['genero']    ?? null,
      respondent_age:           rawValues['edad']      ? Number(rawValues['edad']) : null,
      respondent_occupation:    rawValues['ocupacion'] ?? null,
      respondent_neighborhood:  rawValues['barrio']    ?? null,
      respondent_address:       rawValues['direccion'] ?? null,
      responses,
      encuestador_lat:  withGps ? this.coords.lat : null,
      encuestador_lng:  withGps ? this.coords.lng : null,
      address_source:   src === 'casa' ? 'gps' : src === 'calle' ? 'maps' : null,
      address_lat:      addressLat,
      address_lng:      addressLng,
    };

    this.svc.submitPublicSurvey(payload).subscribe({
      next: () => {
        if (!withGps) {
          this.incrementNoGpsCount();
        } else {
          this.resetNoGpsCount();
        }
        this.incrementDailyCount();
        this.step.set('success');
        this.busy.set(false);
        this.msgSvc.add({ severity: 'success', summary: 'Registrado', detail: 'Encuesta enviada correctamente' });
      },
      error: err => {
        let detail = 'Error al enviar la encuesta.';
        if (err.error?.message) detail = err.error.message;
        if (err.error?.errors) detail = Object.values(err.error.errors).flat().join(', ');
        this.error.set(detail);
        this.busy.set(false);
        this.msgSvc.add({ severity: 'error', summary: 'Error', detail });
      }
    });
  }

  // ── Navigation ───────────────────────────────────────────────────────
  goBack(): void {
    const steps: PublicFlowStep[] = ['identity', 'phone', 'otp', 'survey', 'success'];
    const idx = steps.indexOf(this.step());
    if (idx > 0) this.step.set(steps[idx - 1]);
  }

  reset(): void {
    this.phoneForm.reset();
    this.clearPinBoxes();
    this.otpCode.set('');
    this.gpsStatus.set('idle');
    this.gpsError.set(null);
    this.error.set(null);
    this.testOtp.set(null);
    this.addressSource.set(null);
    this.addressCoords.set({ lat: 0, lng: 0 });
    this.addressSuggestions.set([]);
    this.checkboxSets.clear();
    this.clearCountdown();
    this.buildDynamicForm(this.activeForm()?.fields ?? []);

    // Restore pollster session if still valid → skip PIN step
    const raw = localStorage.getItem(this.pollsterCacheKey());
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Date.now() - data.ts < OTP_CACHE_TTL_MS && data.pollster) {
          this.pollsterInfo.set(data.pollster);
          this.step.set('phone');
          return;
        }
      } catch { /* ignore */ }
      localStorage.removeItem(this.pollsterCacheKey());
    }
    this.pollsterInfo.set(null);
    this.step.set('identity');
  }
}
