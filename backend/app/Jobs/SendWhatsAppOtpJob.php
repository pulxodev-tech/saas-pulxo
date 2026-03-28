<?php

namespace App\Jobs;

use App\Infrastructure\Persistence\Eloquent\Models\ChannelConsumption;
use App\Infrastructure\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendWhatsAppOtpJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 15;

    public function __construct(
        private readonly string $phone,
        private readonly string $code,
        private readonly int    $otpId,
        private readonly ?int   $encuestadorId,
    ) {}

    public function handle(WhatsAppService $whatsapp): void
    {
        $success = $whatsapp->sendOtp($this->phone, $this->code);

        ChannelConsumption::log(
            channel:        'otp_whatsapp',
            referenceType:  'otp',
            referenceId:    $this->otpId,
            encuestadorId:  $this->encuestadorId,
            metadata:       ['phone' => $this->phone, 'success' => $success],
        );
    }
}
