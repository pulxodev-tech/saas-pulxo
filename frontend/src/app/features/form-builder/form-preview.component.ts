import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, FieldType } from './form-builder.models';

@Component({
  selector: 'app-form-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-[360px] mx-auto animate-in zoom-in-95 duration-700 relative group/phone">
      
      <!-- Premium Decorative Elements -->
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl opacity-0 group-hover/phone:opacity-100 transition-opacity duration-1000"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-400/10 rounded-full blur-3xl opacity-0 group-hover/phone:opacity-100 transition-opacity duration-1000"></div>

      <!-- Premium Smartphone Frame -->
      <div class="relative rounded-[3.5rem] p-3.5 bg-slate-900 shadow-[0_2.75rem_5.5rem_-1.25rem_rgba(45,55,90,0.4),0_2rem_4rem_-1rem_rgba(45,55,90,0.2),inset_0_0_2px_1px_rgba(255,255,255,0.1)] border-[6px] border-slate-800 overflow-hidden ring-1 ring-white/10">
        
        <!-- Notch -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-3xl z-30 flex items-center justify-center gap-1.5 px-4 pt-1">
           <div class="w-10 h-3 bg-slate-800 rounded-full"></div>
           <div class="w-2 h-2 bg-slate-800 rounded-full"></div>
        </div>

        <!-- Screen -->
        <div class="bg-white rounded-[2.75rem] h-[680px] flex flex-col overflow-hidden relative shadow-inner">
          
          <!-- WA Premium Header -->
          <div class="bg-[#075e54] pt-10 pb-4 px-6 flex flex-shrink-0 items-center justify-between shadow-lg z-20">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-xs shadow-inner border border-white/10">P</div>
              <div class="min-w-0">
                <p class="text-white font-black text-sm tracking-tight truncate leading-none mb-0.5">{{ formName }}</p>
                <div class="flex items-center gap-1.5">
                  <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span class="text-green-100 text-[9px] font-black uppercase tracking-widest opacity-80">Online • Pulxo Bot</span>
                </div>
              </div>
            </div>
            <div class="flex gap-4 text-white/40">
               <svg class="w-5 h-5 hover:text-white transition-colors cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
               <svg class="w-5 h-5 hover:text-white transition-colors cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
            </div>
          </div>

          <!-- Chat Body -->
          <div class="flex-1 overflow-y-auto px-4 py-8 space-y-5 custom-scrollbar relative" style="background: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-color: #E5DDD5;">
            
            @if (activeFields().length === 0) {
              <div class="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-30 mt-[-40px]">
                <div class="w-20 h-20 rounded-[40px] bg-white/50 backdrop-blur-sm border border-white flex items-center justify-center text-4xl font-black italic shadow-xl">?</div>
                <p class="text-xs font-black uppercase tracking-[0.2em] text-slate-800 max-w-[180px] leading-relaxed">Agrega preguntas para visualizar el flujo operativo</p>
              </div>
            }

            @if (activeFields().length > 0) {
              <!-- Pulxo Intro -->
              <div class="bg-white rounded-[20px] p-5 shadow-sm max-w-[90%] rounded-tl-none border-none relative animate-in slide-in-from-left-6 duration-700">
                <p class="text-[10px] font-black text-[#075e54] uppercase tracking-widest mb-2 opacity-60">Pulxo Assistant</p>
                <div class="space-y-2">
                  <p class="text-[13px] font-bold text-slate-800 leading-snug">Hola 👋 Soy el asistente inteligente de <strong>Pulxo</strong>.</p>
                  <p class="text-[13px] text-slate-600 leading-snug">Iniciamos proceso de recolección para: <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100 font-black tracking-tight">{{ formName }}</span></p>
                </div>
                <div class="flex items-center justify-end gap-1 mt-3">
                   <p class="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{{ now }}</p>
                </div>
              </div>

              <!-- Loop Fields -->
              @for (field of activeFields(); track field.id ?? field.field_key; let i = $index) {
                
                <!-- Incoming Question -->
                @if (field.field_type !== 'separator' && field.field_type !== 'heading') {
                  <div class="bg-white rounded-[20px] p-5 shadow-sm max-w-[90%] rounded-tl-none border-none relative animate-in slide-in-from-left-6 duration-700 delay-150">
                    <div class="flex items-center justify-between mb-2">
                       <p class="text-[9px] font-black text-[#075e54] uppercase tracking-widest opacity-60">Operación {{ i + 1 }}</p>
                       @if (field.is_required) {
                         <span class="bg-red-50 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-md border border-red-100 uppercase">Obligatorio</span>
                       }
                    </div>
                    <p class="text-[13px] font-extrabold text-slate-800 leading-snug mb-3">
                      {{ field.label }}
                    </p>

                    @if (field.options && field.options.length > 0) {
                      <div class="mt-4 grid grid-cols-1 gap-2">
                        @for (opt of field.options; track opt.value) {
                          <div class="flex items-center gap-3 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 transition-transform hover:scale-[1.02] active:scale-95 cursor-default">
                            <div class="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0 bg-white shadow-inner"></div>
                            {{ opt.label }}
                          </div>
                        }
                      </div>
                    }
                    
                    <div class="flex items-center justify-end gap-1 mt-3">
                       <p class="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{{ now }}</p>
                    </div>
                  </div>

                  <!-- Outgoing Answer Mockup -->
                  <div class="bg-[#dcf8c6] rounded-[20px] p-5 shadow-md max-w-[85%] ml-auto rounded-tr-none border-none relative animate-in slide-in-from-right-6 duration-1000 delay-300">
                     <p class="text-[13px] font-black text-[#075e54] italic opacity-70 tracking-tight">{{ answerPlaceholder(field) }}</p>
                     <div class="flex items-center justify-end gap-1.5 mt-3">
                        <p class="text-[9px] text-[#4fc3f7] font-black uppercase tracking-tighter">{{ now }}</p>
                        <div class="flex -space-x-1">
                           <svg class="w-3.5 h-3.5 text-[#4fc3f7]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
                        </div>
                     </div>
                  </div>
                }

                <!-- Special types -->
                @if (field.field_type === 'heading') {
                  <div class="flex flex-col items-center py-4 animate-in zoom-in duration-500">
                     <div class="bg-blue-600/90 text-white text-[10px] px-6 py-2 rounded-full font-black uppercase tracking-[0.25em] shadow-lg shadow-blue-200 italic border border-blue-400">
                        {{ field.label }}
                     </div>
                  </div>
                }

                @if (field.field_type === 'separator') {
                   <div class="flex items-center gap-4 py-4 opacity-20">
                      <div class="h-px flex-1 bg-slate-400"></div>
                      <div class="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                      <div class="h-px flex-1 bg-slate-400"></div>
                   </div>
                }
              }
            }
          </div>

          <!-- WA Input Bar Mockup -->
          <div class="bg-white p-4 flex items-center gap-3 border-t border-slate-100 h-24 items-start shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
             <div class="bg-slate-50 border border-slate-200/50 rounded-[24px] px-6 py-4 text-xs text-slate-400 font-black flex-1 flex items-center justify-between shadow-inner tracking-tight">
                Responder ahora...
                <div class="flex items-center gap-3">
                   <svg class="w-5 h-5 opacity-40 hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                   <svg class="w-5 h-5 opacity-40 hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13"/></svg>
                </div>
             </div>
             <div class="w-14 h-14 rounded-full bg-[#075e54] flex items-center justify-center text-white shadow-xl shadow-green-100 flex-shrink-0 animate-in fade-in zoom-in duration-1000">
                <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
             </div>
          </div>

        </div>
      </div>
      
      <div class="mt-10 text-center space-y-2 animate-pulse cursor-default">
         <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Operativo Movil Pulxo</p>
         <div class="flex items-center justify-center gap-2">
            <span class="h-px w-8 bg-blue-100"></span>
            <p class="text-[10px] text-blue-500 font-black italic tracking-wider">Simulador de Conversación WhastApp</p>
            <span class="h-px w-8 bg-blue-100"></span>
         </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 3px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
  `]
})
export class FormPreviewComponent {
  @Input() fields: FormField[] = [];
  @Input() formName = '';

  readonly now = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  activeFields(): FormField[] {
    return this.fields.filter(f => f.is_active !== false);
  }

  answerPlaceholder(field: FormField): string {
    const placeholders: Record<string, string> = {
      text:        'Respuesta aquí...',
      textarea:    'Descripción detallada...',
      number:      'Ej: 42',
      email:       'correo@ejemplo.com',
      phone:       '310 123 4567',
      date:        '15/03/2024',
      select:      field.options?.[0]?.label ?? 'Seleccionado',
      radio:       field.options?.[0]?.label ?? 'Seleccionado',
      checkbox:    'Opción A, Opción B',
      address_gps: 'Calle 100 #15-30 📍',
    };
    return placeholders[field.field_type] ?? 'Dato registrado...';
  }
}
