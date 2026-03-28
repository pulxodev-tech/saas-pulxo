<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60)->unique();            // e.g. super_admin, coordinator
            $table->string('display_name', 100);             // e.g. Super Admin, Coordinador
            $table->string('description')->nullable();
            $table->boolean('is_system')->default(false);    // system roles cannot be deleted
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('permission_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60)->unique();            // e.g. surveys, users, reports
            $table->string('display_name', 100);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('permission_group_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100)->unique();           // e.g. surveys.view, surveys.create
            $table->string('display_name', 150);
            $table->string('description')->nullable();
            $table->timestamps();

            $table->index('permission_group_id');
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('permission_groups');
        Schema::dropIfExists('roles');
    }
};
