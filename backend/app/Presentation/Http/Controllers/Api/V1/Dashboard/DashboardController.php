<?php

namespace App\Presentation\Http\Controllers\Api\V1\Dashboard;

use App\Application\Dashboard\UseCases\GetDashboardStatsUseCase;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly GetDashboardStatsUseCase $stats) {}

    /**
     * GET /api/v1/dashboard
     *
     * Query params: form_id, group_id, date_from, date_to
     * Auth: dashboard.view
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['form_id', 'group_id', 'date_from', 'date_to']);
        return response()->json($this->stats->execute($filters));
    }
}
