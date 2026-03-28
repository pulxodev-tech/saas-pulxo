<?php

namespace App\Presentation\Http\Controllers\Api\V1\Hierarchy;

use App\Application\Hierarchy\UseCases\AssignGroupUseCase;
use App\Infrastructure\Persistence\Eloquent\Models\GroupMember;
use App\Infrastructure\Persistence\Eloquent\Models\Hierarchy;
use App\Infrastructure\Persistence\Eloquent\Models\Role;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class HierarchyController extends Controller
{
    public function __construct(private readonly AssignGroupUseCase $assignGroup) {}

    /**
     * GET /api/v1/hierarchy
     * Full tree: coordinator → supervisors → groups → member counts
     */
    public function index(): JsonResponse
    {
        // Get all active assignments
        $hierarchies = Hierarchy::with(['coordinator.role', 'supervisor.role', 'group'])
            ->where('is_active', true)
            ->get();

        // Group by coordinator
        $tree = $hierarchies->groupBy('coordinator_id')->map(function ($items, $coordId) {
            $coord = $items->first()->coordinator;
            return [
                'id'          => (int) $coordId,
                'name'        => ($coord?->name ?? 'Usuario Desconocido') . ' ' . ($coord?->last_name ?? ''),
                'email'       => $coord?->email,
                'supervisors' => $items->groupBy('supervisor_id')->map(function ($rows, $supId) {
                    $sup = $rows->first()->supervisor;
                    return [
                        'id'     => (int) $supId,
                        'name'   => ($sup?->name ?? 'Sin Supervisor') . ' ' . ($sup?->last_name ?? ''),
                        'groups' => $rows->map(fn ($r) => [
                            'id'             => $r->group->id,
                            'name'           => $r->group->name,
                            'hierarchy_id'   => $r->id,
                            'coordinator_id' => $r->coordinator_id,
                            'supervisor_id'  => $r->supervisor_id,
                            'group_id'       => $r->group_id,
                            'members_count'  => GroupMember::where('group_id', $r->group_id)->where('is_active', true)->count(),
                            'members'        => GroupMember::with('user')->where('group_id', $r->group_id)->where('is_active', true)->get()->map(fn($m) => [
                                'id' => $m->user_id,
                                'name' => ($m->user->name ?? 'User') . ' ' . ($m->user->last_name ?? ''),
                            ]),
                        ])->values(),
                    ];
                })->values(),
            ];
        })->values();

        return response()->json($tree);
    }

    /**
     * POST /api/v1/hierarchy/assign
     * Link coordinator → supervisor → group
     */
    public function assign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'coordinator_id' => 'required|integer|exists:users,id',
            'supervisor_id'  => 'required|integer|exists:users,id',
            'group_id'       => 'required|integer|exists:groups,id',
        ]);

        $hierarchy = $this->assignGroup->assignHierarchy(
            $data['coordinator_id'],
            $data['supervisor_id'],
            $data['group_id'],
        );

        return response()->json($hierarchy->load(['coordinator', 'supervisor', 'group']), 201);
    }

    /**
     * DELETE /api/v1/hierarchy/{id}
     */
    /**
     * PUT /api/v1/hierarchy/{id}
     */
    public function updateAssignment(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'coordinator_id' => 'required|exists:users,id',
            'supervisor_id'  => 'required|exists:users,id',
            'group_id'       => 'required|exists:groups,id',
        ]);

        $h = Hierarchy::findOrFail($id);
        $h->update([
            'coordinator_id' => $request->coordinator_id,
            'supervisor_id'  => $request->supervisor_id,
            'group_id'       => $request->group_id,
        ]);

        return response()->json(['message' => 'Asignación actualizada.', 'data' => $h]);
    }

    public function removeAssignment(int $id): JsonResponse
    {
        Hierarchy::findOrFail($id)->update(['is_active' => false]);
        return response()->json(['message' => 'Asignación desactivada.']);
    }

    /**
     * DELETE /api/v1/hierarchy/coordinator/{coordId}/supervisor/{supId}
     */
    public function removeSupervisor(int $coordId, int $supId): JsonResponse
    {
        Hierarchy::where('coordinator_id', $coordId)
            ->where('supervisor_id', $supId)
            ->update(['is_active' => false]);

        return response()->json(['message' => 'Supervisor desvinculado del coordinador.']);
    }

    /**
     * POST /api/v1/hierarchy/groups/{groupId}/members
     * Add encuestador to group
     */
    public function addMember(Request $request, int $groupId): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $member = $this->assignGroup->addMember($groupId, $data['user_id']);

        return response()->json($member->load('user.role'), 201);
    }

    /**
     * DELETE /api/v1/hierarchy/groups/{groupId}/members/{userId}
     */
    public function removeMember(int $groupId, int $userId): JsonResponse
    {
        $this->assignGroup->removeMember($groupId, $userId);
        return response()->json(['message' => 'Encuestador removido del grupo.']);
    }

    /**
     * GET /api/v1/hierarchy/groups/{groupId}/members
     * List active members of a group
     */
    public function groupMembers(int $groupId): JsonResponse
    {
        $members = GroupMember::with('user.role')
            ->where('group_id', $groupId)
            ->where('is_active', true)
            ->get()
            ->map(fn ($m) => [
                'id'        => $m->user->id,
                'name'      => $m->user->name . ' ' . $m->user->last_name,
                'is_active' => $m->user->is_active,
                'member_id' => $m->id,
            ]);

        return response()->json($members);
    }

    /**
     * GET /api/v1/hierarchy/supervisors
     * List supervisors (for dropdowns)
     */
    public function supervisors(): JsonResponse
    {
        $role = Role::where('name', 'supervisor')->first();
        return response()->json(
            User::where('role_id', $role?->id)->where('is_active', true)
                ->select('id', 'name', 'last_name')->orderBy('name')->get()
        );
    }

    /**
     * GET /api/v1/hierarchy/coordinators
     * List coordinators (for dropdowns)
     */
    public function coordinators(): JsonResponse
    {
        $role = Role::where('name', 'coordinador')->first();
        return response()->json(
            User::where('role_id', $role?->id)->where('is_active', true)
                ->select('id', 'name', 'last_name')->orderBy('name')->get()
        );
    }

    /**
     * GET /api/v1/hierarchy/encuestadores
     * List pollsters (for dropdowns)
     */
    public function encuestadores(): JsonResponse
    {
        $role = Role::where('name', 'encuestador')->first();
        return response()->json(
            User::where('role_id', $role?->id)->where('is_active', true)
                ->select('id', 'name', 'last_name', 'phone')->orderBy('name')->get()
        );
    }
}
