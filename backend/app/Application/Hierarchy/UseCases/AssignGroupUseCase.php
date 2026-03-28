<?php

namespace App\Application\Hierarchy\UseCases;

use App\Infrastructure\Persistence\Eloquent\Models\Group;
use App\Infrastructure\Persistence\Eloquent\Models\GroupMember;
use App\Infrastructure\Persistence\Eloquent\Models\Hierarchy;
use App\Infrastructure\Persistence\Eloquent\Models\Role;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Validation\ValidationException;

class AssignGroupUseCase
{
    /**
     * Link coordinator → supervisor → group in the hierarchy.
     */
    public function assignHierarchy(int $coordinatorId, int $supervisorId, int $groupId): Hierarchy
    {
        $this->validateRole($coordinatorId, 'coordinador', 'coordinador');
        $this->validateRole($supervisorId, 'supervisor', 'supervisor');
        Group::findOrFail($groupId);

        // Validation: A supervisor cannot be assigned to another group simultaneously
        $existsElsewhere = Hierarchy::where('supervisor_id', $supervisorId)
            ->where('is_active', true)
            ->where('group_id', '!=', $groupId)
            ->exists();

        if ($existsElsewhere) {
            throw ValidationException::withMessages([
                'supervisor' => 'Este supervisor ya está asignado a otro grupo de trabajo.',
            ]);
        }

        return Hierarchy::updateOrCreate(
            ['group_id' => $groupId], // Key by group_id ensures only one supervisor/coordinator per group if we want that
            [
                'coordinator_id' => $coordinatorId,
                'supervisor_id'  => $supervisorId,
                'is_active' => true
            ]
        );
    }

    /**
     * Add an encuestador to a group.
     */
    public function addMember(int $groupId, int $userId): GroupMember
    {
        $this->validateRole($userId, 'encuestador', 'encuestador');
        Group::findOrFail($groupId);

        // Encuestador can only belong to one group — remove from current if any
        GroupMember::where('user_id', $userId)
            ->where('group_id', '!=', $groupId)
            ->delete();

        return GroupMember::updateOrCreate(
            ['group_id' => $groupId, 'user_id' => $userId],
            ['is_active' => true]
        );
    }

    /**
     * Remove encuestador from group (soft).
     */
    public function removeMember(int $groupId, int $userId): void
    {
        GroupMember::where('group_id', $groupId)
            ->where('user_id', $userId)
            ->update(['is_active' => false]);
    }

    private function validateRole(int $userId, string $roleName, string $label): void
    {
        $user = User::with('role')->find($userId);
        if (! $user || $user->role?->name !== $roleName) {
            throw ValidationException::withMessages([
                $label => "El usuario seleccionado no tiene el rol de {$label}.",
            ]);
        }
    }
}
