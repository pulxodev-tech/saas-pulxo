<?php

namespace App\Infrastructure\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private string $apiUrl;
    private string $phoneId;
    private string $token;
    private string $template;

    public function __construct()
    {
        $this->apiUrl   = rtrim(config('services.whatsapp.api_url'), '/');
        $this->phoneId  = config('services.whatsapp.phone_id');
        $this->token    = config('services.whatsapp.token');
        $this->template = config('services.whatsapp.otp_template');
    }

    /**
     * Send OTP via WhatsApp template message.
     * Returns true on success, false on failure.
     */
    public function sendOtp(string $phone, string $code): bool
    {
        $url = "{$this->apiUrl}/{$this->phoneId}/messages";

        try {
            $response = Http::withToken($this->token)
                ->timeout(10)
                ->post($url, [
                    'messaging_product' => 'whatsapp',
                    'to'                => $this->normalizePhone($phone),
                    'type'              => 'template',
                    'template'          => [
                        'name'     => $this->template,
                        'language' => ['code' => 'es_CO'],
                        'components' => [
                            [
                                'type'       => 'body',
                                'parameters' => [
                                    ['type' => 'text', 'text' => $code],
                                ],
                            ],
                        ],
                    ],
                ]);

            if ($response->successful()) {
                return true;
            }

            Log::warning('WhatsApp OTP failed', [
                'phone'  => $phone,
                'status' => $response->status(),
                'body'   => $response->json(),
            ]);

            return false;
        } catch (\Throwable $e) {
            Log::error('WhatsApp OTP exception', ['phone' => $phone, 'error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Normalize phone to international format (Colombia default +57).
     */
    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        // Already has country code
        if (strlen($digits) === 12 && str_starts_with($digits, '57')) {
            return $digits;
        }
        if (strlen($digits) === 13 && str_starts_with($digits, '057')) {
            return ltrim($digits, '0');
        }
        // Local 10-digit Colombian number
        if (strlen($digits) === 10) {
            return '57' . $digits;
        }

        return $digits;
    }
}
