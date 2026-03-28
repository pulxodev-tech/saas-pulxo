<?php

namespace App\Presentation\Http\Controllers\Api\V1\Roles;

use App\Application\Permission\UseCases\SyncRolePermissionsUseCase;
use App\Domain\Permission\Repositories\PermissionRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class RolePermissionController extends Controller
{
    public function __construct(
        private readonly PermissionRepositoryInterface $permissionRepo,
        private readonly SyncRolePermissionsUseCase    $syncPermissions,
    ) {}

    /**
     * GET /api/v1/roles
     * All roles with permission count.
     */
    public function indexRoles(): JsonResponse
    {
        return response()->json($this->permissionRepo->getRoles());
    }

    /**
     * GET /api/v1/permissions
     * All permissions grouped — for the permission manager UI.
     */
    public function indexPermissions(): JsonResponse
    {
        return response()->json($this->permissionRepo->getAllGrouped());
    }

    /**
     * GET /api/v1/roles/{roleId}/permissions
     * Current permissions of a role.
     */
    public function showRolePermissions(int $roleId): JsonResponse
    {
        Role::findOrFail($roleId);

        $permissions = $this->permissionRepo->getPermissionIdsForRole($roleId);

        return response()->json($permissions);
    }

    /**
     * PUT /api/v1/roles/{roleId}/permissions
     * Replace all permissions for a role (permission manager).
     */
    public function syncRolePermissions(Request $request, int $roleId): JsonResponse
    {
        $data = $request->validate([
            'permission_ids'   => 'required|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        $this->syncPermissions->execute($roleId, $data['permission_ids']);

        return response()->json(['message' => 'Permisos actualizados correctamente.']);
    }
}
