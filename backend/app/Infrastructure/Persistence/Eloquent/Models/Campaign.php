<?php

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Campaign extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'message_template', 'channel', 'audience_id',
        'audience_snapshot', 'status', 'scheduled_at',
        'started_at', 'completed_at',
        'total_recipients', 'sent_count', 'failed_count', 'created_by',
    ];

    protected $casts = [
        'audience_snapshot' => 'array',
        'scheduled_at'      => 'datetime',
        'started_at'        => 'datetime',
        'completed_at'      => 'datetime',
    ];

    public function audience(): BelongsTo
    {
        return $this->belongsTo(Audience::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(CampaignMessage::class);
    }

    public function canDispatch(): bool
    {
        return in_array($this->status, ['draft', 'scheduled']);
    }
}
