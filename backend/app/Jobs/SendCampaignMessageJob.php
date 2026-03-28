<?php

namespace App\Jobs;

use App\Infrastructure\Persistence\Eloquent\Models\Campaign;
use App\Infrastructure\Persistence\Eloquent\Models\CampaignMessage;
use App\Infrastructure\Persistence\Eloquent\Models\ChannelConsumption;
use App\Infrastructure\Services\SmsColombiaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendCampaignMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 20;

    public function __construct(
        private readonly int    $campaignMessageId,
        private readonly int    $campaignId,
        private readonly string $phone,
        private readonly string $message,
        private readonly string $channel,
    ) {}

    public function handle(SmsColombiaService $sms): void
    {
        $campaignMessage = CampaignMessage::find($this->campaignMessageId);
        if (!$campaignMessage) return;

        $success = $sms->sendOtp($this->phone, $this->message);

        $status = $success ? 'sent' : 'failed';

        $campaignMessage->update([
            'status'        => $status,
            'sent_at'       => $success ? now() : null,
            'error_message' => $success ? null : 'SMS delivery failed',
        ]);

        // Update campaign counters atomically
        if ($success) {
            Campaign::where('id', $this->campaignId)->increment('sent_count');
        } else {
            Campaign::where('id', $this->campaignId)->increment('failed_count');
        }

        // Log consumption
        ChannelConsumption::log(
            channel:       "campaign_{$this->channel}",
            referenceType: 'campaign',
            referenceId:   $this->campaignId,
            metadata:      ['phone' => $this->phone, 'success' => $success],
        );

        // Check if campaign is fully done
        $campaign = Campaign::find($this->campaignId);
        if ($campaign && ($campaign->sent_count + $campaign->failed_count) >= $campaign->total_recipients) {
            $campaign->update(['status' => 'completed', 'completed_at' => now()]);
        }
    }
}
