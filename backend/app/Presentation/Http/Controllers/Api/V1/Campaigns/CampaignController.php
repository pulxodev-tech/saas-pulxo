<?php

namespace App\Presentation\Http\Controllers\Api\V1\Campaigns;

use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\Models\Audience;
use App\Infrastructure\Persistence\Eloquent\Models\Campaign;
use App\Infrastructure\Persistence\Eloquent\Models\CampaignMessage;
use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use App\Jobs\SendCampaignMessageJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    /**
     * GET /api/v1/campaigns
     * Auth: campaigns.view
     */
    public function index(Request $request): JsonResponse
    {
        $campaigns = Campaign::with('audience:id,name')
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20));
        return response()->json($campaigns);
    }

    /**
     * GET /api/v1/campaigns/{id}
     */
    public function show(int $id): JsonResponse
    {
        $campaign = Campaign::with(['audience:id,name', 'creator:id,name'])->findOrFail($id);
        $stats    = [
            'pending'   => $campaign->messages()->where('status', 'pending')->count(),
            'sent'      => $campaign->sent_count,
            'failed'    => $campaign->failed_count,
            'delivered' => $campaign->messages()->where('status', 'delivered')->count(),
        ];
        return response()->json(['campaign' => $campaign, 'stats' => $stats]);
    }

    /**
     * POST /api/v1/campaigns
     * Auth: campaigns.create
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:200'],
            'message_template' => ['required', 'string', 'max:160'],
            'channel'          => ['required', 'string', 'in:sms,sms_flash'],
            'audience_id'      => ['required', 'integer', 'exists:audiences,id'],
            'scheduled_at'     => ['nullable', 'date', 'after:now'],
        ]);

        $campaign = Campaign::create([
            ...$data,
            'status'     => 'draft',
            'created_by' => $request->user()->id,
        ]);

        return response()->json($campaign->load('audience:id,name'), 201);
    }

    /**
     * PUT /api/v1/campaigns/{id}
     * Auth: campaigns.edit — only draft campaigns
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        if ($campaign->status !== 'draft') {
            return response()->json(['message' => 'Solo se pueden editar campañas en borrador.'], 422);
        }

        $data = $request->validate([
            'name'             => ['sometimes', 'string', 'max:200'],
            'message_template' => ['sometimes', 'string', 'max:160'],
            'channel'          => ['sometimes', 'string', 'in:sms,sms_flash'],
            'audience_id'      => ['sometimes', 'integer', 'exists:audiences,id'],
            'scheduled_at'     => ['nullable', 'date'],
        ]);

        $campaign->update($data);
        return response()->json($campaign->load('audience:id,name'));
    }

    /**
     * DELETE /api/v1/campaigns/{id}
     * Auth: campaigns.delete
     */
    public function destroy(int $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        if ($campaign->status === 'sending') {
            return response()->json(['message' => 'No se puede eliminar una campaña en progreso.'], 422);
        }
        $campaign->delete();
        return response()->json(['message' => 'Campaña eliminada.']);
    }

    /**
     * POST /api/v1/campaigns/{id}/dispatch
     *
     * Resolves audience → creates campaign_messages → dispatches jobs.
     * Auth: campaigns.send
     */
    public function dispatch(int $id, Request $request): JsonResponse
    {
        $campaign = Campaign::with('audience')->findOrFail($id);

        if (!$campaign->canDispatch()) {
            return response()->json(['message' => 'La campaña ya fue enviada o está en progreso.'], 422);
        }

        // Resolve audience phones from surveys
        $audience = $campaign->audience;
        $filters  = $audience?->filters ?? [];

        $surveyQuery = Survey::whereNotNull('submitted_at')
            ->whereNotNull('respondent_phone');

        if (!empty($filters['form_id']))   $surveyQuery->where('form_id',   $filters['form_id']);
        if (!empty($filters['group_id']))  $surveyQuery->where('group_id',  $filters['group_id']);
        if (!empty($filters['gender']))    $surveyQuery->where('respondent_gender',       $filters['gender']);
        if (!empty($filters['age_min']))   $surveyQuery->where('respondent_age', '>=', $filters['age_min']);
        if (!empty($filters['age_max']))   $surveyQuery->where('respondent_age', '<=', $filters['age_max']);
        if (!empty($filters['neighborhood'])) {
            $surveyQuery->where('respondent_neighborhood', 'like', '%' . $filters['neighborhood'] . '%');
        }

        $respondents = $surveyQuery
            ->distinct('respondent_phone')
            ->get(['respondent_phone', 'respondent_name']);

        if ($respondents->isEmpty()) {
            return response()->json(['message' => 'La audiencia no tiene respondentes con los filtros aplicados.'], 422);
        }

        // Snapshot + update campaign status
        $snapshot = $respondents->pluck('respondent_phone')->toArray();
        $campaign->update([
            'status'            => 'sending',
            'started_at'        => now(),
            'total_recipients'  => $respondents->count(),
            'sent_count'        => 0,
            'failed_count'      => 0,
            'audience_snapshot' => $snapshot,
        ]);

        // Create message records + dispatch jobs
        foreach ($respondents as $r) {
            $msg = CampaignMessage::create([
                'campaign_id'    => $campaign->id,
                'phone'          => $r->respondent_phone,
                'respondent_name'=> $r->respondent_name,
                'status'         => 'pending',
            ]);

            // Personalize message
            $text = str_replace(
                ['{nombre}', '{name}'],
                [$r->respondent_name ?? 'amigo/a', $r->respondent_name ?? 'amigo/a'],
                $campaign->message_template
            );

            SendCampaignMessageJob::dispatch(
                $msg->id,
                $campaign->id,
                $r->respondent_phone,
                $text,
                $campaign->channel,
            );
        }

        return response()->json([
            'message'    => "Campaña despachada. {$respondents->count()} mensajes en cola.",
            'recipients' => $respondents->count(),
        ]);
    }

    /**
     * POST /api/v1/campaigns/{id}/cancel
     * Auth: campaigns.send
     */
    public function cancel(int $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        if (!in_array($campaign->status, ['draft', 'scheduled', 'sending'])) {
            return response()->json(['message' => 'No se puede cancelar esta campaña.'], 422);
        }
        $campaign->update(['status' => 'cancelled']);
        // Pending messages remain but no more jobs are dispatched
        CampaignMessage::where('campaign_id', $id)->where('status', 'pending')->update(['status' => 'failed', 'error_message' => 'Campaña cancelada']);
        return response()->json(['message' => 'Campaña cancelada.']);
    }

    /**
     * GET /api/v1/campaigns/{id}/messages
     * Auth: campaigns.view
     */
    public function messages(int $id, Request $request): JsonResponse
    {
        $messages = CampaignMessage::where('campaign_id', $id)
            ->when($request->input('status'), fn($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->paginate(50);
        return response()->json($messages);
    }

    // ── Audiences ─────────────────────────────────────────────────────────

    /** GET /api/v1/campaigns/audiences */
    public function indexAudiences(): JsonResponse
    {
        return response()->json(Audience::orderByDesc('created_at')->get());
    }

    /** POST /api/v1/campaigns/audiences */
    public function storeAudience(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'              => ['required', 'string', 'max:150'],
            'description'       => ['nullable', 'string'],
            'filters'           => ['required', 'array'],
            'filters.form_id'   => ['nullable', 'integer'],
            'filters.group_id'  => ['nullable', 'integer'],
            'filters.gender'    => ['nullable', 'string', 'in:M,F,O,NR'],
            'filters.age_min'   => ['nullable', 'integer', 'min:1'],
            'filters.age_max'   => ['nullable', 'integer', 'max:120'],
            'filters.neighborhood' => ['nullable', 'string'],
        ]);

        // Calculate estimated count
        $filters = $data['filters'];
        $count = Survey::whereNotNull('submitted_at')->whereNotNull('respondent_phone')
            ->when(!empty($filters['form_id']),      fn($q) => $q->where('form_id',  $filters['form_id']))
            ->when(!empty($filters['group_id']),     fn($q) => $q->where('group_id', $filters['group_id']))
            ->when(!empty($filters['gender']),       fn($q) => $q->where('respondent_gender', $filters['gender']))
            ->when(!empty($filters['age_min']),      fn($q) => $q->where('respondent_age', '>=', $filters['age_min']))
            ->when(!empty($filters['age_max']),      fn($q) => $q->where('respondent_age', '<=', $filters['age_max']))
            ->when(!empty($filters['neighborhood']), fn($q) => $q->where('respondent_neighborhood', 'like', '%' . $filters['neighborhood'] . '%'))
            ->distinct('respondent_phone')->count();

        $audience = Audience::create([
            ...$data,
            'estimated_count' => $count,
            'created_by'      => $request->user()->id,
        ]);

        return response()->json($audience, 201);
    }

    /** DELETE /api/v1/campaigns/audiences/{id} */
    public function destroyAudience(int $id): JsonResponse
    {
        Audience::findOrFail($id)->delete();
        return response()->json(['message' => 'Audiencia eliminada.']);
    }

    /**
     * GET /api/v1/campaigns/audiences/preview?form_id=X&...
     * Quick count without saving.
     */
    public function previewAudience(Request $request): JsonResponse
    {
        $filters = $request->only(['form_id', 'group_id', 'gender', 'age_min', 'age_max', 'neighborhood']);
        $count = Survey::whereNotNull('submitted_at')->whereNotNull('respondent_phone')
            ->when(!empty($filters['form_id']),      fn($q) => $q->where('form_id',  $filters['form_id']))
            ->when(!empty($filters['group_id']),     fn($q) => $q->where('group_id', $filters['group_id']))
            ->when(!empty($filters['gender']),       fn($q) => $q->where('respondent_gender', $filters['gender']))
            ->when(!empty($filters['age_min']),      fn($q) => $q->where('respondent_age', '>=', $filters['age_min']))
            ->when(!empty($filters['age_max']),      fn($q) => $q->where('respondent_age', '<=', $filters['age_max']))
            ->when(!empty($filters['neighborhood']), fn($q) => $q->where('respondent_neighborhood', 'like', '%' . $filters['neighborhood'] . '%'))
            ->distinct('respondent_phone')->count();
        return response()->json(['count' => $count]);
    }
}
