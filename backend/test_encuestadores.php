<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Presentation\Http\Controllers\Api\V1\Hierarchy\HierarchyController;
use App\Infrastructure\Persistence\Eloquent\Models\Role;
use App\Infrastructure\Persistence\Eloquent\Models\User;

$ctrl = $app->make(HierarchyController::class);
$resp = $ctrl->encuestadores();

echo "RESPONSE: " . json_encode($resp->getData()) . "\n";

$role = Role::where('name', 'encuestador')->first();
echo "ROLE FOUND: " . ($role ? "ID {$role->id}, Name {$role->name}" : "NOT FOUND") . "\n";

$users = User::where('role_id', $role?->id)->where('is_active', true)->get();
echo "USERS COUNT: " . $users->count() . "\n";
foreach($users as $u) echo "- {$u->name} (ID: {$u->id})\n";
