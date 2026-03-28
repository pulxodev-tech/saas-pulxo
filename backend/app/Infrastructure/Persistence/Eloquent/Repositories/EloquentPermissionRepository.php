<?php

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Permission\Repositories\PermissionRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Models\PermissionGroup;
use App\Infrastructure\Persistence\Eloquent\Models\Role;

class EloquentPermissionRepository implements PermissionRepositoryInterface
{
    public function getPermissionsForRole(int $roleId): array
    {
        $role = Role::with('permissions')->find($roleId);

        if (! $role) {
            return [];
        }

        // Super admin gets wildcard — checked separately in User::hasPermission()
        if ($role->name === 'super_admin') {
            return ['*'];
        }

        return $role->permissions->pluck('name')->toArray();
    }

    public function getPermissionIdsForRole(int $roleId): array
    {
        $role = Role::with('permissions')->find($roleId);

        if (! $role) {
            return [];
        }

        return $role->permissions->pluck('id')->toArray();
    }

    public function syncRolePermissions(int $roleId, array $permissionIds): void
    {
        Role::findOrFail($roleId)->permissions()->sync($permissionIds);
    }

    public function getAllGrouped(): array
    {
        return PermissionGroup::with('permissions')
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($group) => [
                'id'           => $group->id,
                'name'         => $group->name,
                'display_name' => $group->display_name,
                'permissions'  => $group->permissions->map(fn ($p) => [
                    'id'           => $p->id,
                    'name'         => $p->name,
                    'display_name' => $p->display_name,
                    'description'  => $p->description,
                ])->toArray(),
            ])
            ->toArray();
    }

    public function getRoles(): array
    {
        return Role::withCount('permissions')
            ->whereNull('deleted_at')
            ->get()
            ->map(fn ($r) => [
                'id'               => $r->id,
                'name'             => $r->name,
                'display_name'     => $r->display_name,
                'is_system'        => $r->is_system,
                'permissions_count'=> $r->permissions_count,
            ])
            ->toArray();
    }
}
