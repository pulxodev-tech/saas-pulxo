<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Groups of encuestadores managed by a supervisor
        Schema::create('groups', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // coordinator_id → supervisor_id → group_id
        Schema::create('hierarchies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coordinator_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('supervisor_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('group_id')->constrained('groups')->restrictOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['coordinator_id', 'supervisor_id', 'group_id']);
            $table->index('coordinator_id');
            $table->index('supervisor_id');
            $table->index('group_id');
        });

        // Encuestadores belong to one group
        Schema::create('group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();   // encuestador
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['group_id', 'user_id']);
            $table->index(['group_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_members');
        Schema::dropIfExists('hierarchies');
        Schema::dropIfExists('groups');
    }
};
