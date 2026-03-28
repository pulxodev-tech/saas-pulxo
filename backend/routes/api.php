<?php

use App\Presentation\Http\Controllers\Api\V1\Auth\AuthController;
use App\Presentation\Http\Controllers\Api\V1\Parameters\ConnectionTestController;
use App\Presentation\Http\Controllers\Api\V1\Parameters\ParameterController;
use App\Presentation\Http\Controllers\Api\V1\Campaigns\CampaignController;
use App\Presentation\Http\Controllers\Api\V1\Dashboard\DashboardController;
use App\Presentation\Http\Controllers\Api\V1\Maps\MapController;
use App\Presentation\Http\Controllers\Api\V1\Forms\FormController;
use App\Presentation\Http\Controllers\Api\V1\Forms\FormFieldController;
use App\Presentation\Http\Controllers\Api\V1\Hierarchy\GroupController;
use App\Presentation\Http\Controllers\Api\V1\Hierarchy\HierarchyController;
use App\Presentation\Http\Controllers\Api\V1\Otp\OtpController;
use App\Presentation\Http\Controllers\Api\V1\Reports\ReportController;
use App\Presentation\Http\Controllers\Api\V1\Roles\RolePermissionController;
use App\Presentation\Http\Controllers\Api\V1\Surveys\ExportController;
use App\Presentation\Http\Controllers\Api\V1\Surveys\PublicSurveyController;
use App\Presentation\Http\Controllers\Api\V1\Surveys\SurveyController;
use App\Presentation\Http\Controllers\Api\V1\Users\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Pulxo API v1
|--------------------------------------------------------------------------
*/

