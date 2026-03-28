<?php

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\User\Entities\UserEntity;
use App\Domain\User\Repositories\UserRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Models\Role;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Support\Facades\Hash;

class EloquentUserRepository implements UserRepositoryInterface
{
    public function findById(int $id): ?UserEntity
    {
        $user = User::with('role')->find($id);
        return $user ? $this->toEntity($user) : null;
    }

    public function findByEmail(string $email): ?UserEntity
    {
        $user = User::with('role')->where('email', $email)->first();
        return $user ? $this->toEntity($user) : null;
    }

    public function findByPin(string $pin, ?int $groupId = null): ?UserEntity
    {
        $encuestadorRole = Role::where('name', 'encuestador')->first();
        if (! $encuestadorRole) return null;

        $query = User::with('role')
            ->where('role_id', $encuestadorRole->id)
            ->where('is_active', true)
            ->whereNull('deleted_at');

        if ($groupId !== null) {
            $query->whereHas('groupMemberships', fn ($q) =>
                $q->where('group_id', $groupId)->where('is_active', true)
            );
        }

        foreach ($query->get() as $candidate) {
            if (Hash::check($pin, $candidate->pin)) {
                return $this->toEntity($candidate);
            }
        }

        return null;
    }

    public function listByRole(int $roleId, bool $onlyActive = true): array
    {
        return User::with('role')
            ->where('role_id', $roleId)
            ->when($onlyActive, fn ($q) => $q->where('is_active', true))
            ->get()
            ->map(fn ($u) => $this->toEntity($u))
            ->toArray();
    }

    public function create(array $data): UserEntity
    {
        $user = User::create($data);
        return $this->toEntity($user->load('role'));
    }

    public function update(int $id, array $data): UserEntity
    {
        $user = User::findOrFail($id);
        $user->update($data);
        return $this->toEntity($user->load('role'));
    }

    public function deactivate(int $id): void
    {
        User::findOrFail($id)->update(['is_active' => false]);
    }

    public function activate(int $id): void
    {
        User::findOrFail($id)->update(['is_active' => true]);
    }

    public function delete(int $id): void
    {
        User::findOrFail($id)->delete();
    }

    private function toEntity(User $user): UserEntity
    {
        return new UserEntity(
            id:            $user->id,
            roleId:        $user->role_id,
            name:          $user->name,
            lastName:      $user->last_name,
            email:         $user->email,
            phone:         $user->phone,
            isActive:      $user->is_active,
            isEncuestador: $user->role?->name === 'encuestador',
        );
    }
}
