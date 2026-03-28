<?php

namespace App\Application\Dashboard\UseCases;

use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Support\Facades\DB;

class GetDashboardStatsUseCase
{
    /**
     * Return summary stats for the main dashboard.
     *
     * @param  array  $filters  [form_id, group_id, date_from, date_to]
     */
    public function execute(array $filters = []): array
    {
        $today     = now()->startOfDay();
        $todayEnd  = now()->endOfDay();
        $from      = $filters['date_from'] ?? $today->toDateString();
        $to        = $filters['date_to']   ?? $todayEnd->toDateString();

        // Base query scoped to the period
        $base = Survey::whereNotNull('submitted_at')
            ->whereBetween('submitted_at', [$from . ' 00:00:00', $to . ' 23:59:59']);

        if (!empty($filters['form_id']))  $base->where('form_id',  $filters['form_id']);
        if (!empty($filters['group_id'])) $base->where('group_id', $filters['group_id']);

        // ── Counters ──────────────────────────────────────────────────────────
        $lifetimeTotal = Survey::whereNotNull('submitted_at')->count();
        $totalSurveys  = (clone $base)->count();

        $totalToday = Survey::whereNotNull('submitted_at')
            ->whereBetween('submitted_at', [now()->startOfDay(), now()->endOfDay()])
            ->when(!empty($filters['form_id']),  fn($q) => $q->where('form_id',  $filters['form_id']))
            ->when(!empty($filters['group_id']), fn($q) => $q->where('group_id', $filters['group_id']))
            ->count();

        $activeEncuestadores = Survey::whereNotNull('submitted_at')
            ->where('submitted_at', '>=', now()->subHour())
            ->distinct('encuestador_id')
            ->count('encuestador_id');

        $totalEncuestadores = User::whereHas('role', fn($q) => $q->where('name', 'encuestador'))
            ->where('is_active', true)->count();

        // ── Per-hour chart (today only) ────────────────────────────────────────
        $perHour = Survey::whereNotNull('submitted_at')
            ->whereBetween('submitted_at', [$today, now()])
            ->when(!empty($filters['form_id']),  fn($q) => $q->where('form_id',  $filters['form_id']))
            ->when(!empty($filters['group_id']), fn($q) => $q->where('group_id', $filters['group_id']))
            ->select(DB::raw('HOUR(submitted_at) as hour'), DB::raw('COUNT(*) as total'))
            ->groupBy('hour')
            ->orderBy('hour')
            ->pluck('total', 'hour')
            ->toArray();

        // Fill gaps 0-23 with 0
        $hourlyData = [];
        for ($h = 0; $h <= 23; $h++) {
            $hourlyData[$h] = $perHour[$h] ?? 0;
        }

        // ── Per-group breakdown ───────────────────────────────────────────────
        $byGroup = (clone $base)
            ->join('groups', 'surveys.group_id', '=', 'groups.id')
            ->select('groups.name as group_name', DB::raw('COUNT(*) as total'))
            ->groupBy('groups.id', 'groups.name')
            ->orderByDesc('total')
            ->limit(10)
            ->get(['group_name', 'total']);

        // ── Per-encuestador ranking (top 10) ──────────────────────────────────
        $byEncuestador = (clone $base)
            ->join('users', 'surveys.encuestador_id', '=', 'users.id')
            ->select(
                'users.id',
                DB::raw("CONCAT(users.name, ' ', COALESCE(users.last_name,'')) as full_name"),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('users.id', 'users.name', 'users.last_name')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // ── Per-form breakdown ────────────────────────────────────────────────
        $byForm = (clone $base)
            ->join('forms', 'surveys.form_id', '=', 'forms.id')
            ->select('forms.name as form_name', DB::raw('COUNT(*) as total'))
            ->groupBy('forms.id', 'forms.name')
            ->orderByDesc('total')
            ->get();

        // ── GPS coverage % ────────────────────────────────────────────────────
        $withGps    = (clone $base)->whereNotNull('encuestador_lat')->count();
        $gpsCoverage = $totalSurveys > 0 ? round(($withGps / $totalSurveys) * 100) : 0;

        // ── Recent Points for Map ─────────────────────────────────────────────
        $recentPoints = (clone $base)
            ->whereNotNull('encuestador_lat')
            ->orderByDesc('submitted_at')
            ->limit(200)
            ->get(['id', 'encuestador_lat', 'encuestador_lng', 'form_id', 'submitted_at'])
            ->map(fn($s) => [
                'id' => $s->id,
                'lat' => (float)$s->encuestador_lat,
                'lng' => (float)$s->encuestador_lng,
                'form_id' => $s->form_id,
                'time' => $s->submitted_at?->format('H:i'),
            ]);

        return [
            'period'               => ['from' => $from, 'to' => $to],
            'total_surveys'        => $totalSurveys,
            'lifetime_total'       => $lifetimeTotal,
            'total_today'          => $totalToday,
            'active_encuestadores' => $activeEncuestadores,
            'total_encuestadores'  => $totalEncuestadores,
            'gps_coverage_pct'     => $gpsCoverage,
            'hourly_today'         => $hourlyData,
            'by_group'             => $byGroup,
            'by_encuestador'       => $byEncuestador,
            'by_form'              => $byForm,
            'recent_points'        => $recentPoints,
        ];
    }
}
