<?php

namespace App\Presentation\Http\Controllers\Api\V1\Parameters;

use App\Domain\Parameters\ParameterDefinitions;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\Models\Parameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParameterController extends Controller
{
    /**
     * GET /api/v1/parameters
     * Returns all groups with their current values.
     * Encrypted values are masked: value=null, has_value=true.
     */
    public function index(): JsonResponse
    {
        $stored = Parameter::all()->keyBy('key');
        $result = [];

        foreach (ParameterDefinitions::groups() as $groupId => $group) {
            $fields      = [];
            $configured  = 0;
            $total       = count($group['fields']);

            foreach ($group['fields'] as $def) {
                $param    = $stored->get($def['key']);
                $hasValue = $param && $param->value !== null && $param->value !== '';

                $fields[] = [
                    'key'         => $def['key'],
                    'label'       => $def['label'],
                    'type'        => $def['type'],
                    'encrypted'   => $def['encrypted'] ?? false,
                    'default'     => $def['default']     ?? null,
                    'placeholder' => $def['placeholder'] ?? null,
                    'description' => $def['description'] ?? null,
                    'options'     => $def['options']     ?? null,
                    // Encrypted fields: never return the value to the client
                    'value'       => ($def['encrypted'] ?? false) ? null : ($param?->value ?? $def['default'] ?? null),
                    'has_value'   => $hasValue,
                ];

                if ($hasValue) $configured++;
            }

            $result[] = [
                'id'          => $groupId,
                'label'       => $group['label'],
                'description' => $group['description'],
                'icon'        => $group['icon'],
                'color'       => $group['color'],
                'fields'      => $fields,
                'configured'  => $configured,
                'total'       => $total,
            ];
        }

        return response()->json($result);
    }

    /**
     * PUT /api/v1/parameters/{group}
     * Saves all parameters for a group.
     * If a password field is sent as empty string → keep existing value (no overwrite).
     */
    public function save(Request $request, string $group): JsonResponse
    {
        $groups = ParameterDefinitions::groups();

        if (!isset($groups[$group])) {
            return response()->json(['message' => 'Grupo no encontrado.'], 404);
        }

        foreach ($groups[$group]['fields'] as $def) {
            $key         = $def['key'];
            $isEncrypted = $def['encrypted'] ?? false;
            $value       = $request->input($key);

            // Empty encrypted field → keep existing value untouched
            if ($isEncrypted && ($value === null || $value === '')) {
                continue;
            }

            Parameter::updateOrCreate(
                ['key' => $key],
                [
                    'group'        => $group,
                    'display_name' => $def['label'],
                    'value'        => ($isEncrypted && $value !== null) ? encrypt($value) : $value,
                    'is_encrypted' => $isEncrypted,
                    'description'  => $def['description'] ?? null,
                ]
            );
        }

        return response()->json(['message' => 'Parámetros guardados correctamente.']);
    }
}
