<?php

namespace Database\Seeders;

use App\Infrastructure\Persistence\Eloquent\Models\Role;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::where('name', 'super_admin')->firstOrFail();

        User::firstOrCreate(
            ['email' => 'admin@pulxo.co'],
            [
                'role_id'   => $role->id,
                'name'      => 'Super',
                'last_name' => 'Admin',
                'email'     => 'admin@pulxo.co',
                'password'  => Hash::make('Pulxo2024!'),
                'is_active' => true,
            ]
        );

        $this->command->info('Super Admin creado: admin@pulxo.co / Pulxo2024!');
        $this->command->warn('⚠️  Cambia la contraseña después del primer login.');
    }
}
