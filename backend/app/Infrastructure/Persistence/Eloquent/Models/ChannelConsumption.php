<?php

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChannelConsumption extends Model
{
    protected $fillable = [
        'channel', 'reference_type', 'reference_id',
        'encuestador_id', 'units', 'unit_cost', 'total_cost',
        'currency', 'metadata', 'occurred_at',
    ];

    protected $casts = [
        'metadata'    => 'array',
        'occurred_at' => 'datetime',
        'unit_cost'   => 'decimal:6',
        'total_cost'  => 'decimal:4',
    ];

    public function encuestador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'encuestador_id');
    }

    public static function log(
        string $channel,
        string $referenceType,
        int $referenceId,
        ?int $encuestadorId = null,
        array $metadata = [],
    ): void {
        static::create([
            'channel'        => $channel,
            'reference_type' => $referenceType,
            'reference_id'   => $referenceId,
            'encuestador_id' => $encuestadorId,
            'units'          => 1,
            'unit_cost'      => 0,
            'total_cost'     => 0,
            'currency'       => 'USD',
            'metadata'       => $metadata,
            'occurred_at'    => now(),
        ]);
    }
}
