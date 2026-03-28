export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'address_gps'
  | 'separator'
  | 'heading';

export interface FieldOption {
  value: string;
  label: string;
}

export interface ValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface FormField {
  id?: number;
  form_id?: number;
  field_key: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  sort_order: number;
  options?: FieldOption[];
  validation_rules?: ValidationRules;
  placeholder?: string;
  is_active: boolean;
  // UI-only (not sent to API)
  _editing?: boolean;
  _dirty?: boolean;
}

export interface Form {
  id?: number;
  name: string;
  description?: string;
  is_published: boolean;
  is_active: boolean;
  created_by?: number;
  fields?: FormField[];
  fields_count?: number;
  surveys_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Catalog of all field types with metadata for the UI palette
export const FIELD_TYPE_CATALOG: {
  type: FieldType;
  label: string;
  icon: string;
  description: string;
  hasOptions: boolean;
  category: 'basic' | 'choice' | 'special';
}[] = [
  { type: 'text',        label: 'Texto corto',      icon: '✏️',  description: 'Una línea de texto',              hasOptions: false, category: 'basic' },
  { type: 'textarea',    label: 'Texto largo',       icon: '📝',  description: 'Múltiples líneas',               hasOptions: false, category: 'basic' },
  { type: 'number',      label: 'Número',            icon: '🔢',  description: 'Solo valores numéricos',          hasOptions: false, category: 'basic' },
  { type: 'phone',       label: 'Teléfono',          icon: '📱',  description: 'Número de celular',              hasOptions: false, category: 'basic' },
  { type: 'email',       label: 'Email',             icon: '📧',  description: 'Correo electrónico',             hasOptions: false, category: 'basic' },
  { type: 'date',        label: 'Fecha',             icon: '📅',  description: 'Selector de fecha',              hasOptions: false, category: 'basic' },
  { type: 'select',      label: 'Lista desplegable', icon: '▼',   description: 'Selección de una opción',        hasOptions: true,  category: 'choice' },
  { type: 'radio',       label: 'Opción única',      icon: '🔘',  description: 'Botones de opción (radio)',       hasOptions: true,  category: 'choice' },
  { type: 'checkbox',    label: 'Casillas',          icon: '☑️',  description: 'Selección múltiple',             hasOptions: true,  category: 'choice' },
  { type: 'address_gps', label: 'Dirección + GPS',   icon: '📍',  description: 'Dirección con coordenadas GPS',  hasOptions: false, category: 'special' },
  { type: 'separator',   label: 'Separador',         icon: '─',   description: 'Línea divisoria visual',         hasOptions: false, category: 'special' },
  { type: 'heading',     label: 'Encabezado',        icon: 'H',   description: 'Título de sección',              hasOptions: false, category: 'special' },
];
