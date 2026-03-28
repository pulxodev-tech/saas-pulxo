<?php

namespace App\Application\Permission\UseCases;

use App\Domain\Permission\Repositories\PermissionRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Models\Role;
use Illuminate\Validation\ValidationException;

class SyncRolePermissionsUseCase
{
    public function __construct(
        private readonly PermissionRepositoryInterface $permissionRepo,
    ) {}

    /**
     * Replace all permissions for a role.
     * System roles (super_admin) cannot be modified.
     *
     * @param int[] $permissionIds
     */
    public function execute(int $roleId, array $permissionIds): void
    {
        $role = Role::findOrFail($roleId);

        if ($role->is_system && $role->name === 'super_admin') {
            throw ValidationException::withMessages([
                'role' => 'Los permisos del Super Admin no se pueden modificar.',
            ]);
        }

        $this->permissionRepo->syncRolePermissions($roleId, $permissionIds);
    }
}
