<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Infrastructure\Persistence\Eloquent\Models\User;
use App\Infrastructure\Persistence\Eloquent\Models\Role;

echo "USERS AND ROLES:\n";
foreach(User::with('role')->get() as $u) {
    echo "- ID: {$u->id}, Name: {$u->name}, Email: {$u->email}, Role: " . ($u->role->name ?? 'NONE') . ", Active: " . ($u->is_active ? 'YES' : 'NO') . "\n";
}
