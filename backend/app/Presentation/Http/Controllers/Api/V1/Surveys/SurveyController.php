<?php

namespace App\Presentation\Http\Controllers\Api\V1\Surveys;

use App\Application\Survey\UseCases\SubmitSurveyUseCase;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\Models\FormField;
use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SurveyController extends Controller
{
    public function __construct(
        private readonly SubmitSurveyUseCase $submitSurvey,
    ) {}

    /**
     * GET /api/v1/surveys/check?phone=XXX&form_id=YYY
     *
     * Quick duplicate check before sending OTP.
     * Auth: surveys.create
     */
    public function check(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'   => ['required', 'string'],
            'form_id' => ['required', 'integer'],
        ]);

        $phone = preg_replace('/\D/', '', $data['phone']);
        if (strlen($phone) === 10) {
            $phone = '57' . $phone;
        }

        $existingSurvey = Survey::where('respondent_phone', $phone)
            ->where('form_id', $data['form_id'])
            ->whereNotNull('submitted_at')
            ->first(['submitted_at']);

        return response()->json([
            'duplicate'    => !is_null($existingSurvey),
            'submitted_at' => $existingSurvey ? $existingSurvey->submitted_at->format('d/m/Y H:i') : null,
            'phone'        => $phone,
        ]);
    }

    /**
     * POST /api/v1/surveys
     *
     * Submit a completed survey with all responses.
     * Auth: surveys.create
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'form_id'                  => ['required', 'integer', 'exists:forms,id'],
            'group_id'                 => ['required', 'integer', 'exists:groups,id'],
            'respondent_phone'         => ['required', 'string', 'regex:/^[0-9+\s\-]{7,20}$/'],
            'respondent_name'          => ['nullable', 'string', 'max:150'],
            'respondent_last_name'     => ['nullable', 'string', 'max:150'],
            'respondent_gender'        => ['nullable', 'string', 'max:50'],
            'respondent_age'           => ['nullable', 'integer', 'min:1', 'max:120'],
            'respondent_occupation'    => ['nullable', 'string', 'max:100'],
            'respondent_neighborhood'  => ['nullable', 'string', 'max:150'],
            'respondent_address'       => ['nullable', 'string', 'max:255'],
            'encuestador_lat'          => ['nullable', 'numeric', 'between:-90,90'],
            'encuestador_lng'          => ['nullable', 'numeric', 'between:-180,180'],
            'address_lat'              => ['nullable', 'numeric', 'between:-90,90'],
            'address_lng'              => ['nullable', 'numeric', 'between:-180,180'],
            'responses'                => ['required', 'array'],
            'maps_api_calls'           => ['nullable', 'integer', 'min:0'],
            'maps_api_cost_usd'        => ['nullable', 'numeric', 'min:0'],
        ]);

        // Normalize phone
        $phone = preg_replace('/\D/', '', $data['respondent_phone']);
        if (strlen($phone) === 10) {
            $phone = '57' . $phone;
        }
        $data['respondent_phone'] = $phone;

        $survey = $this->submitSurvey->execute($data, $request->user()->id);

        return response()->json([
            'message' => 'Encuesta registrada correctamente.',
            'survey'  => [
                'id'           => $survey->id,
                'submitted_at' => $survey->submitted_at->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * GET /api/v1/surveys
     *
     * List surveys for admin/supervisor — paginated.
     * Auth: surveys.view
     */
    public function index(Request $request): JsonResponse
    {
        Log::info('Survey List Request Data', ['all' => $request->all()]);
        $query = Survey::withoutGlobalScopes()->whereNotNull('submitted_at');

        if ($formId = $request->integer('form_id')) {
            $query->where('form_id', $formId);
        }
        if ($groupId = $request->integer('group_id')) {
            $query->where('group_id', $groupId);
        }
        if ($encuestadorId = $request->integer('encuestador_id')) {
            $query->where('encuestador_id', $encuestadorId);
        }

        $search = $request->input('search') ?? $request->input('phone');
        if ($search && $search !== 'null' && $search !== 'undefined') {
            $query->where(function ($q) use ($search) {
                $q->where('respondent_phone', 'like', "%{$search}%")
                  ->orWhere('respondent_name', 'like', "%{$search}%")
                  ->orWhere('respondent_last_name', 'like', "%{$search}%");
            });
        }

        $from = $request->input('from');
        if ($from && $from !== 'null' && $from !== 'undefined') {
            $query->where('submitted_at', '>=', $from);
        }

        $to = $request->input('to');
        if ($to && $to !== 'null' && $to !== 'undefined') {
            $query->where('submitted_at', '<=', $to);
        }

        Log::info('Survey List Query', [
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings(),
            'count' => $query->count()
        ]);

        $allSurveys = $query
            ->with(['form:id,name', 'encuestador:id,name,last_name', 'group:id,name'])
            ->orderByDesc('submitted_at')
            ->get();
        
        Log::info('Survey List Results (Hard Fix)', [
            'total' => $allSurveys->count(),
            'ids' => $allSurveys->pluck('id')
        ]);

        return response()->json([
            'data' => $allSurveys,
            'total' => $allSurveys->count(),
            'per_page' => 50,
            'current_page' => 1
        ]);
    }

    /**
     * GET /api/v1/surveys/incomplete
     *
     * List incomplete (draft) surveys — submitted_at IS NULL.
     * Auth: surveys.view
     */
    public function incomplete(Request $request): JsonResponse
    {
        $query = Survey::withoutGlobalScopes()->whereNull('submitted_at');

        if ($formId = $request->integer('form_id')) {
            $query->where('form_id', $formId);
        }
        if ($groupId = $request->integer('group_id')) {
            $query->where('group_id', $groupId);
        }
        if ($encuestadorId = $request->integer('encuestador_id')) {
            $query->where('encuestador_id', $encuestadorId);
        }

        $search = $request->input('search') ?? $request->input('phone');
        if ($search && $search !== 'null' && $search !== 'undefined') {
            $query->where(function ($q) use ($search) {
                $q->where('respondent_phone', 'like', "%{$search}%")
                  ->orWhere('respondent_name', 'like', "%{$search}%")
                  ->orWhere('respondent_last_name', 'like', "%{$search}%");
            });
        }

        $surveys = $query
            ->with(['form:id,name', 'encuestador:id,name,last_name', 'group:id,name'])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['data' => $surveys, 'total' => $surveys->count()]);
    }

    /**
     * GET /api/v1/surveys/{id}
     *
     * Single survey with full responses JSONB.
     * Auth: surveys.view
     */
    public function show(int $id): JsonResponse
    {
        $survey = Survey::with(['form.fields', 'encuestador:id,name,last_name', 'group:id,name'])
            ->whereNotNull('submitted_at')
            ->findOrFail($id);

        return response()->json($survey);
    }

    /**
     * GET /api/v1/surveys/my
     *
     * Encuestador's own submitted surveys (today).
     * Auth: surveys.create (encuestador only)
     */
    public function my(Request $request): JsonResponse
    {
        $surveys = Survey::where('encuestador_id', $request->user()->id)
            ->whereNotNull('submitted_at')
            ->where('submitted_at', '>=', now()->startOfDay())
            ->with('form:id,name')
            ->orderByDesc('submitted_at')
            ->get(['id', 'form_id', 'respondent_phone', 'respondent_name', 'submitted_at']);

        return response()->json($surveys);
    }

    /**
     * GET /api/v1/surveys/export
     *
     * Streams a CSV export of surveys in 500-row chunks.
     * Supports the same filters as index(). Safe for 300k+ rows.
     * Auth: surveys.view
     */
    public function export(Request $request): StreamedResponse
    {
        set_time_limit(600);

        // ── Build same query as index() ──────────────────────────────
        $query = Survey::withoutGlobalScopes()
            ->whereNotNull('submitted_at');

        if ($formId = $request->integer('form_id')) {
            $query->where('form_id', $formId);
        }
        if ($groupId = $request->integer('group_id')) {
            $query->where('group_id', $groupId);
        }
        if ($encuestadorId = $request->integer('encuestador_id')) {
            $query->where('encuestador_id', $encuestadorId);
        }
        $search = $request->input('search');
        if ($search && $search !== 'null' && $search !== 'undefined') {
            $query->where(function ($q) use ($search) {
                $q->where('respondent_phone', 'like', "%{$search}%")
                  ->orWhere('respondent_name', 'like', "%{$search}%")
                  ->orWhere('respondent_last_name', 'like', "%{$search}%");
            });
        }
        if ($from = $request->input('from')) {
            $query->where('submitted_at', '>=', $from);
        }
        if ($to = $request->input('to')) {
            $query->where('submitted_at', '<=', $to . ' 23:59:59');
        }

        // ── Determine response field keys ────────────────────────────
        // Use form fields when a single form is filtered; otherwise scan first 200 rows.
        $responseKeys = [];
        if ($formId) {
            $responseKeys = FormField::where('form_id', $formId)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->pluck('field_key')
                ->toArray();
        } else {
            (clone $query)->select('responses')->limit(200)->get()
                ->each(function ($s) use (&$responseKeys) {
                    foreach (array_keys((array) $s->responses) as $k) {
                        if (!in_array($k, $responseKeys)) $responseKeys[] = $k;
                    }
                });
        }

        $filename = 'encuestas_' . now()->format('Y-m-d_H-i') . '.csv';

        return response()->streamDownload(function () use ($query, $responseKeys) {

            $handle = fopen('php://output', 'w');

            // UTF-8 BOM so Excel auto-detects encoding
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Header row
            $headers = array_merge(
                ['ID', 'Teléfono', 'Nombre', 'Apellido', 'Género', 'Edad',
                 'Ocupación', 'Barrio', 'Dirección', 'Lat Encuestador', 'Lng Encuestador',
                 'Formulario', 'Encuestador', 'Grupo', 'Fecha', 'Hora'],
                $responseKeys
            );
            fputcsv($handle, $headers);

            // Stream data in chunks of 500 — never loads all rows into memory
            $query->with(['form:id,name', 'encuestador:id,name,last_name', 'group:id,name'])
                ->orderByDesc('submitted_at')
                ->chunk(500, function ($surveys) use ($handle, $responseKeys) {
                    foreach ($surveys as $s) {
                        $row = [
                            $s->id,
                            $s->respondent_phone,
                            $s->respondent_name,
                            $s->respondent_last_name,
                            $s->respondent_gender,
                            $s->respondent_age,
                            $s->respondent_occupation,
                            $s->respondent_neighborhood,
                            $s->respondent_address,
                            $s->encuestador_lat,
                            $s->encuestador_lng,
                            $s->form?->name,
                            trim(($s->encuestador?->name ?? '') . ' ' . ($s->encuestador?->last_name ?? '')),
                            $s->group?->name,
                            $s->submitted_at?->format('d/m/Y'),
                            $s->submitted_at?->format('H:i:s'),
                        ];
                        foreach ($responseKeys as $key) {
                            $val = $s->responses[$key] ?? '';
                            $row[] = is_array($val) ? implode(', ', $val) : $val;
                        }
                        fputcsv($handle, $row);
                    }
                    // Flush each chunk immediately so the client receives data progressively
                    if (ob_get_level() > 0) ob_flush();
                    flush();
                });

            fclose($handle);

        }, $filename, [
            'Content-Type'      => 'text/csv; charset=UTF-8',
            'X-Accel-Buffering' => 'no',
            'Cache-Control'     => 'no-cache',
        ]);
    }
}
