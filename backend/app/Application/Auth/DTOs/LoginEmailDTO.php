<?php

namespace App\Application\Auth\DTOs;

final class LoginEmailDTO
{
    public function __construct(
        public readonly string $email,
        public readonly string $password,
        public readonly string $deviceName = 'web',
    ) {}
}
