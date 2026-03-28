<?php

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MapLayer extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'type', 'geojson', 'is_visible', 'color', 'created_by',
    ];

    protected $casts = [
        'geojson'    => 'array',
        'is_visible' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
