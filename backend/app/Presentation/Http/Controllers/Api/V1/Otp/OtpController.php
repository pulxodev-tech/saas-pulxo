<?php

namespace App\Presentation\Http\Controllers\Api\V1\Otp;

use App\Application\Otp\UseCases\SendOtpUseCase;
use App\Application\Otp\UseCases\VerifyOtpUseCase;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\Models\Form;
use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OtpController extends Controller
{
    public function __construct(
        private readonly SendOtpUseCase   $sendOtp,
        private readonly VerifyOtpUseCase $verifyOtp,
    ) {}

    /**
     * POST /api/v1/otp/send
     *
     * Body: { phone, form_id }
     * Auth: encuestador (surveys.create)
     *
     * Validates phone is not already a respondent for this form,
     * then dispatches WA + SMS jobs.
     */
    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'       => ['required', 'string', 'regex:/^[0-9+\s\-]{7,20}$/'],
            'form_id'     => ['required', 'integer', 'exists:forms,id'],
            'pollster_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $form = Form::find($data['form_id']);
        if (! $form || ! $form->is_published) {
            return response()->json(['message' => 'Formulario no disponible.'], 422);
        }

        // Check duplicate respondent
        $phone = preg_replace('/\D/', '', $data['phone']);
        if (strlen($phone) === 10) {
            $phone = '57' . $phone; // normalize to full Colombian number
        }

        $existingSurvey = Survey::where('respondent_phone', $phone)
            ->where('form_id', $data['form_id'])
            ->whereNotNull('submitted_at')
            ->first();
        
        if ($existingSurvey) {
            return response()->json([
                'message'      => 'Este número ya completó esta encuesta.',
                'duplicate'    => true,
                'submitted_at' => $existingSurvey->submitted_at->format('d/m/Y H:i'),
            ], 409);
        }

        $userId = $request->user()?->id ?? $data['pollster_id'] ?? null;
        if (! $userId) {
            return response()->json(['message' => 'Identificador de encuestador no proporcionado.'], 422);
        }

        $result = $this->sendOtp->execute($phone, (int) $data['form_id'], (int) $userId);

        return response()->json([
            'message'    => 'Código enviado por WhatsApp y SMS simultáneamente.',
            'otp_id'     => $result['otp_id'],
            'code'       => $result['code'] ?? null, // Temporarily for testing
            'expires_at' => $result['expires_at'],
        ]);
    }

    /**
     * POST /api/v1/otp/verify
     *
     * Body: { phone, form_id, code }
     * Auth: encuestador (surveys.create)
     */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'   => ['required', 'string'],
            'form_id' => ['required', 'integer'],
            'code'    => ['required', 'string', 'size:4'],
        ]);

        $phone = preg_replace('/\D/', '', $data['phone']);
        if (strlen($phone) === 10) {
            $phone = '57' . $phone;
        }

        $result = $this->verifyOtp->execute($phone, (int) $data['form_id'], $data['code']);

        $status = $result['verified'] ? 200 : 422;

        return response()->json($result, $status);
    }
}
