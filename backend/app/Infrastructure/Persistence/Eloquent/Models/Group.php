<?php

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Group extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'description', 'location', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function members(): HasMany
    {
        return $this->hasMany(GroupMember::class);
    }

    public function hierarchies(): HasMany
    {
        return $this->hasMany(Hierarchy::class);
    }

    public function surveys(): HasMany
    {
        return $this->hasMany(Survey::class);
    }
}
