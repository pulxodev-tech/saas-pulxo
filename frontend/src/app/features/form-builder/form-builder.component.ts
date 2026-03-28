import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormBuilderService } from './form-builder.service';
import { Form } from './form-builder.models';
import { HasPermissionDirective } from '../../core/permissions/has-permission.directive';
import { FormEditorComponent } from './form-editor.component';

type View = 'list' | 'editor';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective, FormEditorComponent],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">

      <!-- ── VISTA: Lista de formularios ────────────────────────────────── -->
      @if (view() === 'list') {

        <!-- Header Area -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div class="space-y-1">
            <div class="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
               <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
               Gestión de Encuestas
            </div>
            <h2 class="text-3xl font-black text-slate-800 tracking-tight">Constructor de Formularios</h2>
            <p class="text-slate-400 text-sm italic">Diseña flujos de recolección de datos dinámicos y profesionales.</p>
          </div>
          
          <div class="flex items-center gap-3">
            <button *hasPermission="'forms.create'" (click)="showNewForm.set(true)"
              class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-100 active:scale-95 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/></svg>
              Nuevo Formulario
            </button>
          </div>
        </div>

        <!-- Inline Creation Modal-like -->
        @if (showNewForm()) {
          <div class="bg-white border-2 border-blue-100 rounded-[32px] p-8 shadow-2xl shadow-blue-50 animate-in zoom-in-95 duration-300">
            <div class="flex items-center gap-4 mb-6">
               <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shadow-inner italic font-black">?</div>
               <div>
                  <h4 class="font-black text-slate-800 uppercase tracking-tight">Configuración Inicial</h4>
                  <p class="text-xs text-slate-400 italic">Define el nombre base para tu nuevo formulario operativo.</p>
               </div>
            </div>

            <form [formGroup]="newFormGroup" (ngSubmit)="createForm()" class="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div class="md:col-span-5 space-y-1.5">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre del Formulario *</label>
                <input formControlName="name" type="text"
                  class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300 shadow-inner"
                  placeholder="Ej: Gran Encuesta Barranquilla 2026" />
              </div>
              <div class="md:col-span-5 space-y-1.5">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción Breve</label>
                <input formControlName="description" type="text"
                  class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300 shadow-inner"
                  placeholder="Ej: Medición de intención de voto por barrios" />
              </div>
              <div class="md:col-span-2 flex gap-2">
                <button type="submit" [disabled]="newFormGroup.invalid || saving()"
                  class="flex-1 bg-slate-800 hover:bg-black text-white px-5 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-30">
                  {{ saving() ? '...' : 'COMENZAR' }}
                </button>
                <button type="button" (click)="showNewForm.set(false); newFormGroup.reset()"
                  class="bg-white border border-slate-200 text-slate-400 px-4 py-4 rounded-2xl hover:text-red-500 hover:border-red-100 transition-all shadow-sm">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Filters & Tools -->
        <div class="flex items-center justify-between gap-4 bg-white/50 p-4 rounded-[28px] border border-slate-100 shadow-sm">
          <div class="flex items-center gap-3 flex-1 max-w-xl">
             <div class="relative flex-1">
                <svg class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input type="search" placeholder="Buscar por nombre..." (input)="onSearch($event)"
                  class="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-5 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-50 transition-all" />
             </div>
             <div class="relative">
                <select (change)="onFilter($event)"
                  class="appearance-none bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3 text-xs font-black uppercase tracking-widest text-slate-500 focus:ring-4 focus:ring-blue-50 cursor-pointer">
                  <option value="">TODOS</option>
                  <option value="true">PUBLICADOS</option>
                  <option value="false">BORRADORES</option>
                </select>
                <svg class="w-3 h-3 absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/></svg>
             </div>
          </div>
          
          <div class="flex items-center gap-2">
             <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total: {{ forms().length }}</span>
          </div>
        </div>

        @if (loading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="bg-white rounded-[32px] border border-slate-100 p-8 animate-pulse h-48 shadow-sm shadow-slate-100/50"></div>
            }
          </div>
        } @else if (forms().length === 0) {
          <div class="bg-white rounded-[40px] border border-slate-100 p-20 flex flex-col items-center text-center shadow-xl shadow-slate-100/50">
            <div class="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-100 mb-8 scale-110">
               <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <h3 class="text-2xl font-black text-slate-800 tracking-tight">No hay formularios</h3>
            <p class="text-slate-400 max-w-xs mt-3 italic">Empieza creando tu primer flujo de encuesta profesional usando el botón superior.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (form of forms(); track form.id) {
              <div class="group/card bg-white rounded-[32px] border transition-all duration-300 relative overflow-hidden flex flex-col"
                [class.border-blue-100]="form.is_published"
                [class.border-slate-100]="!form.is_published"
                [class.hover:shadow-2xl]="true"
                [class.hover:shadow-blue-100/50]="form.is_published"
                [class.hover:shadow-slate-200/50]="!form.is_published"
                [class.hover:-translate-y-1]="true">
                
                <!-- Status Top Bar -->
                <div class="h-1.5 w-full transition-colors duration-500"
                  [class.bg-blue-500]="form.is_published"
                  [class.bg-slate-200]="!form.is_published"
                  [class.group-hover/card:bg-blue-600]="form.is_published"></div>

                <div class="p-8 flex-1">
                  <div class="flex items-start justify-between gap-4 mb-6">
                    <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100/50 flex items-center justify-center text-2xl shadow-inner group-hover/card:scale-110 group-hover/card:bg-white transition-all">
                       {{ form.is_published ? '📑' : '🖊️' }}
                    </div>
                    <span class="flex-shrink-0 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm"
                      [class.bg-blue-600]="form.is_published" [class.text-white]="form.is_published"
                      [class.bg-slate-100]="!form.is_published" [class.text-slate-400]="!form.is_published">
                      {{ form.is_published ? 'PUBLICADO' : 'BORRADOR' }}
                    </span>
                  </div>

                  <h3 class="text-lg font-black text-slate-800 tracking-tight mb-2 group-hover/card:text-blue-600 transition-colors line-clamp-2 min-h-[3.5rem]">{{ form.name }}</h3>
                  
                  <p class="text-xs text-slate-400 italic mb-6 line-clamp-2 h-8 leading-relaxed">
                     {{ form.description || 'Sin descripción descriptiva disponible.' }}
                  </p>

                  <div class="flex items-center gap-6 pt-6 border-t border-slate-50">
                    <div class="space-y-0.5">
                       <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Preguntas</p>
                       <p class="text-sm font-black text-slate-600 italic">{{ form.fields_count ?? 0 }} <span class="text-[10px] opacity-40">ITEM</span></p>
                    </div>
                    <div class="space-y-0.5">
                       <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Respuestas</p>
                       <p class="text-sm font-black text-slate-600 italic">{{ form.surveys_count ?? 0 }} <span class="text-[10px] opacity-40">REG</span></p>
                    </div>
                  </div>
                </div>

                <!-- Footer Actions -->
                <div class="p-4 bg-slate-50/50 flex items-center gap-2 mt-auto border-t border-slate-100/30">
                  <button (click)="openEditor(form)"
                    class="flex-1 bg-white hover:bg-blue-600 hover:text-white text-slate-700 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    Constructor
                  </button>
                  
                  <button *hasPermission="'forms.publish'" (click)="togglePublish(form)"
                    class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-white border border-slate-100 shadow-sm"
                    [class.text-blue-500]="!form.is_published" [class.hover:bg-blue-50]="!form.is_published"
                    [class.text-amber-500]="form.is_published" [class.hover:bg-amber-50]="form.is_published"
                    [title]="form.is_published ? 'Pausar Formulario' : 'Publicar Formulario'">
                    @if (form.is_published) {
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    } @else {
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7l4 4m0 0l4-4m-4 4v8m0-12a9 9 0 110 18 9 9 0 010-18z"/></svg>
                    }
                  </button>

                  <button *hasPermission="'forms.delete'" (click)="deleteForm(form)"
                    [disabled]="(form.surveys_count ?? 0) > 0"
                    class="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all shadow-sm disabled:opacity-30">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ── VISTA: Editor ───────────────────────────────────────────────── -->
      @if (view() === 'editor' && activeForm()) {
        <app-form-editor
          [form]="activeForm()!"
          (back)="closeEditor()"
          (formUpdated)="onFormUpdated($event)"
        />
      }

    </div>
  `,
})
export class FormBuilderComponent implements OnInit {
  private svc = inject(FormBuilderService);
  private fb  = inject(FormBuilder);

  view        = signal<View>('list');
  forms       = signal<Form[]>([]);
  loading     = signal(true);
  saving      = signal(false);
  showNewForm = signal(false);
  activeForm  = signal<Form | null>(null);

  newFormGroup = this.fb.group({
    name:        ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
  });

  private _searchTerm      = '';
  private _filterPublished: boolean | undefined = undefined;

  ngOnInit(): void { this.loadForms(); }

  loadForms(): void {
    this.loading.set(true);
    this.svc.getForms({ search: this._searchTerm || undefined, is_published: this._filterPublished, per_page: 50 })
      .subscribe({ next: res => { this.forms.set(res.data ?? res); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  onSearch(e: Event): void { this._searchTerm = (e.target as HTMLInputElement).value; this.loadForms(); }
  onFilter(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    this._filterPublished = val === '' ? undefined : val === 'true';
    this.loadForms();
  }

  createForm(): void {
    if (this.newFormGroup.invalid) return;
    this.saving.set(true);
    const v = this.newFormGroup.value;
    this.svc.createForm({ name: v.name!, description: v.description ?? undefined }).subscribe({
      next: form => { this.saving.set(false); this.showNewForm.set(false); this.newFormGroup.reset(); this.openEditor(form); },
      error: () => this.saving.set(false),
    });
  }

  openEditor(form: Form): void {
    this.svc.getForm(form.id!).subscribe(full => { this.activeForm.set(full); this.view.set('editor'); });
  }

  closeEditor(): void { this.view.set('list'); this.activeForm.set(null); this.loadForms(); }
  onFormUpdated(f: Form): void { this.activeForm.set(f); }

  togglePublish(form: Form): void {
    this.svc.togglePublish(form.id!).subscribe({
      next: res => this.forms.update(list => list.map(f => f.id === form.id ? { ...f, is_published: res.is_published } : f)),
    });
  }

  deleteForm(form: Form): void {
    if ((form.surveys_count ?? 0) > 0) return;
    if (!confirm(`¿Eliminar "${form.name}"?`)) return;
    this.svc.deleteForm(form.id!).subscribe({ next: () => this.forms.update(list => list.filter(f => f.id !== form.id)) });
  }
}
