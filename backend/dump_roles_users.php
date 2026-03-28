<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Infrastructure\Persistence\Eloquent\Models\Role;
use App\Infrastructure\Persistence\Eloquent\Models\User;

echo "ROLES:\n";
foreach(Role::all() as $r) echo "- ID: {$r->id}, Name: {$r->name}\n";

echo "\nUSERS (All):\n";
foreach(User::withTrashed()->get() as $u) {
    echo "- ID: {$u->id}, Name: {$u->name}, RoleID: {$u->role_id}, RoleName: " . ($u->role?->name ?? 'NONE') . ", Active: {$u->is_active}, Deleted: " . ($u->deleted_at ? 'YES' : 'NO') . "\n";
}
