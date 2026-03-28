<?php

namespace App\Application\Otp\UseCases;

use App\Infrastructure\Persistence\Eloquent\Models\Otp;
use App\Jobs\SendSmsOtpJob;
use App\Jobs\SendWhatsAppOtpJob;

class SendOtpUseCase
{
    /**
     * Generate a fresh OTP and dispatch WA + SMS jobs simultaneously.
     *
     * @return array{ otp_id: int, expires_at: string }
     */
    public function execute(string $phone, int $formId, int $encuestadorId): array
    {
        // Invalidate any previous pending OTPs for this phone+form
        Otp::where('phone', $phone)
            ->where('form_id', $formId)
            ->where('is_used', false)
            ->update(['is_used' => true]);

        $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        $otp = Otp::create([
            'phone'          => $phone,
            'code'           => $code,
            'channel'        => 'whatsapp_sms',
            'encuestador_id' => $encuestadorId,
            'form_id'        => $formId,
            'attempts'       => 0,
            'is_used'        => false,
            'expires_at'     => now()->addMinutes(10),
        ]);

        // Dispatch both simultaneously — independent queued jobs
        SendWhatsAppOtpJob::dispatch($phone, $code, $otp->id, $encuestadorId);
        SendSmsOtpJob::dispatch($phone, $code, $otp->id, $encuestadorId);

        return [
            'otp_id'     => $otp->id,
            'code'       => $code, // TODO: Remove before production
            'expires_at' => $otp->expires_at->toIso8601String(),
        ];
    }
}
