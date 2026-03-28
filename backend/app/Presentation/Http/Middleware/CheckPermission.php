<?php

namespace App\Presentation\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Usage in routes: ->middleware('permission:surveys.view')
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        if (! $user->hasPermission($permission)) {
            return response()->json([
                'message'    => 'No tienes permiso para realizar esta acción.',
                'permission' => $permission,
            ], 403);
        }

        return $next($request);
    }
}
