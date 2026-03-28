<?php

namespace App\Presentation\Http\Controllers\Api\V1\Hierarchy;

use App\Infrastructure\Persistence\Eloquent\Models\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class GroupController extends Controller
{
    /**
     * GET /api/v1/groups
     */
    public function index(Request $request): JsonResponse
    {
        $groups = Group::withCount(['members' => fn ($q) => $q->where('is_active', true)])
            ->when($request->search, fn ($q) => $q->where('name', 'ilike', "%{$request->search}%"))
            ->when(isset($request->is_active), fn ($q) =>
                $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN))
            )
            ->orderBy('created_at', 'asc')
            ->paginate((int) ($request->per_page ?? 25));

        return response()->json($groups);
    }

    /**
     * POST /api/v1/groups
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:groups,name',
            'description' => 'nullable|string|max:500',
            'location'    => 'nullable|string|max:255',
            'is_active'   => 'boolean',
        ]);

        return response()->json(Group::create($data), 201);
    }

    /**
     * GET /api/v1/groups/{id}
     */
    public function show(int $id): JsonResponse
    {
        $group = Group::with([
            'members.user.role',
            'hierarchies.coordinator',
            'hierarchies.supervisor',
        ])->findOrFail($id);

        return response()->json($group);
    }

    /**
     * PUT /api/v1/groups/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $group = Group::findOrFail($id);
        $data  = $request->validate([
            'name'        => "sometimes|string|max:100|unique:groups,name,{$id}",
            'description' => 'nullable|string|max:500',
            'location'    => 'nullable|string|max:255',
            'is_active'   => 'boolean',
        ]);

        $group->update($data);

        return response()->json($group);
    }

    /**
     * DELETE /api/v1/groups/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        Group::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
