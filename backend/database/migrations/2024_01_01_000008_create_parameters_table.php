<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // System-wide parameters editable from the UI (no code changes needed)
        Schema::create('parameters', function (Blueprint $table) {
            $table->id();
            $table->string('group', 60);         // whatsapp | sms | maps | general
            $table->string('key', 100)->unique();
            $table->string('display_name', 150);
            $table->text('value')->nullable();   // encrypted for sensitive keys
            $table->boolean('is_encrypted')->default(false);
            $table->string('description')->nullable();
            $table->timestamps();

            $table->index('group');
        });

        // Goals per coordinator/supervisor (only admins/coordinators/supervisors see progress)
        Schema::create('goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assigned_to')->constrained('users')->cascadeOnDelete(); // coordinator or supervisor
            $table->foreignId('form_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('target_count');
            $table->date('period_start');
            $table->date('period_end');
            $table->timestamps();

            $table->index(['assigned_to', 'period_start', 'period_end']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goals');
        Schema::dropIfExists('parameters');
    }
};
