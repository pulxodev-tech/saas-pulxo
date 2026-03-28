<?php

namespace App\Application\Auth\DTOs;

final class LoginPinDTO
{
    public function __construct(
        public readonly string $pin,
        public readonly ?int   $groupId = null,
        public readonly string $deviceName = 'mobile',
    ) {}
}
