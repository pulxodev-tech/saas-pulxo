<?php

namespace App\Application\Auth\UseCases;

use App\Application\Auth\DTOs\LoginPinDTO;
use App\Domain\User\ValueObjects\Pin;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use App\Infrastructure\Persistence\Eloquent\Models\GroupMember;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Hash;

class LoginWithPinUseCase
{
    /**
     * @return array{token: string, user: array, group: array|null}
     * @throws AuthenticationException
     */
    public function execute(LoginPinDTO $dto): array
    {
        // Validate PIN format
        try {
            $pin = Pin::fromRaw($dto->pin);
        } catch (\InvalidArgumentException) {
            throw new AuthenticationException('El PIN debe ser de 4 dígitos.');
        }

        // Encuestadores: find by matching PIN hash
        // We query active encuestadores and check hash to avoid timing attacks
        $encuestadorRole = \App\Infrastructure\Persistence\Eloquent\Models\Role::where('name', 'encuestador')->first();

        if (! $encuestadorRole) {
            throw new AuthenticationException('Configuración de roles incorrecta.');
        }

        $query = User::where('role_id', $encuestadorRole->id)
            ->where('is_active', true)
            ->whereNull('deleted_at');

        // If groupId provided, restrict to that group for performance
        if ($dto->groupId !== null) {
            $query->whereHas('groupMemberships', fn ($q) =>
                $q->where('group_id', $dto->groupId)->where('is_active', true)
            );
        }

        $user = null;

        // Iterate only active encuestadores (bounded set — max ~289)
        foreach ($query->get() as $candidate) {
            if (Hash::check($pin->value(), $candidate->pin)) {
                $user = $candidate;
                break;
            }
        }

        if (! $user) {
            throw new AuthenticationException('PIN incorrecto.');
        }

        $user->update(['last_login_at' => now()]);

        $group = GroupMember::with('group')
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        $token = $user->createToken($dto->deviceName, ['surveys.create'])->plainTextToken;

        return [
            'token' => $token,
            'user'  => [
                'id'        => $user->id,
                'name'      => $user->name,
                'last_name' => $user->last_name,
                'role'      => 'encuestador',
            ],
            'group' => $group ? [
                'id'   => $group->group->id,
                'name' => $group->group->name,
            ] : null,
        ];
    }
}
