<?php

namespace App\Application\Otp\UseCases;

use App\Infrastructure\Persistence\Eloquent\Models\Otp;

class VerifyOtpUseCase
{
    /**
     * Verify OTP code for a phone+form combination.
     *
     * @return array{ verified: bool, message: string }
     * @throws \RuntimeException on hard errors
     */
    public function execute(string $phone, int $formId, string $code): array
    {
        $otp = Otp::where('phone', $phone)
            ->where('form_id', $formId)
            ->where('is_used', false)
            ->latest()
            ->first();

        if (! $otp) {
            return ['verified' => false, 'message' => 'OTP no encontrado. Solicita uno nuevo.'];
        }

        if ($otp->isExpired()) {
            return ['verified' => false, 'message' => 'El código ha expirado. Solicita uno nuevo.'];
        }

        if ($otp->attempts >= 5) {
            return ['verified' => false, 'message' => 'Demasiados intentos fallidos. Solicita un nuevo código.'];
        }

        if ($otp->code !== $code) {
            $otp->increment('attempts');
            $remaining = 4 - $otp->attempts;
            return [
                'verified' => false,
                'message'  => "Código incorrecto. Te quedan {$remaining} intentos.",
            ];
        }

        // Mark as used
        $otp->update(['is_used' => true, 'used_at' => now()]);

        return ['verified' => true, 'message' => 'Código verificado correctamente.'];
    }
}
