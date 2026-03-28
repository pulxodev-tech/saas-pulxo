<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surveys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->restrictOnDelete();
            $table->foreignId('encuestador_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('group_id')->constrained('groups')->restrictOnDelete();

            // Respondent info
            $table->string('respondent_phone', 20);
            $table->string('respondent_name', 150)->nullable();
            $table->string('respondent_last_name', 150)->nullable();
            $table->string('respondent_gender', 20)->nullable();
            $table->tinyInteger('respondent_age')->unsigned()->nullable();
            $table->string('respondent_occupation', 100)->nullable();
            $table->string('respondent_neighborhood', 150)->nullable();
            $table->string('respondent_address', 255)->nullable();

            // Coordinates — two sets
            $table->decimal('encuestador_lat', 10, 7)->nullable();  // GPS at submit time
            $table->decimal('encuestador_lng', 10, 7)->nullable();
            $table->decimal('address_lat', 10, 7)->nullable();       // from Maps geocoding
            $table->decimal('address_lng', 10, 7)->nullable();

            // Dynamic form responses stored as JSONB for fast reporting
            // Structure: {"field_key": "value", ...}
            $table->jsonb('responses')->nullable();

            // OTP & delivery
            $table->boolean('otp_verified')->default(false);
            $table->timestamp('otp_verified_at')->nullable();
            $table->string('submission_channel', 20)->default('pin'); // pin | whatsapp_url

            // Google Maps API cost tracking (Fase 8)
            $table->integer('maps_api_calls')->default(0);
            $table->decimal('maps_api_cost_usd', 8, 6)->default(0);

            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Critical indexes for dashboard queries
            $table->unique(['respondent_phone', 'form_id']);          // no duplicates
            $table->index(['encuestador_id', 'submitted_at']);
            $table->index(['group_id', 'submitted_at']);
            $table->index(['form_id', 'submitted_at']);
            $table->index('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surveys');
    }
};
