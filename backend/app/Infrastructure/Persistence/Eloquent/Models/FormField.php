<?php

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormField extends Model
{
    protected $fillable = [
        'form_id',
        'field_key',
        'label',
        'field_type',
        'is_required',
        'sort_order',
        'options',
        'validation_rules',
        'placeholder',
        'is_active',
    ];

    protected $casts = [
        'is_required'      => 'boolean',
        'is_active'        => 'boolean',
        'options'          => 'array',
        'validation_rules' => 'array',
    ];

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }
}
