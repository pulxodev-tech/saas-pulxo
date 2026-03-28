<?php

namespace App\Presentation\Http\Controllers\Api\V1\Auth;

use App\Application\Auth\DTOs\LoginEmailDTO;
use App\Application\Auth\DTOs\LoginPinDTO;
use App\Application\Auth\UseCases\LoginWithEmailUseCase;
use App\Application\Auth\UseCases\LoginWithPinUseCase;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly LoginWithEmailUseCase $loginEmail,
        private readonly LoginWithPinUseCase   $loginPin,
    ) {}

    /**
     * POST /api/v1/auth/login
     * For all roles except encuestador.
     */
    public function loginEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'       => 'required|string',
            'password'    => 'required|string',
            'device_name' => 'sometimes|string|max:80',
        ]);

        $key = 'login_email:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Demasiados intentos. Espera {$seconds} segundos.",
            ], 429);
        }

        try {
            $result = $this->loginEmail->execute(new LoginEmailDTO(
                email:      $data['email'],
                password:   $data['password'],
                deviceName: $data['device_name'] ?? 'web',
            ));

            RateLimiter::clear($key);

            return response()->json($result);

        } catch (AuthenticationException $e) {
            RateLimiter::hit($key, 60);

            return response()->json(['message' => $e->getMessage()], 401);
        }
    }

    /**
     * POST /api/v1/auth/login/pin
     * For encuestadores only.
     */
    public function loginPin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pin'      => 'required|digits:4',
            'group_id' => 'sometimes|integer|exists:groups,id',
        ]);

        $key = 'login_pin:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 10)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Demasiados intentos. Espera {$seconds} segundos.",
            ], 429);
        }

        try {
            $result = $this->loginPin->execute(new LoginPinDTO(
                pin:     $data['pin'],
                groupId: $data['group_id'] ?? null,
            ));

            RateLimiter::clear($key);

            return response()->json($result);

        } catch (AuthenticationException $e) {
            RateLimiter::hit($key, 30);

            return response()->json(['message' => $e->getMessage()], 401);
        }
    }

    /**
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada correctamente.']);
    }

    /**
     * GET /api/v1/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        return response()->json([
            'id'          => $user->id,
            'name'        => $user->name,
            'last_name'   => $user->last_name,
            'email'       => $user->email,
            'phone'       => $user->phone,
            'is_active'   => $user->is_active,
            'role'        => [
                'id'           => $user->role->id,
                'name'         => $user->role->name,
                'display_name' => $user->role->display_name,
            ],
            'permissions' => $user->currentAccessToken()->abilities ?? [],
        ]);
    }
}
