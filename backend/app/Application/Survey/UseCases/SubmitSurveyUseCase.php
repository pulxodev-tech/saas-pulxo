<?php

namespace App\Application\Survey\UseCases;

use App\Infrastructure\Persistence\Eloquent\Models\Form;
use App\Infrastructure\Persistence\Eloquent\Models\Otp;
use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class SubmitSurveyUseCase
{
    /**
     * Validate and persist a completed survey.
     *
     * @param  array  $data  Validated payload from SurveyController
     * @return Survey
     * @throws \Illuminate\Validation\ValidationException
     */
    public function execute(array $data, int $encuestadorId): Survey
    {
        Log::info('SubmitSurveyUseCase Execute Start', ['phone' => $data['respondent_phone'], 'form_id' => $data['form_id']]);
        $formId = $data['form_id'];
        $phone  = $data['respondent_phone'];

        // Confirm OTP was verified for this phone+form in the last 30 min
        $verified = Otp::where('phone', $phone)
            ->where('form_id', $formId)
            ->where('is_used', true)
            ->exists();
        
        Log::info('OTP Verification Check', ['phone' => $phone, 'verified' => $verified]);

        if (! $verified) {
            throw ValidationException::withMessages([
                'otp' => ['El OTP no ha sido verificado para este número.'],
            ]);
        }

        // Prevent duplicate submission
        if (Survey::where('respondent_phone', $phone)->where('form_id', $formId)->whereNotNull('submitted_at')->exists()) {
            throw ValidationException::withMessages([
                'respondent_phone' => ['Este número ya completó esta encuesta.'],
            ]);
        }

        // Load form fields to build clean responses JSONB
        $form   = Form::with('fields')->findOrFail($formId);
        $fields = $form->fields->where('is_active', true)->keyBy('field_key');

        $responses = [];
        $fixedKeys = ['clima', 'problema', 'liderazgo'];
        
        foreach ($data['responses'] as $key => $value) {
            if ($fields->has($key) || in_array($key, $fixedKeys)) {
                $responses[$key] = $value;
            }
        }

        // Use updateOrCreate so that completing a draft (submitted_at=null) works correctly.
        $survey = Survey::updateOrCreate(
            ['respondent_phone' => $phone, 'form_id' => $formId],
            [
                'encuestador_id'        => $encuestadorId,
                'group_id'              => $data['group_id'],
                'respondent_name'       => $data['respondent_name'] ?? null,
                'respondent_last_name'  => $data['respondent_last_name'] ?? null,
                'respondent_gender'     => $data['respondent_gender'] ?? null,
                'respondent_age'        => $data['respondent_age'] ?? null,
                'respondent_occupation' => $data['respondent_occupation'] ?? null,
                'respondent_neighborhood' => $data['respondent_neighborhood'] ?? null,
                'respondent_address'    => $data['respondent_address'] ?? null,
                'encuestador_lat'       => $data['encuestador_lat'] ?? null,
                'encuestador_lng'       => $data['encuestador_lng'] ?? null,
                'address_lat'           => $data['address_lat'] ?? null,
                'address_lng'           => $data['address_lng'] ?? null,
                'address_source'        => $data['address_source'] ?? null,
                'responses'             => $responses,
                'otp_verified'          => true,
                'otp_verified_at'       => now(),
                'maps_api_calls'        => $data['maps_api_calls'] ?? 0,
                'maps_api_cost_usd'     => $data['maps_api_cost_usd'] ?? 0,
                'submitted_at'          => now(),
            ]
        );

        return $survey->load('form', 'encuestador', 'group');
    }
}
