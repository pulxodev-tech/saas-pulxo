<?php

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PermissionGroup extends Model
{
    protected $fillable = ['name', 'display_name', 'sort_order'];

    public function permissions(): HasMany
    {
        return $this->hasMany(Permission::class);
    }
}
