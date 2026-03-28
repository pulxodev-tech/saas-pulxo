<?php

namespace App\Presentation\Http\Controllers\Api\V1\Forms;

use App\Infrastructure\Persistence\Eloquent\Models\Form;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class FormController extends Controller
{
    /**
     * GET /api/v1/forms
     */
    public function index(Request $request): JsonResponse
    {
        $forms = Form::withCount('fields', 'surveys')
            ->when($request->search, fn ($q) =>
                $q->where('name', 'ilike', "%{$request->search}%")
            )
            ->when(isset($request->is_published), fn ($q) =>
                $q->where('is_published', filter_var($request->is_published, FILTER_VALIDATE_BOOLEAN))
            )
            ->orderByDesc('updated_at')
            ->paginate((int) ($request->per_page ?? 20));

        return response()->json($forms);
    }

    /**
     * POST /api/v1/forms
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:200',
            'description' => 'nullable|string|max:500',
        ]);

        $form = Form::create([
            'name'         => $data['name'],
            'description'  => $data['description'] ?? null,
            'is_published' => false,
            'is_active'    => true,
            'created_by'   => $request->user()->id,
        ]);

        return response()->json($form->load('fields'), 201);
    }

    /**
     * GET /api/v1/forms/{id}
     */
    public function show(int $id): JsonResponse
    {
        $form = Form::with(['fields' => fn ($q) => $q->orderBy('sort_order')])
            ->findOrFail($id);

        return response()->json($form);
    }

    /**
     * PUT /api/v1/forms/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $form = Form::findOrFail($id);
        $data = $request->validate([
            'name'        => 'sometimes|string|max:200',
            'description' => 'nullable|string|max:500',
        ]);

        $form->update($data);

        return response()->json($form->load('fields'));
    }

    /**
     * PATCH /api/v1/forms/{id}/publish  — toggle publish state
     */
    public function togglePublish(int $id): JsonResponse
    {
        $form = Form::findOrFail($id);

        if (! $form->is_published) {
            // Validate: at least 1 active field before publishing
            $fieldCount = $form->fields()->where('is_active', true)->count();
            if ($fieldCount === 0) {
                return response()->json([
                    'message' => 'El formulario necesita al menos un campo activo para publicarse.',
                ], 422);
            }
        }

        $form->update(['is_published' => ! $form->is_published]);

        return response()->json([
            'id'           => $form->id,
            'is_published' => $form->is_published,
            'message'      => $form->is_published ? 'Formulario publicado.' : 'Formulario despublicado.',
        ]);
    }

    /**
     * DELETE /api/v1/forms/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $form = Form::findOrFail($id);

        if ($form->surveys()->count() > 0) {
            return response()->json([
                'message' => 'No se puede eliminar un formulario con encuestas registradas.',
            ], 422);
        }

        $form->delete();
        return response()->json(null, 204);
    }
}
