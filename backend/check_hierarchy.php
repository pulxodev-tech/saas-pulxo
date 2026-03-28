<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Infrastructure\Persistence\Eloquent\Models\Hierarchy;
use App\Infrastructure\Persistence\Eloquent\Models\Group;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use App\Infrastructure\Persistence\Eloquent\Models\Role;

echo "ROLES:\n";
foreach(Role::all() as $r) echo "- {$r->name} (id: {$r->id})\n";

echo "\nCOORDINATORS (Active):\n";
$role = Role::where('name', 'coordinador')->first();
$coords = User::where('role_id', $role?->id)->where('is_active', true)->get();
foreach($coords as $c) echo "- {$c->name} {$c->last_name} (id: {$c->id})\n";

echo "\nGROUPS:\n";
foreach(Group::all() as $g) echo "- {$g->name} (id: {$g->id}, active: {$g->is_active})\n";

echo "\nHIERARCHY ENTRIES:\n";
foreach(Hierarchy::with(['coordinator','supervisor','group'])->get() as $h) {
    echo "- C: {$h->coordinator?->name} -> S: {$h->supervisor?->name} -> G: {$h->group?->name} (active: {$h->is_active})\n";
}
