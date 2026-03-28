import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

type LoginMode = 'email' | 'pin';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div class="w-full max-w-md">

        <!-- Logo / Brand -->
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-white tracking-tight">Pulxo</h1>
          <p class="text-slate-400 mt-1">Gestión operativa de campo</p>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">

          <!-- Mode Toggle -->
          <div class="flex border-b border-slate-100">
            <button
              type="button"
              (click)="setMode('email')"
              class="flex-1 py-4 text-sm font-semibold transition-colors"
              [class.text-indigo-600]="mode() === 'email'"
              [class.border-b-2]="mode() === 'email'"
              [class.border-indigo-600]="mode() === 'email'"
              [class.text-slate-400]="mode() !== 'email'"
            >
              Acceso Admin
            </button>
            <button
              type="button"
              (click)="setMode('pin')"
              class="flex-1 py-4 text-sm font-semibold transition-colors"
              [class.text-indigo-600]="mode() === 'pin'"
              [class.border-b-2]="mode() === 'pin'"
              [class.border-indigo-600]="mode() === 'pin'"
              [class.text-slate-400]="mode() !== 'pin'"
            >
              Acceso Encuestador (PIN)
            </button>
          </div>

          <div class="p-8">

            <!-- Email Form -->
            @if (mode() === 'email') {
              <form [formGroup]="emailForm" (ngSubmit)="loginEmail()" class="space-y-5">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    formControlName="email"
                    class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    placeholder="admin@pulxo.co"
                    autocomplete="email"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                  <input
                    type="password"
                    formControlName="password"
                    class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    placeholder="••••••••"
                    autocomplete="current-password"
                  />
                </div>

                @if (errorMessage()) {
                  <p class="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">{{ errorMessage() }}</p>
                }

                <button
                  type="submit"
                  [disabled]="loading() || emailForm.invalid"
                  class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  @if (loading()) { Ingresando... } @else { Ingresar }
                </button>
              </form>
            }

            <!-- PIN Form -->
            @if (mode() === 'pin') {
              <form [formGroup]="pinForm" (ngSubmit)="loginPin()" class="space-y-6">
                <div class="text-center">
                  <p class="text-slate-600 text-sm mb-6">Ingresa tu PIN de 4 dígitos</p>
                  <input
                    type="tel"
                    formControlName="pin"
                    inputmode="numeric"
                    maxlength="4"
                    class="text-center text-4xl tracking-[1.5rem] font-bold w-48 px-4 py-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900"
                    placeholder="——"
                    autocomplete="one-time-code"
                  />
                </div>

                @if (errorMessage()) {
                  <p class="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg text-center">{{ errorMessage() }}</p>
                }

                <button
                  type="submit"
                  [disabled]="loading() || pinForm.invalid"
                  class="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  @if (loading()) { Verificando... } @else { Ingresar con PIN }
                </button>
              </form>
            }

          </div>
        </div>

        <p class="text-center text-slate-500 text-xs mt-6">Pulxo © {{ year }}</p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  readonly year = new Date().getFullYear();

  mode         = signal<LoginMode>('email');
  loading      = signal(false);
  errorMessage = signal('');

  emailForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  pinForm = this.fb.group({
    pin: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
  });

  setMode(m: LoginMode): void {
    this.mode.set(m);
    this.errorMessage.set('');
  }

  loginEmail(): void {
    if (this.emailForm.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.emailForm.value;

    this.auth.loginEmail(email!, password!).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.errorMessage.set(err.error?.message ?? 'Error al iniciar sesión.');
        this.loading.set(false);
      },
    });
  }

  loginPin(): void {
    if (this.pinForm.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const { pin } = this.pinForm.value;

    this.auth.loginPin(pin!).subscribe({
      next: () => this.router.navigate(['/encuestador/survey']),
      error: (err) => {
        this.errorMessage.set(err.error?.message ?? 'PIN incorrecto.');
        this.loading.set(false);
      },
    });
  }
}
