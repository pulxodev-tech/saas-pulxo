<?php

namespace App\Jobs;

use App\Infrastructure\Persistence\Eloquent\Models\ChannelConsumption;
use App\Infrastructure\Services\SmsColombiaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendSmsOtpJob implements ShouldQueue
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

    public function handle(SmsColombiaService $sms): void
    {
        $success = $sms->sendOtp($this->phone, $this->code);

        ChannelConsumption::log(
            channel:        'otp_sms',
            referenceType:  'otp',
            referenceId:    $this->otpId,
            encuestadorId:  $this->encuestadorId,
            metadata:       ['phone' => $this->phone, 'success' => $success],
        );
    }
}
