<?php

namespace App\Presentation\Http\Controllers\Api\V1\Users;

use App\Application\User\DTOs\CreateUserDTO;
use App\Application\User\UseCases\ChangePasswordUseCase;
use App\Application\User\UseCases\CreateUserUseCase;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function __construct(
        private readonly CreateUserUseCase    $createUser,
        private readonly ChangePasswordUseCase $changePassword,
    ) {}

    /**
     * GET /api/v1/users
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('role')
            ->whereNull('deleted_at')
            ->when($request->role_id, fn ($q) => $q->where('role_id', $request->role_id))
            ->when($request->search, fn ($q) =>
                $q->where(fn ($q2) =>
                    $q2->where('name', 'LIKE', "%{$request->search}%")
                       ->orWhere('last_name', 'LIKE', "%{$request->search}%")
                       ->orWhere('phone', 'LIKE', "%{$request->search}%")
                )
            )
            ->when(isset($request->is_active), fn ($q) =>
                $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN))
            );

        $perPage = min((int) ($request->per_page ?? 25), 100);
        $users   = $query->orderBy('name')->paginate($perPage);

        return response()->json($users);
    }

    /**
     * POST /api/v1/users
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'role_id'   => 'required|integer|exists:roles,id',
            'name'      => 'required|string|max:150',
            'last_name' => 'nullable|string|max:150',
            'email'     => 'nullable|email|max:180',
            'phone'     => 'required|string|regex:/^[0-9]{10}$/',
            'password'  => 'nullable|string|min:8',
            'pin'       => 'nullable|digits:4',
            'is_active' => 'boolean',
        ]);

        $user = $this->createUser->execute(new CreateUserDTO(
            roleId:    $data['role_id'],
            name:      $data['name'],
            lastName:  $data['last_name'] ?? null,
            email:     $data['email'] ?? null,
            phone:     $data['phone'] ?? null,
            password:  $data['password'] ?? null,
            pin:       $data['pin'] ?? null,
            isActive:  $data['is_active'] ?? true,
        ));

        return response()->json($user, 201);
    }

    /**
     * GET /api/v1/users/{id}
     */
    public function show(int $id): JsonResponse
    {
        $user = User::with('role', 'groupMemberships.group')->findOrFail($id);

        return response()->json($user);
    }

    /**
     * PUT /api/v1/users/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'role_id'   => 'sometimes|integer|exists:roles,id',
            'name'      => 'sometimes|string|max:150',
            'last_name' => 'nullable|string|max:150',
            'phone'     => 'nullable|string|max:20',
            'password'  => 'nullable|string|min:8',
            'pin'       => 'nullable|digits:4',
            'is_active' => 'sometimes|boolean',
        ]);

        $user = User::with('role')->findOrFail($id);

        // Handle password/pin hashing if provided
        if (!empty($data['password'])) {
            $data['password'] = \Illuminate\Support\Facades\Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        if (!empty($data['pin'])) {
            $data['pin'] = \Illuminate\Support\Facades\Hash::make($data['pin']);
        } else {
            unset($data['pin']);
        }

        $user->update($data);

        return response()->json($user->load('role'));
    }

    /**
     * PATCH /api/v1/users/{id}/toggle-active
     */
    public function toggleActive(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => ! $user->is_active]);

        return response()->json([
            'id'        => $user->id,
            'is_active' => $user->is_active,
            'message'   => $user->is_active ? 'Usuario activado.' : 'Usuario desactivado.',
        ]);
    }

    /**
     * PATCH /api/v1/users/{id}/change-password
     */
    public function changePasswordAction(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $this->changePassword->changePassword($id, $data['new_password'], $request->user());

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }

    /**
     * PATCH /api/v1/users/{id}/change-pin
     */
    public function changePinAction(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'new_pin' => 'required|digits:4',
        ]);

        $this->changePassword->changePin($id, $data['new_pin'], $request->user());

        return response()->json(['message' => 'PIN actualizado correctamente.']);
    }

    /**
     * DELETE /api/v1/users/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(null, 204);
    }
}
