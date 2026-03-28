<?php

namespace App\Application\User\DTOs;

final class CreateUserDTO
{
    public function __construct(
        public readonly int     $roleId,
        public readonly string  $name,
        public readonly ?string $lastName,
        public readonly ?string $email,
        public readonly ?string $phone,
        public readonly ?string $password,    // null for encuestadores
        public readonly ?string $pin,         // null for non-encuestadores
        public readonly bool    $isActive = true,
    ) {}
}
