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

$roles = Role::pluck('id', 'name'); // [name => id]

// 1. Create Users
function createUser($name, $email, $roleId) {
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

$c1 = createUser('Coord Norte', 'c1@demo.com', $roles['coordinador']);
$c2 = createUser('Coord Sur',   'c2@demo.com', $roles['coordinador']);

$s1 = createUser('Sup Norte 1', 's1@demo.com', $roles['supervisor']);
$s2 = createUser('Sup Norte 2', 's2@demo.com', $roles['supervisor']);
$s3 = createUser('Sup Sur 1',   's3@demo.com', $roles['supervisor']);
$s4 = createUser('Sup Sur 2',   's4@demo.com', $roles['supervisor']);

$e1 = createUser('Enc 1', 'e1@demo.com', $roles['encuestador']);
$e2 = createUser('Enc 2', 'e2@demo.com', $roles['encuestador']);
$e3 = createUser('Enc 3', 'e3@demo.com', $roles['encuestador']);
$e4 = createUser('Enc 4', 'e4@demo.com', $roles['encuestador']);

// 2. Create Groups
function createGroup($name) {
    return Group::updateOrCreate(['name' => $name], ['is_active' => true, 'description' => "Grupo demo $name"]);
}

$g1 = createGroup('Norte Alfa');
$g2 = createGroup('Norte Beta');
$g3 = createGroup('Sur Gamma');
$g4 = createGroup('Sur Delta');

// 3. Create Hierarchies
function clearHierarchy($groupId) {
    Hierarchy::where('group_id', $groupId)->delete();
}

clearHierarchy($g1->id);
clearHierarchy($g2->id);
clearHierarchy($g3->id);
clearHierarchy($g4->id);

Hierarchy::create(['coordinator_id' => $c1->id, 'supervisor_id' => $s1->id, 'group_id' => $g1->id, 'is_active' => true]);
Hierarchy::create(['coordinator_id' => $c1->id, 'supervisor_id' => $s2->id, 'group_id' => $g2->id, 'is_active' => true]);
Hierarchy::create(['coordinator_id' => $c2->id, 'supervisor_id' => $s3->id, 'group_id' => $g3->id, 'is_active' => true]);
Hierarchy::create(['coordinator_id' => $c2->id, 'supervisor_id' => $s4->id, 'group_id' => $g4->id, 'is_active' => true]);

// 4. Assign Members
function assignMember($groupId, $userId) {
    GroupMember::updateOrCreate(['group_id' => $groupId, 'user_id' => $userId], ['is_active' => true]);
}

assignMember($g1->id, $e1->id);
assignMember($g2->id, $e2->id);
assignMember($g3->id, $e3->id);
assignMember($g4->id, $e4->id);
assignMember($g1->id, $e2->id); // e2 in two groups for stress test? OK.

echo "Test data created successfully!\n";
echo "Coordinators: 2\nSupervisors: 4\nGroups: 4\nEncuestadores: 4\n";
