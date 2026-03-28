import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  // Public
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 's/:id',
    loadComponent: () =>
      import('./features/survey/flow/public-flow.component').then(m => m.PublicFlowComponent),
  },

  // Admin shell (all roles except encuestador)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      {
        path: 'dashboard',
        canActivate: [permissionGuard],
        data: { permission: 'dashboard.view' },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { permission: 'users.view' },
        loadComponent: () =>
          import('./features/users/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'roles',
        canActivate: [permissionGuard],
        data: { permission: 'roles.view' },
        loadComponent: () =>
          import('./features/roles/roles.component').then(m => m.RolesComponent),
      },
      {
        path: 'hierarchy',
        canActivate: [permissionGuard],
        data: { permission: 'hierarchy.view' },
        loadComponent: () =>
          import('./features/hierarchy/hierarchy.component').then(m => m.HierarchyComponent),
      },
      {
        path: 'forms',
        canActivate: [permissionGuard],
        data: { permission: 'forms.view' },
        loadComponent: () =>
          import('./features/form-builder/form-builder.component').then(m => m.FormBuilderComponent),
      },
      {
        path: 'surveys',
        canActivate: [permissionGuard],
        data: { permission: 'surveys.view' },
        loadComponent: () =>
          import('./features/survey/survey-list.component').then(m => m.SurveyListComponent),
      },
      {
        path: 'maps',
        canActivate: [permissionGuard],
        data: { permission: 'maps.view' },
        loadComponent: () =>
          import('./features/maps/maps.component').then(m => m.MapsComponent),
      },
      {
        path: 'campaigns',
        canActivate: [permissionGuard],
        data: { permission: 'campaigns.view' },
        loadComponent: () =>
          import('./features/campaigns/campaigns.component').then(m => m.CampaignsComponent),
      },
      {
        path: 'reports',
        canActivate: [permissionGuard],
        data: { permission: 'reports.view' },
        loadComponent: () =>
          import('./features/reports/reports.component').then(m => m.ReportsComponent),
      },
      {
        path: 'parameters',
        canActivate: [permissionGuard],
        data: { permission: 'parameters.view' },
        loadComponent: () =>
          import('./features/parameters/parameters.component').then(m => m.ParametersComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Field shell (encuestador only — mobile WhatsApp UI)
  {
    path: 'encuestador',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/field-shell/field-shell.component').then(m => m.FieldShellComponent),
    children: [
      {
        path: 'survey',
        loadComponent: () =>
          import('./features/survey/flow/survey-flow.component').then(m => m.SurveyFlowComponent),
      },
    ],
  },

  // Unauthorized
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },

  { path: '**', redirectTo: 'login' },
];
