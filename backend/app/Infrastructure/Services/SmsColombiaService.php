<?php

namespace App\Infrastructure\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsColombiaService
{
    private string $url;
    private string $apiKey;

    public function __construct()
    {
        $this->url    = config('services.sms_colombia.url');
        $this->apiKey = config('services.sms_colombia.api_key');
    }

    /**
     * Send OTP via SMS Colombia.
     * Returns true on success, false on failure.
     */
    public function sendOtp(string $phone, string $code): bool
    {
        if (empty($this->url) || str_contains($this->url, 'REPLACE')) {
            Log::info('SMS Colombia not configured — skipping', ['phone' => $phone]);
            return false;
        }

        try {
            $message = "Tu código de verificación Pulxo es: {$code}. Válido por 10 minutos.";

            $response = Http::timeout(10)
                ->post($this->url, [
                    'apikey'  => $this->apiKey,
                    'numero'  => $this->normalizePhone($phone),
                    'sms'     => $message,
                    'unicode' => false,
                ]);

            if ($response->successful()) {
                return true;
            }

            Log::warning('SMS Colombia OTP failed', [
                'phone'  => $phone,
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);

            return false;
        } catch (\Throwable $e) {
            Log::error('SMS Colombia OTP exception', ['phone' => $phone, 'error' => $e->getMessage()]);
            return false;
        }
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        if (strlen($digits) === 10) {
            return '57' . $digits;
        }

        return $digits;
    }
}
