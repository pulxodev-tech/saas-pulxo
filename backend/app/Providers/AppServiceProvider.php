<?php

namespace App\Providers;

use App\Domain\Permission\Repositories\PermissionRepositoryInterface;
use App\Domain\User\Repositories\UserRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentPermissionRepository;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentUserRepository;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        if (isset($_SERVER['VERCEL']) || env('VERCEL')) {
            $this->app->useStoragePath('/tmp');
        }

        // Domain → Infrastructure bindings
        $this->app->bind(
            PermissionRepositoryInterface::class,
            EloquentPermissionRepository::class,
        );

        $this->app->bind(
            UserRepositoryInterface::class,
            EloquentUserRepository::class,
        );
    }

    public function boot(): void
    {
        if (isset($_SERVER['VERCEL']) || env('VERCEL')) {
            config(['view.compiled' => '/tmp']);
        }
    }
}
