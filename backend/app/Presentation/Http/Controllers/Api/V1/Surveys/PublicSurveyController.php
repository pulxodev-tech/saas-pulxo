<?php
namespace App\Presentation\Http\Controllers\Api\V1\Surveys;

use App\Application\Survey\UseCases\SubmitSurveyUseCase;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\Models\Form;
use App\Infrastructure\Persistence\Eloquent\Models\Otp;
use App\Infrastructure\Persistence\Eloquent\Models\Parameter;
use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use App\Infrastructure\Persistence\Eloquent\Models\GroupMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class PublicSurveyController extends Controller
{
    public function __construct(
        private readonly SubmitSurveyUseCase $submitSurvey,
    ) {}

    /**
     * GET /api/v1/public/pollster-check?pin=XXXX
     * Validates a pollster by their 4-digit PIN (hashed).
     */
    public function checkPollster(Request $request): JsonResponse
    {
        $pin = $request->query('pin', '');

        if (!preg_match('/^\d{4}$/', $pin)) {
            return response()->json([
                'valid' => false,
                'message' => 'El código debe ser de 4 dígitos.',
            ], 422);
        }

        // PINs are hashed — must iterate active pollsters (bounded set)
        $candidates = User::where('is_active', true)
            ->whereNotNull('pin')
            ->whereHas('role', function ($q) {
                $q->whereIn('name', ['encuestador', 'super_admin', 'coordinator', 'supervisor']);
            })
            ->get();

        $user = null;
        foreach ($candidates as $candidate) {
            if (Hash::check($pin, $candidate->pin)) {
                $user = $candidate;
                break;
            }
        }

        if (!$user) {
            return response()->json([
                'valid'   => false,
                'message' => 'Código no válido o usuario inactivo.',
            ], 404);
        }

        $group = GroupMember::where('user_id', $user->id)->where('is_active', true)->first();

        return response()->json([
            'valid' => true,
            'pollster' => [
                'id'       => $user->id,
                'name'     => "{$user->name} {$user->last_name}",
                'group_id' => $group?->group_id,
            ],
        ]);
    }

    /**
     * GET /api/v1/public/forms/{id}
     * Loads a form publicly if published.
     */
    public function getPublicForm(int $id): JsonResponse
    {
        $form = Form::with('fields')->where('is_published', true)->findOrFail($id);
        return response()->json($form);
    }

    /**
     * POST /api/v1/public/surveys
     * Handles public submission.
     */
    public function submitPublic(Request $request): JsonResponse
    {
        $data = $request->validate([
            'form_id'                  => ['required', 'integer', 'exists:forms,id'],
            'group_id'                 => ['required', 'integer', 'exists:groups,id'],
            'pollster_id'              => ['required', 'integer', 'exists:users,id'],
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
            'address_source'           => ['nullable', 'string', 'in:gps,maps'],
            'address_lat'              => ['nullable', 'numeric', 'between:-90,90'],
            'address_lng'              => ['nullable', 'numeric', 'between:-180,180'],
            'responses'                => ['required', 'array'],
        ]);

        $phone = preg_replace('/\D/', '', $data['respondent_phone']);
        if (strlen($phone) === 10) {
            $phone = '57' . $phone;
        }
        $data['respondent_phone'] = $phone;

        Log::info('Public Survey Payload', ['data' => $data, 'pollster_id' => $data['pollster_id']]);

        try {
            $survey = $this->submitSurvey->execute($data, $data['pollster_id']);
            Log::info('Public Survey Success', ['id' => $survey->id]);
        } catch (\Exception $e) {
            Log::error('Public Survey Failure', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            throw $e;
        }

        return response()->json([
            'message' => 'Encuesta pública registrada correctamente.',
            'survey'  => [
                'id' => $survey->id,
            ],
        ], 201);
    }

    /**
     * POST /api/v1/public/surveys/draft
     * Guarda o actualiza una encuesta incompleta (borrador).
     */
    public function saveDraft(Request $request): JsonResponse
    {
        $data = $request->validate([
            'form_id'          => ['required', 'integer', 'exists:forms,id'],
            'group_id'         => ['required', 'integer', 'exists:groups,id'],
            'pollster_id'      => ['required', 'integer', 'exists:users,id'],
            'respondent_phone' => ['required', 'string'],
            'responses'        => ['nullable', 'array'],
        ]);

        $phone = preg_replace('/\D/', '', $data['respondent_phone']);
        if (strlen($phone) === 10) $phone = '57' . $phone;

        // OTP must have been verified
        $verified = Otp::where('phone', $phone)
            ->where('form_id', $data['form_id'])
            ->where('is_used', true)
            ->exists();

        if (!$verified) {
            return response()->json(['message' => 'OTP no verificado para este número.'], 422);
        }

        // Protect completed surveys from being overwritten
        if (Survey::where('respondent_phone', $phone)
            ->where('form_id', $data['form_id'])
            ->whereNotNull('submitted_at')
            ->exists()) {
            return response()->json(['message' => 'Esta encuesta ya fue completada.'], 409);
        }

        $survey = Survey::updateOrCreate(
            ['respondent_phone' => $phone, 'form_id' => $data['form_id']],
            [
                'encuestador_id'  => $data['pollster_id'],
                'group_id'        => $data['group_id'],
                'responses'       => $data['responses'] ?? [],
                'otp_verified'    => true,
                'otp_verified_at' => now(),
                'submitted_at'    => null,
            ]
        );

        return response()->json([
            'message' => 'Encuesta guardada como borrador.',
            'survey'  => ['id' => $survey->id],
        ]);
    }

    /**
     * GET /api/v1/public/maps-config
     * Returns the Google Maps API key for public use in forms.
     */
    public function mapsConfig(): JsonResponse
    {
        $key = Parameter::getValue('maps_google_key') ?? '';
        return response()->json(['key' => $key]);
    }

    /**
     * GET /api/v1/public/surveys/draft?phone=XXX&form_id=YYY
     * Recupera un borrador existente para phone+form.
     */
    public function getDraft(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'   => ['required', 'string'],
            'form_id' => ['required', 'integer'],
        ]);

        $phone = preg_replace('/\D/', '', $data['phone']);
        if (strlen($phone) === 10) $phone = '57' . $phone;

        $draft = Survey::where('respondent_phone', $phone)
            ->where('form_id', $data['form_id'])
            ->whereNull('submitted_at')
            ->first();

        return response()->json(['draft' => $draft]);
    }
}
