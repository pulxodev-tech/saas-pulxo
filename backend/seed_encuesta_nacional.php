<?php

use App\Infrastructure\Persistence\Eloquent\Models\Form;
use App\Infrastructure\Persistence\Eloquent\Models\FormField;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Support\Facades\DB;

// Find an admin user to assign as creator
$creator = User::where('role_id', 1)->first() ?? User::first();

if (!$creator) {
    echo "No users found to create the form.";
    exit(1);
}

DB::beginTransaction();

try {
    // 1. Create the Form
    $form = Form::create([
        'name' => 'Encuesta Nacional de Percepción 2026',
        'description' => 'Evaluación de clima nacional, problemas principales y perspectivas de liderazgo en Colombia.',
        'is_published' => true,
        'is_active' => true,
        'created_by' => $creator->id,
    ]);

    $fields = [
        [
            'field_key' => 'celular',
            'label' => 'Número de celular',
            'field_type' => 'phone',
            'is_required' => true,
            'sort_order' => 1,
            'placeholder' => 'Ej: 300 123 4567',
        ],
        [
            'field_key' => 'nombre',
            'label' => 'Nombre',
            'field_type' => 'text',
            'is_required' => true,
            'sort_order' => 2,
            'placeholder' => 'Ingrese sus nombres',
        ],
        [
            'field_key' => 'apellidos',
            'label' => 'Apellidos',
            'field_type' => 'text',
            'is_required' => true,
            'sort_order' => 3,
            'placeholder' => 'Ingrese sus apellidos',
        ],
        [
            'field_key' => 'genero',
            'label' => 'Género',
            'field_type' => 'select',
            'is_required' => true,
            'sort_order' => 4,
            'options' => [
                ['label' => 'Hombre', 'value' => 'hombre'],
                ['label' => 'Mujer', 'value' => 'mujer'],
                ['label' => 'Otro', 'value' => 'otro'],
            ],
            'placeholder' => 'Seleccione género',
        ],
        [
            'field_key' => 'edad',
            'label' => 'Edad',
            'field_type' => 'number',
            'is_required' => true,
            'sort_order' => 5,
            'placeholder' => 'Ej: 25',
        ],
        [
            'field_key' => 'ocupacion',
            'label' => 'Ocupación',
            'field_type' => 'text',
            'is_required' => true,
            'sort_order' => 6,
            'placeholder' => 'Ej: Estudiante, Empleado, Independiente',
        ],
        [
            'field_key' => 'barrio',
            'label' => 'Barrio',
            'field_type' => 'text',
            'is_required' => true,
            'sort_order' => 7,
            'placeholder' => 'Nombre del barrio',
        ],
        [
            'field_key' => 'direccion',
            'label' => 'Dirección',
            'field_type' => 'address_gps',
            'is_required' => true,
            'sort_order' => 8,
            'placeholder' => 'Calle/Carrera y #',
        ],
        [
            'field_key' => 'clima_pais',
            'label' => 'Thinking about Colombia today... Do you feel the country is:',
            'field_type' => 'radio',
            'is_required' => true,
            'sort_order' => 9,
            'options' => [
                ['label' => 'Está avanzando', 'value' => 'avanzando'],
                ['label' => 'Está estancado', 'value' => 'estancado'],
                ['label' => 'Está retrocediendo', 'value' => 'retrocediendo'],
            ],
        ],
        [
            'field_key' => 'problema_principal',
            'label' => 'What do you consider today to be the main problem affecting your family?',
            'field_type' => 'select',
            'is_required' => true,
            'sort_order' => 10,
            'options' => [
                ['label' => 'Inseguridad', 'value' => 'inseguridad'],
                ['label' => 'Falta de empleo', 'value' => 'falta_empleo'],
                ['label' => 'Costo de vida', 'value' => 'costo_vida'],
                ['label' => 'Salud', 'value' => 'salud'],
                ['label' => 'Corrupción', 'value' => 'corrupcion'],
                ['label' => 'Falta de oportunidades', 'value' => 'falta_oportunidades'],
                ['label' => 'Otro', 'value' => 'otro'],
            ],
            'placeholder' => 'Seleccione el problema principal',
        ],
        [
            'field_key' => 'liderazgo',
            'label' => 'Thinking about the next president... Do you believe Colombia needs a leadership that:',
            'field_type' => 'radio',
            'is_required' => true,
            'sort_order' => 11,
            'options' => [
                ['label' => 'Una al país y tome decisiones firmes para recuperar el rumbo', 'value' => 'unificador_firme'],
                ['label' => 'Mantenga las cosas como están', 'value' => 'continuista'],
                ['label' => 'No sabe', 'value' => 'ns_nr'],
            ],
        ],
    ];

    foreach ($fields as $fd) {
        FormField::create(array_merge($fd, ['form_id' => $form->id]));
    }

    DB::commit();
    echo "Form 'Encuesta Nacional de Percepción 2026' created successfully with ID: " . $form->id . "\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "Error seeding form: " . $e->getMessage() . "\n";
}
