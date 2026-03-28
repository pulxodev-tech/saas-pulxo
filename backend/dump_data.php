<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Infrastructure\Persistence\Eloquent\Models\Hierarchy;
use App\Infrastructure\Persistence\Eloquent\Models\Group;
use App\Infrastructure\Persistence\Eloquent\Models\User;

echo "GROUPS:\n";
foreach(Group::all() as $g) echo "- ID: {$g->id}, Name: {$g->name}, Active: {$g->is_active}\n";

echo "\nHIERARCHIES:\n";
foreach(Hierarchy::all() as $h) {
    $c = User::find($h->coordinator_id);
    $s = User::find($h->supervisor_id);
    $g = Group::find($h->group_id);
    echo "- ID: {$h->id}, C: " . ($c?->name ?? 'NONE') . "(ID: {$h->coordinator_id}), S: " . ($s?->name ?? 'NONE') . "(ID: {$h->supervisor_id}), G: " . ($g?->name ?? 'NONE') . "(ID: {$h->group_id}), Active: {$h->is_active}\n";
}
