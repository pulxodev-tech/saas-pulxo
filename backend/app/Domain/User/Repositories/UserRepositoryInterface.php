<?php

namespace App\Domain\User\Repositories;

use App\Domain\User\Entities\UserEntity;

interface UserRepositoryInterface
{
    public function findById(int $id): ?UserEntity;

    public function findByEmail(string $email): ?UserEntity;

    /**
     * Find encuestador by their PIN (checks hash internally).
     * Returns entity only if PIN matches and user is active.
     */
    public function findByPin(string $pin, ?int $groupId = null): ?UserEntity;

    /** @return UserEntity[] */
    public function listByRole(int $roleId, bool $onlyActive = true): array;

    public function create(array $data): UserEntity;

    public function update(int $id, array $data): UserEntity;

    public function deactivate(int $id): void;

    public function activate(int $id): void;

    public function delete(int $id): void;
}
