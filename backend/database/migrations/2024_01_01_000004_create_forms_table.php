<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forms', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200);
            $table->string('description')->nullable();
            $table->boolean('is_published')->default(false);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_published', 'is_active']);
        });

        /*
         * Supported field types:
         * text | textarea | number | email | phone | date | select | radio | checkbox
         * address_gps | separator | heading
         */
        Schema::create('form_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->cascadeOnDelete();
            $table->string('field_key', 100);               // machine name, unique per form
            $table->string('label', 255);
            $table->string('field_type', 30);
            $table->boolean('is_required')->default(false);
            $table->integer('sort_order')->default(0);
            $table->json('options')->nullable();             // for select/radio: [{value, label}]
            $table->json('validation_rules')->nullable();    // {min, max, pattern, etc.}
            $table->string('placeholder')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['form_id', 'field_key']);
            $table->index(['form_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_fields');
        Schema::dropIfExists('forms');
    }
};
