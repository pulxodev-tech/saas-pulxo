<?php

namespace App\Presentation\Http\Controllers\Api\V1\Maps;

use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\Models\MapLayer;
use App\Infrastructure\Persistence\Eloquent\Models\MapRoute;
use App\Infrastructure\Persistence\Eloquent\Models\Survey;
use App\Infrastructure\Persistence\Eloquent\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MapController extends Controller
{
    // ── Survey coverage points ─────────────────────────────────────────────

    /**
     * GET /api/v1/maps/surveys
     *
     * Returns survey lat/lng points for heatmap + coverage views.
     * Only returns surveys that have GPS coordinates.
     * Auth: maps.view
     */
    public function surveysPoints(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'form_id'  => ['nullable', 'integer'],
            'group_id' => ['nullable', 'integer'],
            'from'     => ['nullable', 'date'],
            'to'       => ['nullable', 'date'],
            'limit'    => ['nullable', 'integer', 'max:10000'],
        ]);

        $points = Survey::whereNotNull('submitted_at')
            ->whereNotNull('encuestador_lat')
            ->when(!empty($filters['form_id']),  fn($q) => $q->where('form_id',  $filters['form_id']))
            ->when(!empty($filters['group_id']), fn($q) => $q->where('group_id', $filters['group_id']))
            ->when(!empty($filters['from']),     fn($q) => $q->where('submitted_at', '>=', $filters['from']))
            ->when(!empty($filters['to']),       fn($q) => $q->where('submitted_at', '<=', $filters['to'] . ' 23:59:59'))
            ->limit($filters['limit'] ?? 5000)
            ->get([
                'id', 'encuestador_lat', 'encuestador_lng',
                'group_id', 'form_id', 'submitted_at',
                'respondent_neighborhood',
            ])
            ->map(fn($s) => [
                'id'           => $s->id,
                'lat'          => (float) $s->encuestador_lat,
                'lng'          => (float) $s->encuestador_lng,
                'group_id'     => $s->group_id,
                'form_id'      => $s->form_id,
                'neighborhood' => $s->respondent_neighborhood,
                'date'         => $s->submitted_at?->format('Y-m-d'),
            ]);

        return response()->json(['points' => $points, 'total' => $points->count()]);
    }

    // ── Layers ─────────────────────────────────────────────────────────────

    /** GET /api/v1/maps/layers */
    public function indexLayers(): JsonResponse
    {
        $layers = MapLayer::orderBy('name')->get(['id', 'name', 'type', 'is_visible', 'color', 'created_at']);
        return response()->json($layers);
    }

    /** GET /api/v1/maps/layers/{id} — includes full GeoJSON */
    public function showLayer(int $id): JsonResponse
    {
        return response()->json(MapLayer::findOrFail($id));
    }

    /** POST /api/v1/maps/layers */
    public function storeLayer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:150'],
            'type'       => ['required', 'string', 'in:neighborhood,voting_point,custom'],
            'geojson'    => ['required', 'array'],
            'color'      => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_visible' => ['nullable', 'boolean'],
        ]);

        $layer = MapLayer::create([
            ...$data,
            'created_by' => $request->user()->id,
            'is_visible' => $data['is_visible'] ?? true,
            'color'      => $data['color'] ?? '#3B82F6',
        ]);

        return response()->json($layer, 201);
    }

    /** PATCH /api/v1/maps/layers/{id} — toggle visibility or update meta */
    public function updateLayer(Request $request, int $id): JsonResponse
    {
        $layer = MapLayer::findOrFail($id);
        $data  = $request->validate([
            'name'       => ['sometimes', 'string', 'max:150'],
            'color'      => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_visible' => ['sometimes', 'boolean'],
        ]);
        $layer->update($data);
        return response()->json($layer);
    }

    /** DELETE /api/v1/maps/layers/{id} */
    public function destroyLayer(int $id): JsonResponse
    {
        MapLayer::findOrFail($id)->delete();
        return response()->json(['message' => 'Capa eliminada.']);
    }

    // ── Routes ─────────────────────────────────────────────────────────────

    /** GET /api/v1/maps/routes */
    public function indexRoutes(Request $request): JsonResponse
    {
        $routes = MapRoute::with('encuestador:id,name,last_name')
            ->when($request->input('encuestador_id'), fn($q, $id) => $q->where('encuestador_id', $id))
            ->when($request->input('date'),           fn($q, $d)  => $q->where('scheduled_date', $d))
            ->orderByDesc('scheduled_date')
            ->paginate(30);
        return response()->json($routes);
    }

    /** GET /api/v1/maps/routes/{id} */
    public function showRoute(int $id): JsonResponse
    {
        return response()->json(MapRoute::with('encuestador:id,name,last_name')->findOrFail($id));
    }

    /** POST /api/v1/maps/routes */
    public function storeRoute(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:150'],
            'encuestador_id'   => ['nullable', 'integer', 'exists:users,id'],
            'waypoints'        => ['required', 'array', 'min:1'],
            'waypoints.*.lat'  => ['required', 'numeric'],
            'waypoints.*.lng'  => ['required', 'numeric'],
            'waypoints.*.address' => ['nullable', 'string'],
            'path_coordinates' => ['nullable', 'array'],
            'scheduled_date'   => ['nullable', 'date'],
        ]);

        // Add order index to waypoints
        $waypoints = array_values(array_map(
            fn($wp, $i) => array_merge($wp, ['order' => $i + 1]),
            $data['waypoints'],
            array_keys($data['waypoints'])
        ));

        $route = MapRoute::create([
            ...$data,
            'waypoints'  => $waypoints,
            'created_by' => $request->user()->id,
            'path_coordinates' => $data['path_coordinates'] ?? [],
        ]);

        return response()->json($route->load('encuestador:id,name,last_name'), 201);
    }

    /** PUT /api/v1/maps/routes/{id} */
    public function updateRoute(Request $request, int $id): JsonResponse
    {
        $route = MapRoute::findOrFail($id);
        $data  = $request->validate([
            'name'           => ['sometimes', 'string', 'max:150'],
            'encuestador_id' => ['nullable', 'integer', 'exists:users,id'],
            'waypoints'      => ['sometimes', 'array'],
            'scheduled_date' => ['nullable', 'date'],
            'is_printed'     => ['sometimes', 'boolean'],
        ]);
        $route->update($data);
        return response()->json($route->load('encuestador:id,name,last_name'));
    }

    /** DELETE /api/v1/maps/routes/{id} */
    public function destroyRoute(int $id): JsonResponse
    {
        MapRoute::findOrFail($id)->delete();
        return response()->json(['message' => 'Ruta eliminada.']);
    }

    /**
     * GET /api/v1/maps/encuestadores
     * Returns encuestadores list for the route assignment dropdown.
     */
    public function encuestadores(): JsonResponse
    {
        $list = User::whereHas('role', fn($q) => $q->where('name', 'encuestador'))
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'last_name', 'phone']);
        return response()->json($list);
    }
}
