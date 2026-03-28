<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained()->restrictOnDelete();
            $table->string('name', 150);
            $table->string('last_name', 150)->nullable();
            $table->string('email', 180)->unique()->nullable();   // null for encuestadores
            $table->string('phone', 20)->nullable();
            $table->string('password')->nullable();               // null for encuestadores
            $table->char('pin', 4)->nullable();                   // only for encuestadores (hashed)
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['role_id', 'is_active']);
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
