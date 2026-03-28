<?php

namespace App\Application\Auth\UseCases;

use App\Application\Auth\DTOs\LoginEmailDTO;
use App\Domain\User\Repositories\UserRepositoryInterface;
use App\Domain\Permission\Repositories\PermissionRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Hash;

class LoginWithEmailUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface       $userRepo,
        private readonly PermissionRepositoryInterface $permissionRepo,
    ) {}

    /**
     * @return array{token: string, user: array, permissions: string[]}
     * @throws AuthenticationException
     */
    public function execute(LoginEmailDTO $dto): array
    {
        /** @var User|null $user */
        $user = User::where(function ($q) use ($dto) {
                $q->where('email', $dto->email)
                  ->orWhere('phone', $dto->email);
            })
            ->with('role')
            ->whereNull('deleted_at')
            ->first();

        if (! $user || ! Hash::check($dto->password, $user->password)) {
            throw new AuthenticationException('Credenciales inválidas.');
        }

        if (! $user->is_active) {
            throw new AuthenticationException('Tu cuenta está desactivada. Contacta al administrador.');
        }

        // Encuestadores can only login with PIN
        if ($user->role->name === 'encuestador') {
            throw new AuthenticationException('Los encuestadores acceden con su PIN.');
        }

        $user->update(['last_login_at' => now()]);

        $permissions = $this->permissionRepo->getPermissionsForRole($user->role_id);

        $token = $user->createToken($dto->deviceName, $permissions)->plainTextToken;

        return [
            'token'       => $token,
            'user'        => $this->formatUser($user),
            'permissions' => $permissions,
        ];
    }

    private function formatUser(User $user): array
    {
        return [
            'id'           => $user->id,
            'name'         => $user->name,
            'last_name'    => $user->last_name,
            'email'        => $user->email,
            'role'         => [
                'id'           => $user->role->id,
                'name'         => $user->role->name,
                'display_name' => $user->role->display_name,
            ],
        ];
    }
}
