<?php

namespace App\Domain\User\ValueObjects;

use InvalidArgumentException;

final class Pin
{
    private function __construct(
        private readonly string $value
    ) {}

    public static function fromRaw(string $raw): self
    {
        if (! preg_match('/^\d{4}$/', $raw)) {
            throw new InvalidArgumentException('PIN must be exactly 4 digits.');
        }

        return new self($raw);
    }

    public function value(): string
    {
        return $this->value;
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