Route::group(['prefix' => 'v1'], function () {

    // ─── Public Auth ─────────────────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('login',     [AuthController::class, 'loginEmail']);
        Route::post('login/pin', [AuthController::class, 'loginPin']);
    });

    // ─── Public Survey Access (Shareable Link) ──────────────────────────────
    Route::prefix('public')->group(function () {
        Route::get('pollster-check',  [PublicSurveyController::class, 'checkPollster']);
        Route::get('forms/{id}',      [PublicSurveyController::class, 'getPublicForm']);
        Route::get('maps-config',     [PublicSurveyController::class, 'mapsConfig']);
        Route::post('surveys',        [PublicSurveyController::class, 'submitPublic']);
        Route::post('surveys/draft',  [PublicSurveyController::class, 'saveDraft']);
        Route::get('surveys/draft',   [PublicSurveyController::class, 'getDraft']);
    });

    // ─── Public OTP Access ──────────────────────────────────────────────────
    Route::prefix('otp')->group(function () {
        Route::post('/send',   [OtpController::class, 'send']);
        Route::post('/verify', [OtpController::class, 'verify']);
    });

    // ─── Protected Routes ────────────────────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me',      [AuthController::class, 'me']);
        });

        // Users (requires users.view / users.create / users.edit / users.delete)
        Route::prefix('users')->group(function () {
            Route::get('/',                                [UserController::class, 'index'])
                ->middleware('permission:users.view');

            Route::post('/',                               [UserController::class, 'store'])
                ->middleware('permission:users.create');

            Route::get('/{id}',                            [UserController::class, 'show'])
                ->middleware('permission:users.view');

            Route::put('/{id}',                            [UserController::class, 'update'])
                ->middleware('permission:users.edit');

            Route::patch('/{id}/toggle-active',            [UserController::class, 'toggleActive'])
                ->middleware('permission:users.edit');

            Route::patch('/{id}/change-password',          [UserController::class, 'changePasswordAction'])
                ->middleware('permission:users.edit');

            Route::patch('/{id}/change-pin',               [UserController::class, 'changePinAction'])
                ->middleware('permission:users.edit');

            Route::delete('/{id}',                         [UserController::class, 'destroy'])
                ->middleware('permission:users.delete');
        });

        // Roles & Permissions manager (super_admin only via permission)
        Route::prefix('roles')->group(function () {
            Route::get('/',                                        [RolePermissionController::class, 'indexRoles'])
                ->middleware('permission:roles.view');

            Route::get('/{roleId}/permissions',                    [RolePermissionController::class, 'showRolePermissions'])
                ->middleware('permission:roles.view');

            Route::put('/{roleId}/permissions',                    [RolePermissionController::class, 'syncRolePermissions'])
                ->middleware('permission:roles.edit');
        });

        Route::get('permissions',                                  [RolePermissionController::class, 'indexPermissions'])
            ->middleware('permission:roles.view');

        // ── Groups ────────────────────────────────────────────────────────────
        Route::group(['prefix' => 'groups', 'middleware' => 'permission:hierarchy.view'], function () {
            Route::get('/',     [GroupController::class, 'index']);
            Route::get('/{id}', [GroupController::class, 'show']);
        });

        Route::group(['prefix' => 'groups', 'middleware' => 'permission:hierarchy.manage'], function () {
            Route::post('/',       [GroupController::class, 'store']);
            Route::put('/{id}',    [GroupController::class, 'update']);
            Route::delete('/{id}', [GroupController::class, 'destroy']);
        });

        // ── Hierarchy ─────────────────────────────────────────────────────────
        Route::group(['prefix' => 'hierarchy', 'middleware' => 'permission:hierarchy.view'], function () {
            Route::get('/',                         [HierarchyController::class, 'index']);
            Route::get('/coordinators',             [HierarchyController::class, 'coordinators']);
            Route::get('/supervisors',              [HierarchyController::class, 'supervisors']);
            Route::get('/encuestadores',            [HierarchyController::class, 'encuestadores']);
            Route::get('/groups/{groupId}/members', [HierarchyController::class, 'groupMembers']);
        });

        Route::group(['prefix' => 'hierarchy', 'middleware' => 'permission:hierarchy.manage'], function () {
            Route::post('/assign',                              [HierarchyController::class, 'assign']);
            Route::put('/{id}',                                 [HierarchyController::class, 'updateAssignment']);
            Route::delete('/{id}',                              [HierarchyController::class, 'removeAssignment']);
            Route::delete('/coordinator/{coordId}/supervisor/{supId}', [HierarchyController::class, 'removeSupervisor']);
            Route::post('/groups/{groupId}/members',            [HierarchyController::class, 'addMember']);
            Route::delete('/groups/{groupId}/members/{userId}', [HierarchyController::class, 'removeMember']);
        });

        // ── Forms (read) ──────────────────────────────────────────────────────
        Route::group(['prefix' => 'forms', 'middleware' => 'permission:forms.view'], function () {
            Route::get('/',                      [FormController::class, 'index']);
            Route::get('/{id}',                  [FormController::class, 'show']);
            Route::get('/{formId}/fields',       [FormFieldController::class, 'index']);
        });

        // ── Forms (write) ─────────────────────────────────────────────────────
        Route::group(['prefix' => 'forms', 'middleware' => 'permission:forms.create'], function () {
            Route::post('/', [FormController::class, 'store']);
        });

        Route::group(['prefix' => 'forms', 'middleware' => 'permission:forms.edit'], function () {
            Route::put('/{id}',                          [FormController::class, 'update']);
            Route::post('/{formId}/fields',              [FormFieldController::class, 'store']);
            Route::put('/{formId}/fields/{fieldId}',     [FormFieldController::class, 'update']);
            Route::patch('/{formId}/fields/reorder',     [FormFieldController::class, 'reorder']);
            Route::delete('/{formId}/fields/{fieldId}',  [FormFieldController::class, 'destroy']);
        });

        Route::group(['prefix' => 'forms', 'middleware' => 'permission:forms.publish'], function () {
            Route::patch('/{id}/publish', [FormController::class, 'togglePublish']);
        });

        Route::group(['prefix' => 'forms', 'middleware' => 'permission:forms.delete'], function () {
            Route::delete('/{id}', [FormController::class, 'destroy']);
        });

        // ── Surveys (encuestador) ─────────────────────────────────────────────
        Route::group(['prefix' => 'surveys', 'middleware' => 'permission:surveys.create'], function () {
            Route::get('/check', [SurveyController::class, 'check']);
            Route::post('/',     [SurveyController::class, 'store']);
            Route::get('/my',    [SurveyController::class, 'my']);
        });

        // ── Surveys (admin/supervisor view) ───────────────────────────────────
        Route::group(['prefix' => 'surveys', 'middleware' => 'permission:surveys.view'], function () {
            Route::get('/',                          [SurveyController::class,  'index']);
            Route::get('/incomplete',                [SurveyController::class,  'incomplete']);
            Route::get('/export',                    [SurveyController::class,  'export']);    // legacy streaming
            Route::post('/exports',                  [ExportController::class,  'start']);
            Route::get('/exports/{id}',              [ExportController::class,  'status']);
            Route::get('/exports/{id}/download',     [ExportController::class,  'download']);
            Route::get('/{id}',                      [SurveyController::class,  'show']);
        });

        // ── Dashboard ─────────────────────────────────────────────────────────
        Route::get('dashboard', [DashboardController::class, 'index'])
            ->middleware('permission:dashboard.view');

        // ── Reports ───────────────────────────────────────────────────────────
        Route::group(['prefix' => 'reports', 'middleware' => 'permission:reports.view'], function () {
            Route::get('/surveys', [ReportController::class, 'index']);
            Route::get('/summary', [ReportController::class, 'summary']);
        });

        Route::group(['prefix' => 'reports', 'middleware' => 'permission:reports.export'], function () {
            Route::get('/export/excel', [ReportController::class, 'exportExcel']);
            Route::get('/export/pdf',   [ReportController::class, 'exportPdf']);
        });

        // ── Maps (read) ───────────────────────────────────────────────────────
        Route::group(['prefix' => 'maps', 'middleware' => 'permission:maps.view'], function () {
            Route::get('/surveys',          [MapController::class, 'surveysPoints']);
            Route::get('/layers',           [MapController::class, 'indexLayers']);
            Route::get('/layers/{id}',      [MapController::class, 'showLayer']);
            Route::get('/routes',           [MapController::class, 'indexRoutes']);
            Route::get('/routes/{id}',      [MapController::class, 'showRoute']);
            Route::get('/encuestadores',    [MapController::class, 'encuestadores']);
        });

        // ── Maps (write) ──────────────────────────────────────────────────────
        Route::group(['prefix' => 'maps', 'middleware' => 'permission:maps.manage'], function () {
            Route::post('/layers',          [MapController::class, 'storeLayer']);
            Route::patch('/layers/{id}',    [MapController::class, 'updateLayer']);
            Route::delete('/layers/{id}',   [MapController::class, 'destroyLayer']);
            Route::post('/routes',          [MapController::class, 'storeRoute']);
            Route::put('/routes/{id}',      [MapController::class, 'updateRoute']);
            Route::delete('/routes/{id}',   [MapController::class, 'destroyRoute']);
        });

        // ── Parameters ────────────────────────────────────────────────────────
        Route::group(['prefix' => 'parameters', 'middleware' => 'permission:parameters.view'], function () {
            Route::get('/', [ParameterController::class, 'index']);
        });

        Route::group(['prefix' => 'parameters', 'middleware' => 'permission:parameters.edit'], function () {
            Route::put('/{group}',             [ParameterController::class,    'save']);
            Route::post('/test/{group}',       [ConnectionTestController::class, 'test']);
            Route::post('/send-test/{group}',  [ConnectionTestController::class, 'sendTest']);
        });

        // ── Campaigns ─────────────────────────────────────────────────────────
        Route::group(['prefix' => 'campaigns', 'middleware' => 'permission:campaigns.view'], function () {
            Route::get('/',                         [CampaignController::class, 'index']);
            Route::get('/audiences',                [CampaignController::class, 'indexAudiences']);
            Route::get('/audiences/preview',        [CampaignController::class, 'previewAudience']);
            Route::get('/{id}',                     [CampaignController::class, 'show']);
            Route::get('/{id}/messages',            [CampaignController::class, 'messages']);
        });

        Route::group(['prefix' => 'campaigns', 'middleware' => 'permission:campaigns.create'], function () {
            Route::post('/',                        [CampaignController::class, 'store']);
            Route::post('/audiences',               [CampaignController::class, 'storeAudience']);
        });

        Route::group(['prefix' => 'campaigns', 'middleware' => 'permission:campaigns.edit'], function () {
            Route::put('/{id}',                     [CampaignController::class, 'update']);
        });

        Route::group(['prefix' => 'campaigns', 'middleware' => 'permission:campaigns.send'], function () {
            Route::post('/{id}/dispatch',           [CampaignController::class, 'dispatch']);
            Route::post('/{id}/cancel',             [CampaignController::class, 'cancel']);
        });

        Route::group(['prefix' => 'campaigns', 'middleware' => 'permission:campaigns.delete'], function () {
            Route::delete('/{id}',                  [CampaignController::class, 'destroy']);
            Route::delete('/audiences/{id}',        [CampaignController::class, 'destroyAudience']);
        });

    });
});
