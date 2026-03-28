<?php

namespace App\Domain\User\ValueObjects;

use InvalidArgumentException;

final class PhoneNumber
{
    private readonly string $value;

    private function __construct(string $raw)
    {
        $normalized = preg_replace('/\D/', '', $raw);

        if (strlen($normalized) < 7 || strlen($normalized) > 15) {
            throw new InvalidArgumentException("Invalid phone number: {$raw}");
        }

        $this->value = $normalized;
    }

    public static function fromString(string $raw): self
    {
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

    public function __toString(): string
    {
        return $this->value;
    }
}
