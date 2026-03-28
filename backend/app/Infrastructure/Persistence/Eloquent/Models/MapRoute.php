<?php

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MapRoute extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'encuestador_id', 'waypoints',
        'path_coordinates', 'scheduled_date', 'is_printed', 'created_by',
    ];

    protected $casts = [
        'waypoints'        => 'array',
        'path_coordinates' => 'array',
        'is_printed'       => 'boolean',
        'scheduled_date'   => 'date',
    ];

    public function encuestador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'encuestador_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
