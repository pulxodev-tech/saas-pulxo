<?php

namespace App\Presentation\Http\Controllers\Api\V1\Forms;

use App\Infrastructure\Persistence\Eloquent\Models\Form;
use App\Infrastructure\Persistence\Eloquent\Models\FormField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class FormFieldController extends Controller
{
    /**
     * POST /api/v1/forms/{formId}/fields
     * Add a field to a form.
     */
    public function store(Request $request, int $formId): JsonResponse
    {
        $form = Form::findOrFail($formId);

        $data = $request->validate([
            'field_key'        => 'required|string|max:100|regex:/^[a-z0-9_]+$/',
            'label'            => 'required|string|max:255',
            'field_type'       => 'required|string|in:text,textarea,number,email,phone,date,select,radio,checkbox,address_gps,separator,heading',
            'is_required'      => 'boolean',
            'sort_order'       => 'integer|min:0',
            'options'          => 'nullable|array',
            'options.*.value'  => 'required_with:options|string',
            'options.*.label'  => 'required_with:options|string',
            'validation_rules' => 'nullable|array',
            'placeholder'      => 'nullable|string|max:255',
        ]);

        // Ensure field_key is unique within the form
        if ($form->fields()->where('field_key', $data['field_key'])->exists()) {
            return response()->json([
                'message' => 'errors',
                'errors'  => ['field_key' => ["La clave '{$data['field_key']}' ya existe en este formulario."]],
            ], 422);
        }

        // Auto sort_order if not provided
        if (! isset($data['sort_order'])) {
            $data['sort_order'] = ($form->fields()->max('sort_order') ?? -1) + 1;
        }

        $field = $form->fields()->create($data);

        return response()->json($field, 201);
    }

    /**
     * PUT /api/v1/forms/{formId}/fields/{fieldId}
     */
    public function update(Request $request, int $formId, int $fieldId): JsonResponse
    {
        $field = FormField::where('form_id', $formId)->findOrFail($fieldId);

        $data = $request->validate([
            'label'            => 'sometimes|string|max:255',
            'field_type'       => 'sometimes|string|in:text,textarea,number,email,phone,date,select,radio,checkbox,address_gps,separator,heading',
            'is_required'      => 'boolean',
            'sort_order'       => 'integer|min:0',
            'options'          => 'nullable|array',
            'options.*.value'  => 'required_with:options|string',
            'options.*.label'  => 'required_with:options|string',
            'validation_rules' => 'nullable|array',
            'placeholder'      => 'nullable|string|max:255',
            'is_active'        => 'boolean',
        ]);

        $field->update($data);

        return response()->json($field);
    }

    /**
     * PATCH /api/v1/forms/{formId}/fields/reorder
     * Reorder fields — receives [{id, sort_order}]
     */
    public function reorder(Request $request, int $formId): JsonResponse
    {
        Form::findOrFail($formId);

        $data = $request->validate([
            'fields'              => 'required|array',
            'fields.*.id'         => 'required|integer',
            'fields.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($data['fields'] as $item) {
            FormField::where('form_id', $formId)
                ->where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['message' => 'Orden actualizado.']);
    }

    /**
     * DELETE /api/v1/forms/{formId}/fields/{fieldId}
     * Soft-delete (is_active = false) to preserve survey response data.
     */
    public function destroy(int $formId, int $fieldId): JsonResponse
    {
        $field = FormField::where('form_id', $formId)->findOrFail($fieldId);
        $field->update(['is_active' => false]);

        return response()->json(['message' => 'Campo desactivado del formulario.']);
    }

    /**
     * GET /api/v1/forms/{formId}/fields
     */
    public function index(int $formId): JsonResponse
    {
        Form::findOrFail($formId);

        $fields = FormField::where('form_id', $formId)
            ->orderBy('sort_order')
            ->get();

        return response()->json($fields);
    }
}
