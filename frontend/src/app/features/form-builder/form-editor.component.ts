import {
  Component, EventEmitter, Input, OnInit, Output,
  inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormArray } from '@angular/forms';
import { FormBuilderService } from './form-builder.service';
import { Form, FormField, FieldType, FIELD_TYPE_CATALOG, FieldOption } from './form-builder.models';
import { HasPermissionDirective } from '../../core/permissions/has-permission.directive';
import { FormPreviewComponent } from './form-preview.component';
import { finalize } from 'rxjs';

type EditorTab = 'fields' | 'preview' | 'settings';

@Component({
  selector: 'app-form-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective, FormPreviewComponent],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500 pb-20">

      <!-- ── Premium Top Bar ────────────────────────────────────────────── -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-500">
        <div class="flex items-center gap-5">
          <button (click)="back.emit()"
            class="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 transition-all active:scale-90 group/back">
            <svg class="w-6 h-6 group-hover/back:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div class="min-w-0">
            <div class="flex items-center gap-3 mb-1">
              <span class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/60">Editor Operativo</span>
              <div class="h-1.5 w-1.5 rounded-full bg-slate-200"></div>
              <span class="text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm"
                [class.bg-blue-600]="form.is_published" [class.text-white]="form.is_published"
                [class.bg-slate-100]="!form.is_published" [class.text-slate-400]="!form.is_published">
                {{ form.is_published ? 'PUBLICADO' : 'BORRADOR' }}
              </span>
              @if (form.is_published) {
                <button (click)="copyLink()" 
                  class="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-green-100 transition-all shadow-sm border border-green-100">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  COMPARTIR LINK
                </button>
              }
            </div>
            <h2 class="text-3xl font-black text-slate-800 tracking-tight truncate max-w-md">{{ form.name }}</h2>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="bg-white p-2 rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/20 flex items-center gap-1">
            @for (tab of tabs; track tab.key) {
              <button
                (click)="activeTab.set(tab.key)"
                class="px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 group/tab"
                [class.bg-blue-600]="activeTab() === tab.key"
                [class.text-white]="activeTab() === tab.key"
                [class.shadow-lg]="activeTab() === tab.key"
                [class.shadow-blue-200]="activeTab() === tab.key"
                [class.text-slate-400]="activeTab() !== tab.key"
                [class.hover:bg-slate-50]="activeTab() !== tab.key"
                [class.hover:text-slate-600]="activeTab() !== tab.key"
              >
                <span class="text-lg group-hover/tab:scale-110 transition-transform">{{ tab.icon }}</span>
                <span class="hidden sm:inline">{{ tab.label }}</span>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- ── Editor Content ─────────────────────────────────────────────── -->
      <div class="min-h-[700px]">
        
        <!-- TAB: Campos -->
        @if (activeTab() === 'fields') {
          <div class="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start animate-in slide-in-from-bottom-8 duration-700">
            
            <!-- Left: Structural View & Field List (Col 1-8) -->
            <div class="xl:col-span-8 space-y-6">
              
              @if (fields().length === 0) {
                <div class="bg-white rounded-[48px] border-2 border-dashed border-slate-100 p-24 flex flex-col items-center text-center shadow-inner group/empty hover:border-blue-100 transition-colors">
                  <div class="w-32 h-32 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-100 mb-8 text-5xl font-black italic shadow-inner group-hover/empty:scale-110 transition-transform">
                     <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <h3 class="text-2xl font-black text-slate-800 tracking-tight">Estructura Vacía</h3>
                  <p class="text-slate-400 max-w-sm mt-3 italic leading-relaxed">Arrastra o selecciona un tipo de respuesta para configurar tu primer campo.</p>
                </div>
              }

              <div class="space-y-6">
                @for (field of fields(); track field.id; let idx = $index) {
                  <div class="group/field bg-white rounded-[32px] border transition-all duration-500 relative"
                    [class.border-blue-500]="editingFieldId() === field.id"
                    [class.border-slate-100]="editingFieldId() !== field.id"
                    [class.ring-8]="editingFieldId() === field.id"
                    [class.ring-blue-50]="editingFieldId() === field.id"
                    [class.shadow-2xl]="editingFieldId() === field.id"
                    [class.shadow-sm]="editingFieldId() !== field.id">
                    
                    <!-- Drag Handle / Sort Indicator -->
                    <div class="absolute -left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity z-10">
                       <button (click)="moveUp(idx)" [disabled]="idx === 0" 
                        class="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-0 active:scale-90">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"/></svg>
                       </button>
                       <button (click)="moveDown(idx)" [disabled]="idx === fields().length - 1" 
                        class="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-0 active:scale-90">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/></svg>
                       </button>
                    </div>

                    <!-- Field Header -->
                    <div class="px-8 py-5 flex items-center gap-6 rounded-t-[32px] border-b border-slate-50 relative overflow-hidden transition-colors"
                      [class.bg-blue-600]="editingFieldId() === field.id"
                      [class.bg-slate-50/40]="editingFieldId() !== field.id">
                      
                      @if (editingFieldId() === field.id) {
                        <div class="absolute inset-0 bg-blue-600 opacity-90"></div>
                      }

                      <!-- Type Indicator -->
                      <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-all relative z-10"
                        [class.bg-white]="editingFieldId() === field.id" [class.text-blue-600]="editingFieldId() === field.id"
                        [class.bg-slate-100]="editingFieldId() !== field.id" [class.text-slate-400]="editingFieldId() !== field.id">
                        {{ getIconForType(field.field_type) }}
                      </div>

                      <div class="flex-1 min-w-0 relative z-10">
                         <div class="flex items-center gap-3 mb-1">
                            <span class="text-[9px] font-black uppercase tracking-[0.2em] transition-colors"
                              [class.text-white/60]="editingFieldId() === field.id" [class.text-slate-400]="editingFieldId() !== field.id">
                              {{ field.field_type }}
                            </span>
                            @if (field.is_required) {
                              <span class="text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest shadow-sm"
                                [class.bg-red-500]="editingFieldId() !== field.id" [class.text-white]="editingFieldId() !== field.id"
                                [class.bg-white]="editingFieldId() === field.id" [class.text-red-500]="editingFieldId() === field.id">
                                Requerido
                              </span>
                            }
                         </div>
                         <h4 class="text-base font-black tracking-tight truncate border-none bg-transparent focus:ring-0 outline-none w-full transition-colors"
                           [class.text-white]="editingFieldId() === field.id" [class.text-slate-800]="editingFieldId() !== field.id">
                           {{ field.label }}
                         </h4>
                      </div>

                      <div class="flex items-center gap-3 relative z-10">
                        @if (editingFieldId() !== field.id) {
                          <button (click)="startEditing(field)"
                            class="bg-white text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-lg active:scale-95 border border-slate-100">
                            Configurar
                          </button>
                        }
                        <button *hasPermission="'forms.edit'" (click)="removeField(field, idx)"
                          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white shadow-sm border border-slate-100"
                          [class.text-red-500]="editingFieldId() !== field.id" [class.hover:bg-red-50]="editingFieldId() !== field.id"
                          [class.text-red-500]="editingFieldId() === field.id" [class.hover:bg-white]="editingFieldId() === field.id">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </div>

                    <!-- Inline Editor (Refined Palette) -->
                    @if (editingFieldId() === field.id && editForm) {
                      <div class="p-10 bg-white rounded-b-[32px] animate-in slide-in-from-top-4 duration-500">
                        <form [formGroup]="editForm" (ngSubmit)="saveField(field)" class="space-y-8">
                           <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div class="space-y-2">
                                <label class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 pl-1">Pregunta Principal</label>
                                <input formControlName="label" type="text"
                                  class="w-full bg-slate-50 border-2 border-transparent rounded-[20px] px-6 py-4.5 text-sm font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:ring-0 transition-all placeholder:text-slate-300"
                                  placeholder="Ej: ¿Qué opina sobre la seguridad actual?" />
                              </div>
                              <div class="space-y-2">
                                <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Texto Guía (Placeholder)</label>
                                <input formControlName="placeholder" type="text"
                                  class="w-full bg-slate-50 border-2 border-transparent rounded-[20px] px-6 py-4.5 text-sm font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:ring-0 transition-all placeholder:text-slate-300"
                                  placeholder="Ej: Escriba su opinión aquí..." />
                              </div>
                           </div>

                           <div class="flex flex-wrap gap-10 items-center bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                              <label class="flex items-center gap-4 cursor-pointer group/check">
                                <div class="w-7 h-7 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-center transition-all group-hover/check:border-blue-500"
                                     [class.bg-blue-600]="editForm.get('is_required')?.value"
                                     [class.border-blue-600]="editForm.get('is_required')?.value">
                                  @if (editForm.get('is_required')?.value) {
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                  }
                                </div>
                                <input type="checkbox" formControlName="is_required" class="hidden" />
                                <div class="space-y-0.5">
                                   <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight">Obligatorio</p>
                                   <p class="text-[10px] text-slate-400 font-medium italic">El encuestador no podrá saltar este campo.</p>
                                </div>
                              </label>

                              <label class="flex items-center gap-4 cursor-pointer group/check">
                                <div class="w-7 h-7 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-center transition-all group-hover/check:border-blue-500"
                                     [class.bg-blue-600]="editForm.get('is_active')?.value"
                                     [class.border-blue-600]="editForm.get('is_active')?.value">
                                  @if (editForm.get('is_active')?.value) {
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                                  }
                                </div>
                                <input type="checkbox" formControlName="is_active" class="hidden" />
                                <div class="space-y-0.5">
                                   <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight">Visibilidad</p>
                                   <p class="text-[10px] text-slate-400 font-medium italic">Define si el campo se muestra.</p>
                                </div>
                              </label>
                           </div>

                           <!-- Dynamic Options (Select/Radio/Checkbox) -->
                           @if (hasOptions(field.field_type)) {
                             <div class="pt-6 space-y-4">
                               <div class="flex items-center justify-between">
                                 <h5 class="text-[10px] font-black uppercase tracking-widest text-blue-600">Opciones de Respuesta</h5>
                                 <button type="button" (click)="addOption()"
                                   class="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">
                                   + AGREGAR OPCIÓN
                                 </button>
                               </div>
                               
                               <div formArrayName="options" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  @for (opt of optionsArray.controls; track $index; let oi = $index) {
                                    <div [formGroupName]="oi" class="flex items-center gap-3 p-3 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/20 transition-all animate-in zoom-in-95">
                                       <div class="flex-1 flex gap-2">
                                          <input formControlName="label" placeholder="Etiqueta visible"
                                            class="flex-1 bg-white border-none rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-sm" />
                                          <input formControlName="value" placeholder="ID"
                                            class="w-20 bg-white border-none rounded-xl px-4 py-2.5 text-[10px] font-black text-slate-400 focus:ring-2 focus:ring-blue-500 text-center" />
                                       </div>
                                       <button type="button" (click)="removeOption(oi)"
                                         class="w-9 h-9 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center">
                                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                       </button>
                                    </div>
                                  }
                               </div>
                             </div>
                           }

                           <!-- Action Buttons -->
                           <div class="flex items-center justify-between pt-8 border-t border-slate-100">
                              <button type="button" (click)="cancelEditing()"
                                class="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors">
                                Descartar
                              </button>
                              <div class="flex gap-2">
                                <button type="button" (click)="cancelEditing()"
                                  class="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                                  Cerrar
                                </button>
                                <button type="submit" [disabled]="editForm.invalid || savingField()"
                                  class="px-8 py-3.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                                  @if (savingField()) {
                                    <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                  }
                                  {{ savingField() ? 'Sincronizando...' : 'GUARDAR' }}
                                </button>
                              </div>
                           </div>
                        </form>
                      </div>
                    }

                    <!-- Tiny Preview when NOT editing -->
                    @if (editingFieldId() !== field.id) {
                      <div class="px-8 py-4 opacity-40 grayscale group-hover/field:grayscale-0 group-hover/field:opacity-70 transition-all cursor-default bg-white/50 rounded-b-[28px]">
                        <ng-container [ngTemplateOutlet]="fieldPreviewTpl" [ngTemplateOutletContext]="{ field: field }" />
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Right: Field Palette (Col 9-12) -->
            <div class="xl:col-span-4 sticky top-10 space-y-6 animate-in slide-in-from-right-8 duration-700">
               <div class="bg-white rounded-[40px] border border-slate-100 p-8 shadow-2xl shadow-slate-200/40">
                  <h3 class="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg">+</div>
                    Componentes
                  </h3>

                  @for (cat of categories; track cat.key) {
                    <div class="mb-10 last:mb-0">
                       <p class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-5 border-b border-slate-50 pb-2">{{ cat.label }}</p>
                       <div class="grid grid-cols-1 gap-3">
                          @for (fieldType of getCatalogByCategory(cat.key); track fieldType.type) {
                            <button 
                              (click)="addField(fieldType.type)"
                              [disabled]="addingField()"
                              class="w-full flex items-center gap-4 p-4 rounded-[20px] border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50 transition-all group active:scale-95 disabled:opacity-30 text-left"
                            >
                               <div class="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                 {{ fieldType.icon }}
                               </div>
                               <div>
                                  <p class="text-[11px] font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{{ fieldType.label }}</p>
                                  <p class="text-[9px] text-slate-400 font-medium italic mt-0.5 line-clamp-1 opacity-60">{{ fieldType.description }}</p>
                               </div>
                            </button>
                          }
                       </div>
                    </div>
                  }
               </div>

               <!-- Stats Card -->
               <div class="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl">
                  <p class="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-4">Métricas de Flujo</p>
                  <div class="space-y-4">
                     <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-400">Preguntas fijas</span>
                        <span class="text-2xl font-black italic">{{ fields().length }}</span>
                     </div>
                     <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-400">Minutos estimados</span>
                        <span class="text-2xl font-black italic text-blue-400">{{ fields().length * 0.5 }} <span class="text-xs opacity-40">m</span></span>
                     </div>
                  </div>
               </div>
            </div>

          </div>
        }

        <!-- TAB: Preview -->
        @if (activeTab() === 'preview') {
          <div class="animate-in zoom-in-95 duration-700 max-w-4xl mx-auto py-8">
             <app-form-preview [fields]="fields()" [formName]="form.name" />
          </div>
        }

        <!-- TAB: Settings -->
        @if (activeTab() === 'settings') {
           <div class="max-w-2xl mx-auto animate-in slide-in-from-right-8 duration-700">
              <div class="bg-white rounded-[40px] border border-slate-100 p-10 shadow-2xl shadow-slate-200/30 space-y-10">
                 <div class="flex items-center gap-5">
                    <div class="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-100">
                       <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </div>
                    <div>
                      <h3 class="text-xl font-black text-slate-800 tracking-tight">Metadatos del Flujo</h3>
                      <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60 italic">Configuración Operativa</p>
                    </div>
                 </div>

                 <div class="space-y-8">
                    <div class="space-y-2">
                      <label class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 pl-1">Título Público</label>
                      <input [value]="form.name" (blur)="updateFormName($event)"
                        class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4.5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all shadow-inner"
                        placeholder="Ej: Encuesta Barranquilla 2026" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Finalidad</label>
                      <textarea [value]="form.description ?? ''" (blur)="updateFormDesc($event)" rows="5"
                        class="w-full bg-slate-50 border-none rounded-[32px] px-6 py-6 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 transition-all shadow-inner resize-none"
                        placeholder="Describa el propósito de este formulario..."></textarea>
                    </div>
                 </div>
              </div>
           </div>
        }

      </div>
    </div>

    <!-- ── Inline Field Preview Template ────────────────────────────────── -->
    <ng-template #fieldPreviewTpl let-field="field">
      @switch (field.field_type) {
        @case ('separator') { <hr class="border-slate-100 mt-2" /> }
        @case ('heading')   { <p class="text-xs font-black text-slate-800 tracking-widest uppercase border-l-4 border-blue-600 pl-3 py-1 italic">{{ field.label }}</p> }
        @case ('textarea')  {
          <div class="w-full h-16 bg-white border border-slate-100 rounded-xl px-4 flex items-start pt-3 text-[10px] text-slate-300 italic shadow-inner">Respuesta larga...</div>
        }
        @case ('select') {
          <div class="w-full h-12 bg-white border border-slate-100 rounded-xl px-4 flex items-center justify-between text-[11px] text-slate-400 font-bold shadow-inner">
             <span>{{ field.placeholder || 'Seleccionar...' }}</span>
             <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/></svg>
          </div>
        }
        @case ('radio') {
          <div class="flex flex-wrap gap-4 py-1">
            @for (opt of (field.options ?? []); track opt.value) {
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded-full border-2 border-slate-200 bg-white shadow-inner"></div>
                <span class="text-[10px] text-slate-500 font-black uppercase tracking-tight">{{ opt.label }}</span>
              </div>
            }
          </div>
        }
        @case ('checkbox') {
          <div class="flex flex-wrap gap-4 py-1">
            @for (opt of (field.options ?? []); track opt.value) {
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded border-2 border-slate-200 bg-white shadow-inner"></div>
                <span class="text-[10px] text-slate-500 font-black uppercase tracking-tight">{{ opt.label }}</span>
              </div>
            }
          </div>
        }
        @case ('address_gps') {
          <div class="flex gap-3">
            <div class="flex-1 h-12 bg-white border border-slate-100 rounded-xl px-4 flex items-center text-[10px] text-slate-300 italic shadow-inner">Coordenadas GPS...</div>
            <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg shadow-sm">📍</div>
          </div>
        }
        @default {
          <div class="w-full h-12 bg-white border border-slate-100 rounded-xl px-5 flex items-center text-[11px] text-slate-500 font-bold shadow-inner italic">{{ field.placeholder || 'Entrada de datos...' }}</div>
        }
      }
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .animate-in { animation: fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

    input:focus, textarea:focus {
      outline: none;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
    }

    .group-field-hover:hover {
      transform: translateY(-2px);
    }
  `]
})
export class FormEditorComponent implements OnInit {
  @Input()  form!: Form;
  @Output() back        = new EventEmitter<void>();
  @Output() formUpdated = new EventEmitter<Form>();

  private svc = inject(FormBuilderService);
  private fb  = inject(FormBuilder);

  readonly tabs = [
    { key: 'fields'   as EditorTab, label: 'Estructura', icon: '📝' },
    { key: 'preview'  as EditorTab, label: 'Vista Previa', icon: '👁' },
    { key: 'settings' as EditorTab, label: 'Ajustes', icon: '⚙️' },
  ];

  readonly categories = [
    { key: 'basic'   as const, label: 'Básicos' },
    { key: 'choice'  as const, label: 'Opciones' },
    { key: 'special' as const, label: 'Especiales' },
  ];

  activeTab      = signal<EditorTab>('fields');
  fields         = signal<FormField[]>([]);
  editingFieldId = signal<number | null>(null);
  addingField    = signal(false);
  savingField    = signal(false);
  editForm: FormGroup | null = null;

  ngOnInit(): void {
    this.fields.set(this.form.fields ?? []);
  }

  getIconForType(type: FieldType): string {
    return FIELD_TYPE_CATALOG.find(c => c.type === type)?.icon ?? '✏️';
  }

  getCatalogByCategory(cat: 'basic' | 'choice' | 'special') {
    return FIELD_TYPE_CATALOG.filter(c => c.category === cat);
  }

  hasOptions(type: FieldType): boolean {
    return ['select', 'radio', 'checkbox'].includes(type);
  }

  addField(type: FieldType): void {
    this.addingField.set(true);
    const fieldKey = `${type}_${Date.now()}`;
    const payload: Partial<FormField> = {
      field_key:   fieldKey,
      label:       this.defaultLabel(type),
      field_type:  type,
      is_required: false,
      is_active:   true,
      sort_order:  this.fields().length,
      options:     this.hasOptions(type) ? [{ value: 'opcion_1', label: 'Opción 1' }] : undefined,
    };

    this.svc.addField(this.form.id!, payload).pipe(finalize(() => this.addingField.set(false))).subscribe({
      next: field => {
        this.fields.update(f => [...f, field]);
        this.startEditing(field);
      }
    });
  }

  startEditing(field: FormField): void {
    this.editingFieldId.set(field.id!);
    this.editForm = this.fb.group({
      label:       [field.label,       Validators.required],
      placeholder: [field.placeholder ?? ''],
      is_required: [field.is_required],
      is_active:   [field.is_active],
      options:     this.fb.array(
        (field.options ?? []).map(o => this.optionGroup(o))
      ),
    });
  }

  cancelEditing(): void {
    this.editingFieldId.set(null);
    this.editForm = null;
  }

  get optionsArray(): FormArray {
    return this.editForm?.get('options') as FormArray;
  }

  optionGroup(opt?: FieldOption): FormGroup {
    return this.fb.group({
      value: [opt?.value ?? '', Validators.required],
      label: [opt?.label ?? '', Validators.required],
    });
  }

  addOption(): void { this.optionsArray.push(this.optionGroup()); }
  removeOption(i: number): void { this.optionsArray.removeAt(i); }

  saveField(field: FormField): void {
    if (!this.editForm || this.editForm.invalid) return;
    this.savingField.set(true);
    const val = this.editForm.value;
    const payload: Partial<FormField> = {
      label:       val.label,
      placeholder: val.placeholder || undefined,
      is_required: val.is_required,
      is_active:   val.is_active,
      options:     this.hasOptions(field.field_type) ? val.options : undefined,
    };

    this.svc.updateField(this.form.id!, field.id!, payload).pipe(finalize(() => this.savingField.set(false))).subscribe({
      next: updated => {
        this.fields.update(list => list.map(f => f.id === updated.id ? updated : f));
        this.cancelEditing();
      }
    });
  }

  removeField(field: FormField, idx: number): void {
    if (!confirm(`¿Estás seguro de eliminar el campo "${field.label}"?`)) return;
    this.svc.removeField(this.form.id!, field.id!).subscribe({
      next: () => this.fields.update(list => list.filter((_, i) => i !== idx)),
    });
  }

  copyLink(): void {
    const url = `${window.location.origin}/s/${this.form.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('¡Link de encuesta copiado al portapapeles!\n\n' + url);
    });
  }

  moveUp(idx: number): void {
    if (idx === 0) return;
    this.swapAndSave(idx, idx - 1);
  }

  moveDown(idx: number): void {
    if (idx === this.fields().length - 1) return;
    this.swapAndSave(idx, idx + 1);
  }

  private swapAndSave(a: number, b: number): void {
    const list = [...this.fields()];
    [list[a], list[b]] = [list[b], list[a]];
    const reordered = list.map((f, i) => ({ ...f, sort_order: i }));
    this.fields.set(reordered);
    this.svc.reorderFields(this.form.id!, reordered.map(f => ({ id: f.id!, sort_order: f.sort_order }))).subscribe();
  }

  updateFormName(e: Event): void {
    const name = (e.target as HTMLInputElement).value.trim();
    if (!name || name === this.form.name) return;
    this.svc.updateForm(this.form.id!, { name }).subscribe(f => this.formUpdated.emit(f));
  }

  updateFormDesc(e: Event): void {
    const desc = (e.target as HTMLTextAreaElement).value;
    this.svc.updateForm(this.form.id!, { description: desc }).subscribe(f => this.formUpdated.emit(f));
  }

  private defaultLabel(type: FieldType): string {
    return FIELD_TYPE_CATALOG.find(c => c.type === type)?.label ?? type;
  }
}
