<?php

namespace App\Application\User\UseCases;

use App\Domain\User\ValueObjects\Pin;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ChangePasswordUseCase
{
    /**
     * Change password for admin-type users.
     * Super Admins can change anyone's password; others can only change their own.
     */
    public function changePassword(int $targetUserId, string $newPassword, User $actor): void
    {
        $target = User::with('role')->findOrFail($targetUserId);

        if ($target->role->name === 'encuestador') {
            throw ValidationException::withMessages([
                'password' => 'Los encuestadores no tienen contraseña. Usa cambio de PIN.',
            ]);
        }

        $this->authorizeActor($actor, $target);

        $target->update(['password' => Hash::make($newPassword)]);
    }

    /**
     * Change PIN for encuestadores.
     */
    public function changePin(int $targetUserId, string $newPin, User $actor): void
    {
        $target = User::with('role')->findOrFail($targetUserId);

        if ($target->role->name !== 'encuestador') {
            throw ValidationException::withMessages([
                'pin' => 'Este usuario usa contraseña, no PIN.',
            ]);
        }

        Pin::fromRaw($newPin); // validates 4 digits

        $this->authorizeActor($actor, $target);

        $target->update(['pin' => Hash::make($newPin)]);
    }

    private function authorizeActor(User $actor, User $target): void
    {
        $actorRole = $actor->role->name;

        // Super admin can change anyone
        if ($actorRole === 'super_admin') {
            return;
        }

        // Others can only change their own
        if ($actor->id !== $target->id) {
            throw ValidationException::withMessages([
                'authorization' => 'No tienes permisos para cambiar la contraseña de otro usuario.',
            ]);
        }
    }
}
