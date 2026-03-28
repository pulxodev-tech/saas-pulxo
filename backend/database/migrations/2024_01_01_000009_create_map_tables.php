<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('map_layers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('type', 30);          // neighborhood | voting_point | custom
            $table->json('geojson');             // GeoJSON FeatureCollection
            $table->boolean('is_visible')->default(true);
            $table->string('color', 7)->default('#3B82F6'); // hex
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('map_routes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->foreignId('encuestador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('waypoints');            // [{lat, lng, address, order}]
            $table->json('path_coordinates');     // drawn path on map
            $table->date('scheduled_date')->nullable();
            $table->boolean('is_printed')->default(false);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('map_routes');
        Schema::dropIfExists('map_layers');
    }
};
