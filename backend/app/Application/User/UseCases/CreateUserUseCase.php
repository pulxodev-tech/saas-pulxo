<?php

namespace App\Application\User\UseCases;

use App\Application\User\DTOs\CreateUserDTO;
use App\Domain\User\ValueObjects\Pin;
use App\Infrastructure\Persistence\Eloquent\Models\Role;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class CreateUserUseCase
{
    public function execute(CreateUserDTO $dto): User
    {
        $role = Role::findOrFail($dto->roleId);
        $isEncuestador = $role->name === 'encuestador';

        if (empty($dto->phone)) {
            throw ValidationException::withMessages([
                'phone' => 'El número de teléfono es obligatorio.',
            ]);
        }

        if (User::where('phone', $dto->phone)->exists()) {
            throw ValidationException::withMessages([
                'phone' => 'El número de teléfono ya está registrado.',
            ]);
        }

        if ($isEncuestador) {
            if (empty($dto->pin)) {
                throw ValidationException::withMessages([
                    'pin' => 'Los encuestadores requieren un PIN de 4 dígitos.',
                ]);
            }
            Pin::fromRaw($dto->pin);
        } else {
            if (empty($dto->password)) {
                throw ValidationException::withMessages([
                    'password' => 'Contraseña requerida para este rol.',
                ]);
            }

            if (!empty($dto->email) && User::where('email', $dto->email)->exists()) {
                throw ValidationException::withMessages([
                    'email' => 'El email ya está registrado.',
                ]);
            }
        }

        $user = User::create([
            'role_id'   => $dto->roleId,
            'name'      => $dto->name,
            'last_name' => $dto->lastName,
            'email'     => $dto->email,
            'phone'     => $dto->phone,
            'password'  => $isEncuestador ? null : Hash::make($dto->password),
            'pin'       => $isEncuestador ? Hash::make($dto->pin) : null,
            'is_active' => $dto->isActive,
        ]);

        // Auto-generate unique pollster code from user ID (e.g. ID 5 → "0005")
        $user->update(['pollster_code' => str_pad($user->id, 4, '0', STR_PAD_LEFT)]);

        return $user->load('role');
    }
}
