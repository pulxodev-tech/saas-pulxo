<?php

namespace App\Domain\Permission\Repositories;

interface PermissionRepositoryInterface
{
    /**
     * Get all permission names for a given role.
     * @return string[]
     */
    public function getPermissionsForRole(int $roleId): array;
    
    /**
     * @return int[]
     */
    public function getPermissionIdsForRole(int $roleId): array;

    /**
     * Replace all permissions for a role.
     * @param int[] $permissionIds
     */
    public function syncRolePermissions(int $roleId, array $permissionIds): void;

    /**
     * Get all permissions grouped by their group.
     */
    public function getAllGrouped(): array;

    public function getRoles(): array;
}
