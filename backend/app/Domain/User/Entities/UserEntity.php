<?php

namespace App\Domain\User\Entities;

use App\Domain\User\ValueObjects\Pin;

class UserEntity
{
    public function __construct(
        public readonly ?int    $id,
        public readonly int     $roleId,
        public readonly string  $name,
        public readonly ?string $lastName,
        public readonly ?string $email,
        public readonly ?string $phone,
        public readonly bool    $isActive,
        public readonly bool    $isEncuestador,
    ) {}

    public function canLoginWithPin(): bool
    {
        return $this->isEncuestador;
    }

    public function canLoginWithEmail(): bool
    {
        return ! $this->isEncuestador && $this->email !== null;
    }

    public function fullName(): string
    {
        return trim("{$this->name} {$this->lastName}");
    }
}
