<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Infrastructure\Persistence\Eloquent\Models\User;
use App\Infrastructure\Persistence\Eloquent\Models\Role;
use App\Infrastructure\Persistence\Eloquent\Models\Group;
use App\Infrastructure\Persistence\Eloquent\Models\Hierarchy;
use App\Infrastructure\Persistence\Eloquent\Models\GroupMember;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

$roles = Role::pluck('id', 'name');

// Cleanup existing demo data to start fresh
DB::table('hierarchies')->delete();
DB::table('group_members')->delete();

function getOrCreateUser($name, $email, $roleId) {
    return User::updateOrCreate(
        ['email' => $email],
        [
            'name'      => $name,
            'last_name' => 'Demo',
            'password'  => Hash::make('password'),
            'role_id'   => $roleId,
            'is_active' => true,
        ]
    );
}

function getOrCreateGroup($name) {
    return Group::updateOrCreate(['name' => $name], ['is_active' => true]);
}

// 1. Coordinators
$c1 = getOrCreateUser('Coordinador 1', 'coord1@demo.com', $roles['coordinador']);
$c2 = getOrCreateUser('Coordinador 2', 'coord2@demo.com', $roles['coordinador']);

// 2. Supervisors
$s1 = getOrCreateUser('Supervisor 1', 'sup1@demo.com', $roles['supervisor']);
$s2 = getOrCreateUser('Supervisor 2', 'sup2@demo.com', $roles['supervisor']);
$s3 = getOrCreateUser('Supervisor 3', 'sup3@demo.com', $roles['supervisor']);
$s4 = getOrCreateUser('Supervisor 4', 'sup4@demo.com', $roles['supervisor']);

// 3. Groups
$g1 = getOrCreateGroup('Grupo 1');
$g2 = getOrCreateGroup('Grupo 2');
$g3 = getOrCreateGroup('Grupo 3');
$g4 = getOrCreateGroup('Grupo 4');

// 4. Hierarchies
Hierarchy::create(['coordinator_id' => $c1->id, 'supervisor_id' => $s1->id, 'group_id' => $g1->id, 'is_active' => true]);
Hierarchy::create(['coordinator_id' => $c1->id, 'supervisor_id' => $s2->id, 'group_id' => $g2->id, 'is_active' => true]);
Hierarchy::create(['coordinator_id' => $c2->id, 'supervisor_id' => $s3->id, 'group_id' => $g3->id, 'is_active' => true]);
Hierarchy::create(['coordinator_id' => $c2->id, 'supervisor_id' => $s4->id, 'group_id' => $g4->id, 'is_active' => true]);

// 5. Encuestadores (20 in total, 5 per group)
for ($i = 1; $i <= 20; $i++) {
    $e = getOrCreateUser("Encuestador $i", "enc{$i}@demo.com", $roles['encuestador']);
    
    // Assign to groups based on index
    $groupId = 0;
    if ($i <= 5)       $groupId = $g1->id;
    elseif ($i <= 10) $groupId = $g2->id;
    elseif ($i <= 15) $groupId = $g3->id;
    else              $groupId = $g4->id;

    GroupMember::create(['group_id' => $groupId, 'user_id' => $e->id, 'is_active' => true]);
}

echo "Hierarchy seeded successfully matching the photo structure!\n";
echo "Coordinators: 2\n";
echo "Supervisors: 4\n";
echo "Groups: 4\n";
echo "Encuestadores: 20\n";
