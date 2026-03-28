import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-field-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <!-- WhatsApp-style shell for encuestadores -->
    <div class="flex flex-col h-screen max-w-md mx-auto wa-screen">

      <!-- WhatsApp Header -->
      <header class="wa-header flex items-center gap-3 px-4 py-3 flex-shrink-0 shadow-md">
        <div class="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {{ userInitial() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-white font-semibold text-sm leading-tight truncate">
            {{ userName() }}
          </p>
          <p class="text-green-200 text-xs">
            @if (groupName()) { Grupo: {{ groupName() }} } @else { Encuestador }
          </p>
        </div>
        <button
          (click)="logout()"
          class="text-white/70 hover:text-white text-xs px-2 py-1 rounded transition-colors"
        >
          Salir
        </button>
      </header>

      <!-- Content area -->
      <div class="flex-1 overflow-y-auto">
        <router-outlet />
      </div>
    </div>
  `,
})
export class FieldShellComponent {
  private auth = inject(AuthService);

  readonly userInitial = computed(() => this.auth.user()?.name?.charAt(0)?.toUpperCase() ?? 'E');
  readonly userName    = computed(() => {
    const u = this.auth.user();
    return u ? `${u.name} ${u.last_name ?? ''}`.trim() : 'Encuestador';
  });
  readonly groupName   = computed(() => {
    try {
      const g = sessionStorage.getItem('pulxo_group');
      return g ? JSON.parse(g)?.name : null;
    } catch { return null; }
  });

  logout(): void {
    this.auth.logout();
  }
}
