<?php

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Survey extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'form_id', 'encuestador_id', 'group_id',
        'respondent_phone', 'respondent_name', 'respondent_last_name',
        'respondent_gender', 'respondent_age', 'respondent_occupation',
        'respondent_neighborhood', 'respondent_address',
        'encuestador_lat', 'encuestador_lng',
        'address_lat', 'address_lng',
        'responses',
        'otp_verified', 'otp_verified_at',
        'submission_channel',
        'maps_api_calls', 'maps_api_cost_usd',
        'address_source',
        'submitted_at',
    ];

    protected $casts = [
        'responses'      => 'array',
        'otp_verified'   => 'boolean',
        'otp_verified_at'=> 'datetime',
        'submitted_at'   => 'datetime',
        'encuestador_lat'=> 'decimal:7',
        'encuestador_lng'=> 'decimal:7',
        'address_lat'    => 'decimal:7',
        'address_lng'    => 'decimal:7',
        'maps_api_cost_usd' => 'decimal:6',
    ];

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    public function encuestador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'encuestador_id');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }
}
