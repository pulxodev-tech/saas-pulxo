<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('pollster_code', 8)->nullable()->after('pin');
        });

        // Backfill existing users: code = zero-padded id (e.g. 1 → "0001")
        DB::statement("UPDATE users SET pollster_code = LPAD(CAST(id AS CHAR), 4, '0') WHERE pollster_code IS NULL");

        Schema::table('users', function (Blueprint $table) {
            $table->unique('pollster_code');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('pollster_code');
        });
    }
};
