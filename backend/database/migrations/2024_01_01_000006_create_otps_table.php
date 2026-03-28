<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otps', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20);
            $table->char('code', 4);
            $table->string('channel', 20);               // whatsapp | sms
            $table->foreignId('encuestador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('form_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('attempts')->default(0);     // failed verification attempts
            $table->boolean('is_used')->default(false);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['phone', 'is_used', 'expires_at']);
        });

        Schema::create('channel_consumptions', function (Blueprint $table) {
            $table->id();
            $table->string('channel', 30);              // otp_whatsapp|otp_sms|campaign_sms|campaign_sms_flash|campaign_call|maps_geocoding
            $table->string('reference_type', 50)->nullable();  // survey|campaign|otp
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('encuestador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('units')->default(1);        // messages / API calls
            $table->decimal('unit_cost', 10, 6)->default(0);
            $table->decimal('total_cost', 10, 4)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->json('metadata')->nullable();        // e.g. address queried, response code
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['channel', 'occurred_at']);
            $table->index(['reference_type', 'reference_id']);
            $table->index('occurred_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_consumptions');
        Schema::dropIfExists('otps');
    }
};
