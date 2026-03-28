<?php

namespace Database\Seeders;

use App\Infrastructure\Persistence\Eloquent\Models\Permission;
use App\Infrastructure\Persistence\Eloquent\Models\PermissionGroup;
use App\Infrastructure\Persistence\Eloquent\Models\Role;
use Illuminate\Database\Seeder;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // ─── Roles ────────────────────────────────────────────────────────────
        $roles = [
            ['name' => 'super_admin',    'display_name' => 'Super Admin',      'is_system' => true],
            ['name' => 'administrador',  'display_name' => 'Administrador',    'is_system' => true],
            ['name' => 'pagador',        'display_name' => 'Pagador',          'is_system' => false],
            ['name' => 'soporte_tecnico','display_name' => 'Soporte Técnico',  'is_system' => false],
            ['name' => 'coordinador',    'display_name' => 'Coordinador',      'is_system' => false],
            ['name' => 'supervisor',     'display_name' => 'Supervisor',       'is_system' => false],
            ['name' => 'encuestador',    'display_name' => 'Encuestador',      'is_system' => true],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role['name']], $role);
        }

        // ─── Permission Groups & Permissions ─────────────────────────────────
        $structure = [
            ['name' => 'users',      'display_name' => 'Usuarios',             'sort' => 1, 'permissions' => [
                ['name' => 'users.view',   'display_name' => 'Ver usuarios'],
                ['name' => 'users.create', 'display_name' => 'Crear usuarios'],
                ['name' => 'users.edit',   'display_name' => 'Editar usuarios'],
                ['name' => 'users.delete', 'display_name' => 'Eliminar usuarios'],
            ]],
            ['name' => 'roles',      'display_name' => 'Roles y Permisos',     'sort' => 2, 'permissions' => [
                ['name' => 'roles.view',   'display_name' => 'Ver roles y permisos'],
                ['name' => 'roles.edit',   'display_name' => 'Editar permisos por rol'],
            ]],
            ['name' => 'hierarchy',  'display_name' => 'Jerarquía Operativa',  'sort' => 3, 'permissions' => [
                ['name' => 'hierarchy.view',   'display_name' => 'Ver jerarquía'],
                ['name' => 'hierarchy.manage', 'display_name' => 'Gestionar jerarquía'],
            ]],
            ['name' => 'forms',      'display_name' => 'Formularios',          'sort' => 4, 'permissions' => [
                ['name' => 'forms.view',    'display_name' => 'Ver formularios'],
                ['name' => 'forms.create',  'display_name' => 'Crear formularios'],
                ['name' => 'forms.edit',    'display_name' => 'Editar formularios'],
                ['name' => 'forms.publish', 'display_name' => 'Publicar formularios'],
                ['name' => 'forms.delete',  'display_name' => 'Eliminar formularios'],
            ]],
            ['name' => 'surveys',    'display_name' => 'Encuestas',            'sort' => 5, 'permissions' => [
                ['name' => 'surveys.view',   'display_name' => 'Ver encuestas'],
                ['name' => 'surveys.create', 'display_name' => 'Crear encuestas (encuestador)'],
                ['name' => 'surveys.export', 'display_name' => 'Exportar encuestas'],
                ['name' => 'surveys.delete', 'display_name' => 'Eliminar encuestas'],
            ]],
            ['name' => 'dashboard',  'display_name' => 'Dashboard',            'sort' => 6, 'permissions' => [
                ['name' => 'dashboard.view',  'display_name' => 'Ver dashboard'],
                ['name' => 'dashboard.goals', 'display_name' => 'Ver metas (no visible a encuestadores)'],
            ]],
            ['name' => 'maps',       'display_name' => 'Mapas',                'sort' => 7, 'permissions' => [
                ['name' => 'maps.view',          'display_name' => 'Ver mapas'],
                ['name' => 'maps.layers.manage', 'display_name' => 'Gestionar capas de mapa'],
                ['name' => 'maps.routes.manage', 'display_name' => 'Gestionar rutas'],
            ]],
            ['name' => 'campaigns',  'display_name' => 'Campañas',             'sort' => 8, 'permissions' => [
                ['name' => 'campaigns.view',     'display_name' => 'Ver campañas'],
                ['name' => 'campaigns.create',   'display_name' => 'Crear campañas'],
                ['name' => 'campaigns.send',     'display_name' => 'Enviar campañas'],
                ['name' => 'campaigns.delete',   'display_name' => 'Eliminar campañas'],
            ]],
            ['name' => 'reports',    'display_name' => 'Reportes',             'sort' => 9, 'permissions' => [
                ['name' => 'reports.view',   'display_name' => 'Ver reportes'],
                ['name' => 'reports.export', 'display_name' => 'Exportar reportes'],
            ]],
            ['name' => 'audit',      'display_name' => 'Auditoría de Canales', 'sort' => 10, 'permissions' => [
                ['name' => 'audit.view', 'display_name' => 'Ver consumo de canales'],
            ]],
            ['name' => 'parameters', 'display_name' => 'Parámetros del Sistema', 'sort' => 11, 'permissions' => [
                ['name' => 'parameters.view', 'display_name' => 'Ver parámetros'],
                ['name' => 'parameters.edit', 'display_name' => 'Editar parámetros'],
            ]],
            ['name' => 'goals',      'display_name' => 'Metas',                'sort' => 12, 'permissions' => [
                ['name' => 'goals.view',   'display_name' => 'Ver metas'],
                ['name' => 'goals.manage', 'display_name' => 'Gestionar metas'],
            ]],
        ];

        foreach ($structure as $groupData) {
            $group = PermissionGroup::firstOrCreate(
                ['name' => $groupData['name']],
                ['display_name' => $groupData['display_name'], 'sort_order' => $groupData['sort']]
            );

            foreach ($groupData['permissions'] as $perm) {
                Permission::firstOrCreate(
                    ['name' => $perm['name']],
                    ['permission_group_id' => $group->id, 'display_name' => $perm['display_name']]
                );
            }
        }

        // ─── Default permissions per role ─────────────────────────────────────
        $allPermissions = Permission::pluck('id', 'name');

        // Administrador — everything except parameters and roles
        $adminPerms = Permission::whereNotIn('name', ['parameters.edit', 'roles.edit'])->pluck('id')->toArray();
        Role::where('name', 'administrador')->first()?->permissions()->sync($adminPerms);

        // Coordinador
        $coordinadorPerms = array_filter($allPermissions->toArray(), fn ($id, $name) => in_array($name, [
            'users.view', 'hierarchy.view', 'hierarchy.manage',
            'surveys.view', 'surveys.export',
            'dashboard.view', 'dashboard.goals',
            'maps.view', 'reports.view', 'reports.export',
            'goals.view',
        ]), ARRAY_FILTER_USE_BOTH);
        Role::where('name', 'coordinador')->first()?->permissions()->sync(array_values($coordinadorPerms));

        // Supervisor
        $supervisorPerms = array_filter($allPermissions->toArray(), fn ($id, $name) => in_array($name, [
            'users.view', 'hierarchy.view',
            'surveys.view', 'surveys.export',
            'dashboard.view', 'dashboard.goals',
            'maps.view', 'reports.view',
            'goals.view',
        ]), ARRAY_FILTER_USE_BOTH);
        Role::where('name', 'supervisor')->first()?->permissions()->sync(array_values($supervisorPerms));

        // Encuestador — minimal
        $encuestadorPerms = array_filter($allPermissions->toArray(), fn ($id, $name) => in_array($name, [
            'surveys.create', 'dashboard.view',
        ]), ARRAY_FILTER_USE_BOTH);
        Role::where('name', 'encuestador')->first()?->permissions()->sync(array_values($encuestadorPerms));

        // Soporte técnico
        $soportePerms = array_filter($allPermissions->toArray(), fn ($id, $name) => in_array($name, [
            'users.view', 'users.edit',
            'hierarchy.view',
            'surveys.view',
            'dashboard.view',
            'parameters.view', 'parameters.edit',
        ]), ARRAY_FILTER_USE_BOTH);
        Role::where('name', 'soporte_tecnico')->first()?->permissions()->sync(array_values($soportePerms));

        // Pagador
        $pagadorPerms = array_filter($allPermissions->toArray(), fn ($id, $name) => in_array($name, [
            'surveys.view', 'reports.view', 'reports.export',
            'dashboard.view',
        ]), ARRAY_FILTER_USE_BOTH);
        Role::where('name', 'pagador')->first()?->permissions()->sync(array_values($pagadorPerms));
    }
}
