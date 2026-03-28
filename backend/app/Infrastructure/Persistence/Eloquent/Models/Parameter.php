<?php

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;

class Parameter extends Model
{
    protected $fillable = [
        'group',
        'key',
        'display_name',
        'value',
        'is_encrypted',
        'description',
    ];

    protected $casts = [
        'is_encrypted' => 'boolean',
    ];

    /**
     * Returns the decrypted value, or null if empty / decryption fails.
     */
    public function getPlainValue(): ?string
    {
        if ($this->value === null || $this->value === '') {
            return null;
        }

        if ($this->is_encrypted) {
            try {
                return decrypt($this->value);
            } catch (\Exception) {
                return null;
            }
        }

        return $this->value;
    }

    /**
     * Convenience: get a parameter value by key (plain, decrypted).
     */
    public static function getValue(string $key): ?string
    {
        $param = self::where('key', $key)->first();
        return $param?->getPlainValue();
    }
}
