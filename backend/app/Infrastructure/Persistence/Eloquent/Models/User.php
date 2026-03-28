<?php

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'role_id',
        'name',
        'last_name',
        'email',
        'phone',
        'password',
        'pin',
        'pollster_code',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'pin',
        'remember_token',
    ];

    protected $casts = [
        'is_active'     => 'boolean',
        'last_login_at' => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function groupMemberships(): HasMany
    {
        return $this->hasMany(GroupMember::class);
    }

    public function hierarchies(): HasMany
    {
        return $this->hasMany(Hierarchy::class, 'coordinator_id');
    }

    public function surveys(): HasMany
    {
        return $this->hasMany(Survey::class, 'encuestador_id');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isEncuestador(): bool
    {
        return $this->role?->name === 'encuestador';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role?->name === 'super_admin';
    }

    public function hasPermission(string $permission): bool
    {
        // Super admin has all permissions
        if ($this->isSuperAdmin()) {
            return true;
        }

        // Check token abilities (set at login time from role permissions)
        return $this->tokenCan($permission);
    }
}
