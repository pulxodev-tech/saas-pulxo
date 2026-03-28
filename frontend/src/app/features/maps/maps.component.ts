import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit,
  ViewChild, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { MapLayer, MapRoute, MapsService, SurveyPoint } from './maps.service';

type MapTab = 'coverage' | 'heatmap' | 'layers' | 'routes';

// Fix Leaflet default icon paths (broken in bundlers)
const iconDefault = L.icon({
  iconUrl:       'assets/marker-icon.png',
  shadowUrl:     'assets/marker-shadow.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  shadowSize:    [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-maps',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-4">

      <!-- ── Header ───────────────────────────────────────────────────── -->
      <div>
        <h2 class="text-2xl font-bold text-slate-800">Mapas</h2>
        <p class="text-slate-500 text-sm mt-1">Visualización geográfica de encuestas y operaciones</p>
      </div>

      <!-- ── Tabs ──────────────────────────────────────────────────────── -->
      <div class="border-b border-slate-200 flex gap-6">
        @for (tab of tabs; track tab.key) {
          <button (click)="switchTab(tab.key)"
            class="pb-3 text-sm font-medium border-b-2 transition-colors -mb-px"
            [class.border-indigo-600]="activeTab() === tab.key"
            [class.text-indigo-600]="activeTab() === tab.key"
            [class.border-transparent]="activeTab() !== tab.key"
            [class.text-slate-500]="activeTab() !== tab.key">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- ═══ COVERAGE & HEATMAP ══════════════════════════════════════════ -->
      @if (activeTab() === 'coverage' || activeTab() === 'heatmap') {

        <!-- Filters -->
        <div class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="text-xs text-slate-500 block mb-1">Desde</label>
            <input type="date" #fromInput (change)="mapFilters.from = fromInput.value"
              class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label class="text-xs text-slate-500 block mb-1">Hasta</label>
            <input type="date" #toInput (change)="mapFilters.to = toInput.value"
              class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <button (click)="loadPoints()" [disabled]="loadingPoints()"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {{ loadingPoints() ? 'Cargando…' : 'Cargar puntos' }}
          </button>
          @if (points().length > 0) {
            <span class="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {{ points().length }} puntos con GPS
            </span>
          }
        </div>

        <!-- Map container -->
        <div #mapCoverage class="w-full rounded-xl border border-slate-200 overflow-hidden"
          style="height: 520px;"></div>
      }

      <!-- ═══ LAYERS ════════════════════════════════════════════════════════ -->
      @if (activeTab() === 'layers') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <!-- Layer list -->
          <div class="lg:col-span-1 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-700 text-sm">Capas GeoJSON</h3>
              <button (click)="showLayerForm.set(true)"
                class="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700">
                + Nueva
              </button>
            </div>

            @if (showLayerForm()) {
              <form [formGroup]="layerForm" (ngSubmit)="createLayer()"
                class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
                <input formControlName="name" type="text" placeholder="Nombre de la capa"
                  class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                <select formControlName="type"
                  class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                  <option value="neighborhood">Barrios</option>
                  <option value="voting_point">Puestos de votación</option>
                  <option value="custom">Personalizado</option>
                </select>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">GeoJSON (pega el contenido)</label>
                  <textarea formControlName="geojson" rows="4" placeholder='{"type":"FeatureCollection","features":[]}'
                    class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"></textarea>
                </div>
                <div class="flex gap-2">
                  <input formControlName="color" type="color"
                    class="h-8 w-12 rounded border border-slate-300 cursor-pointer p-0.5" />
                  <button type="submit" [disabled]="layerForm.invalid || savingLayer()"
                    class="flex-1 bg-indigo-600 text-white rounded-lg text-sm py-1.5 disabled:opacity-50">
                    {{ savingLayer() ? 'Guardando…' : 'Crear capa' }}
                  </button>
                  <button type="button" (click)="showLayerForm.set(false)"
                    class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">✕</button>
                </div>
              </form>
            }

            @if (loadingLayers()) {
              @for (i of [1,2,3]; track i) {
                <div class="bg-white rounded-xl border border-slate-200 h-16 animate-pulse"></div>
              }
            } @else if (layers().length === 0) {
              <p class="text-sm text-slate-400 text-center py-6">Sin capas. Crea la primera.</p>
            } @else {
              @for (layer of layers(); track layer.id) {
                <div class="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                  <div class="w-4 h-4 rounded-sm flex-shrink-0" [style.background]="layer.color"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-700 truncate">{{ layer.name }}</p>
                    <p class="text-xs text-slate-400">{{ typeLabel(layer.type) }}</p>
                  </div>
                  <button (click)="toggleLayer(layer)"
                    class="text-xs px-2 py-1 rounded-lg"
                    [class.bg-green-100]="layer.is_visible" [class.text-green-700]="layer.is_visible"
                    [class.bg-slate-100]="!layer.is_visible" [class.text-slate-500]="!layer.is_visible">
                    {{ layer.is_visible ? '👁' : '🙈' }}
                  </button>
                  <button (click)="loadLayerOnMap(layer)"
                    class="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
                    Ver
                  </button>
                  <button (click)="deleteLayer(layer.id)"
                    class="text-xs px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">🗑</button>
                </div>
              }
            }
          </div>

          <!-- Layer map -->
          <div class="lg:col-span-2">
            <div #mapLayers class="w-full rounded-xl border border-slate-200 overflow-hidden"
              style="height: 520px;"></div>
          </div>
        </div>
      }

      <!-- ═══ ROUTES ═══════════════════════════════════════════════════════ -->
      @if (activeTab() === 'routes') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <!-- Routes list -->
          <div class="lg:col-span-1 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-700 text-sm">Rutas asignadas</h3>
              <button (click)="showRouteForm.set(true)"
                class="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700">
                + Nueva ruta
              </button>
            </div>

            @if (showRouteForm()) {
              <form [formGroup]="routeForm" (ngSubmit)="createRoute()"
                class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
                <input formControlName="name" type="text" placeholder="Nombre de la ruta"
                  class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
                <select formControlName="encuestador_id"
                  class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                  <option value="">Sin asignar</option>
                  @for (enc of encuestadores(); track enc.id) {
                    <option [value]="enc.id">{{ enc.name }} {{ enc.last_name }}</option>
                  }
                </select>
                <input formControlName="scheduled_date" type="date"
                  class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
                <p class="text-xs text-slate-500">Haz clic en el mapa para agregar puntos de paso</p>
                @if (pendingWaypoints().length > 0) {
                  <div class="space-y-1 max-h-28 overflow-y-auto">
                    @for (wp of pendingWaypoints(); track wp.order) {
                      <div class="flex items-center gap-2 text-xs bg-white rounded px-2 py-1">
                        <span class="w-4 h-4 bg-indigo-500 text-white rounded-full text-[10px] flex items-center justify-center">{{ wp.order }}</span>
                        <span class="text-slate-600 flex-1">{{ wp.lat.toFixed(4) }}, {{ wp.lng.toFixed(4) }}</span>
                        <button type="button" (click)="removeWaypoint(wp.order - 1)" class="text-red-400 hover:text-red-600">✕</button>
                      </div>
                    }
                  </div>
                }
                <div class="flex gap-2">
                  <button type="submit" [disabled]="routeForm.invalid || pendingWaypoints().length === 0 || savingRoute()"
                    class="flex-1 bg-indigo-600 text-white rounded-lg text-sm py-1.5 disabled:opacity-50">
                    {{ savingRoute() ? 'Guardando…' : 'Crear ruta' }}
                  </button>
                  <button type="button" (click)="cancelRouteForm()"
                    class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">✕</button>
                </div>
              </form>
            }

            @if (routes().length === 0 && !showRouteForm()) {
              <p class="text-sm text-slate-400 text-center py-6">Sin rutas. Crea la primera.</p>
            } @else {
              @for (route of routes(); track route.id) {
                <div class="bg-white rounded-xl border border-slate-200 p-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-slate-700 truncate">{{ route.name }}</p>
                      <p class="text-xs text-slate-400">
                        {{ route.encuestador?.name ?? 'Sin asignar' }} ·
                        {{ route.waypoints.length }} puntos
                        @if (route.scheduled_date) { · {{ route.scheduled_date }} }
                      </p>
                    </div>
                    <div class="flex gap-1">
                      <button (click)="viewRoute(route)"
                        class="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">Ver</button>
                      <button (click)="deleteRoute(route.id)"
                        class="text-xs px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">🗑</button>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Route map -->
          <div class="lg:col-span-2">
            <div #mapRoutes class="w-full rounded-xl border border-slate-200 overflow-hidden"
              style="height: 520px;"></div>
          </div>
        </div>
      }

    </div>
  `,
})
export class MapsComponent implements OnInit, AfterViewInit, OnDestroy {
  private svc = inject(MapsService);
  private fb  = inject(FormBuilder);

  // ── Tab refs ──────────────────────────────────────────────────────────────
  @ViewChild('mapCoverage') mapCoverageRef?: ElementRef;
  @ViewChild('mapLayers')   mapLayersRef?: ElementRef;
  @ViewChild('mapRoutes')   mapRoutesRef?: ElementRef;

  // ── State ─────────────────────────────────────────────────────────────────
  activeTab     = signal<MapTab>('coverage');
  points        = signal<SurveyPoint[]>([]);
  loadingPoints = signal(false);
  layers        = signal<MapLayer[]>([]);
  loadingLayers = signal(false);
  savingLayer   = signal(false);
  showLayerForm = signal(false);
  routes        = signal<MapRoute[]>([]);
  showRouteForm = signal(false);
  savingRoute   = signal(false);
  encuestadores = signal<any[]>([]);
  pendingWaypoints = signal<{ lat: number; lng: number; address?: string; order: number }[]>([]);

  mapFilters: { from?: string; to?: string } = {};

  // ── Leaflet maps ──────────────────────────────────────────────────────────
  private mapCoverage: L.Map | null = null;
  private mapLayersMap: L.Map | null = null;
  private mapRoutesMap: L.Map | null = null;
  private coverageMarkers = L.layerGroup();
  private geojsonLayers: Record<number, L.GeoJSON> = {};
  private routeMarkersGroup = L.layerGroup();
  private routePolylineGroup = L.layerGroup();
  private pendingMarkersGroup = L.layerGroup();

  readonly tabs = [
    { key: 'coverage' as MapTab, label: '📍 Cobertura' },
    { key: 'heatmap' as MapTab,  label: '🔥 Densidad' },
    { key: 'layers'  as MapTab,  label: '🗺 Capas GeoJSON' },
    { key: 'routes'  as MapTab,  label: '🚗 Rutas' },
  ];

  // Colombia center
  private readonly CENTER: L.LatLngExpression = [4.570868, -74.297333];
  private readonly ZOOM = 6;

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadLayers();
    this.loadRoutes();
    this.svc.getEncuestadores().subscribe(e => this.encuestadores.set(e));
  }

  ngAfterViewInit(): void {
    // Maps init deferred to switchTab since @ViewChild may not be ready yet
    setTimeout(() => this.initCoverageMap(), 100);
  }

  ngOnDestroy(): void {
    this.mapCoverage?.remove();
    this.mapLayersMap?.remove();
    this.mapRoutesMap?.remove();
  }

  switchTab(tab: MapTab): void {
    this.activeTab.set(tab);
    setTimeout(() => {
      if ((tab === 'coverage' || tab === 'heatmap') && !this.mapCoverage) {
        this.initCoverageMap();
      }
      if (tab === 'coverage' || tab === 'heatmap') {
        this.mapCoverage?.invalidateSize();
        this.renderPoints();
      }
      if (tab === 'layers' && !this.mapLayersMap) {
        this.initLayersMap();
      } else if (tab === 'layers') {
        this.mapLayersMap?.invalidateSize();
      }
      if (tab === 'routes' && !this.mapRoutesMap) {
        this.initRoutesMap();
      } else if (tab === 'routes') {
        this.mapRoutesMap?.invalidateSize();
      }
    }, 50);
  }

  // ── Coverage map ──────────────────────────────────────────────────────────

  private initCoverageMap(): void {
    if (!this.mapCoverageRef?.nativeElement || this.mapCoverage) return;
    this.mapCoverage = L.map(this.mapCoverageRef.nativeElement, { zoomControl: true })
      .setView(this.CENTER, this.ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(this.mapCoverage);
    this.coverageMarkers.addTo(this.mapCoverage);
  }

  loadPoints(): void {
    this.loadingPoints.set(true);
    this.svc.getSurveyPoints(this.mapFilters).subscribe({
      next: res => {
        this.points.set(res.points);
        this.loadingPoints.set(false);
        this.renderPoints();
      },
      error: () => this.loadingPoints.set(false),
    });
  }

  private renderPoints(): void {
    if (!this.mapCoverage) return;
    this.coverageMarkers.clearLayers();

    const isHeat = this.activeTab() === 'heatmap';

    // Group points by ~0.001 degree cells for density
    const density: Record<string, number> = {};
    for (const p of this.points()) {
      const key = `${(p.lat).toFixed(3)},${(p.lng).toFixed(3)}`;
      density[key] = (density[key] ?? 0) + 1;
    }
    const maxDensity = Math.max(...Object.values(density), 1);

    for (const p of this.points()) {
      const key    = `${(p.lat).toFixed(3)},${(p.lng).toFixed(3)}`;
      const count  = density[key] ?? 1;
      const ratio  = count / maxDensity;

      if (isHeat) {
        // Color circle: blue(low) → yellow → red(high)
        const hue    = Math.round((1 - ratio) * 240); // 240=blue 0=red
        const radius = 6 + ratio * 18;
        L.circleMarker([p.lat, p.lng], {
          radius,
          fillColor:   `hsl(${hue}, 90%, 50%)`,
          color:       'transparent',
          fillOpacity: 0.6,
        }).bindPopup(`📍 ${count} encuesta(s) en zona`).addTo(this.coverageMarkers);
      } else {
        L.circleMarker([p.lat, p.lng], {
          radius:      5,
          fillColor:   '#4F46E5',
          color:       '#fff',
          weight:      1,
          fillOpacity: 0.8,
        }).bindPopup(`#${p.id}<br>${p.neighborhood ?? ''}<br>${p.date}`).addTo(this.coverageMarkers);
      }
    }

    if (this.points().length > 0) {
      const coords = this.points().map(p => [p.lat, p.lng] as L.LatLngExpression);
      this.mapCoverage.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
    }
  }

  // ── Layers map ────────────────────────────────────────────────────────────

  private initLayersMap(): void {
    if (!this.mapLayersRef?.nativeElement || this.mapLayersMap) return;
    this.mapLayersMap = L.map(this.mapLayersRef.nativeElement).setView(this.CENTER, this.ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 18,
    }).addTo(this.mapLayersMap);
  }

  loadLayers(): void {
    this.loadingLayers.set(true);
    this.svc.getLayers().subscribe({
      next: ls => { this.layers.set(ls); this.loadingLayers.set(false); },
      error: () => this.loadingLayers.set(false),
    });
  }

  loadLayerOnMap(layer: MapLayer): void {
    if (!this.mapLayersMap) this.initLayersMap();
    if (!this.mapLayersMap) return;

    // Remove existing
    if (this.geojsonLayers[layer.id]) {
      this.geojsonLayers[layer.id].remove();
    }

    // Fetch full GeoJSON if not loaded yet
    this.svc.getLayer(layer.id).subscribe(full => {
      if (!full.geojson) return;
      const gj = L.geoJSON(full.geojson as any, {
        style: { color: layer.color, weight: 2, fillOpacity: 0.15 },
        onEachFeature: (feature, featureLayer) => {
          const name = feature.properties?.name ?? feature.properties?.NOMBRE ?? '';
          if (name) featureLayer.bindPopup(name);
        },
      }).addTo(this.mapLayersMap!);
      this.geojsonLayers[layer.id] = gj;
      try { this.mapLayersMap!.fitBounds(gj.getBounds(), { padding: [20, 20] }); } catch {}
    });
  }

  layerForm = this.fb.group({
    name:    ['', Validators.required],
    type:    ['neighborhood', Validators.required],
    geojson: ['', Validators.required],
    color:   ['#3B82F6'],
  });

  createLayer(): void {
    if (this.layerForm.invalid) return;
    this.savingLayer.set(true);
    const v = this.layerForm.value;
    let geojson: object;
    try { geojson = JSON.parse(v.geojson!); } catch {
      alert('El GeoJSON no es válido. Verifica el formato JSON.');
      this.savingLayer.set(false);
      return;
    }
    this.svc.createLayer({ name: v.name!, type: v.type!, geojson, color: v.color! }).subscribe({
      next: layer => {
        this.layers.update(ls => [...ls, layer]);
        this.showLayerForm.set(false);
        this.layerForm.reset({ type: 'neighborhood', color: '#3B82F6' });
        this.savingLayer.set(false);
      },
      error: () => this.savingLayer.set(false),
    });
  }

  toggleLayer(layer: MapLayer): void {
    this.svc.updateLayer(layer.id, { is_visible: !layer.is_visible }).subscribe(updated => {
      this.layers.update(ls => ls.map(l => l.id === layer.id ? updated : l));
    });
  }

  deleteLayer(id: number): void {
    if (!confirm('¿Eliminar esta capa?')) return;
    this.svc.deleteLayer(id).subscribe(() => {
      this.layers.update(ls => ls.filter(l => l.id !== id));
      if (this.geojsonLayers[id]) {
        this.geojsonLayers[id].remove();
        delete this.geojsonLayers[id];
      }
    });
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = { neighborhood: 'Barrios', voting_point: 'Puestos de votación', custom: 'Personalizado' };
    return labels[type] ?? type;
  }

  // ── Routes map ────────────────────────────────────────────────────────────

  private initRoutesMap(): void {
    if (!this.mapRoutesRef?.nativeElement || this.mapRoutesMap) return;
    this.mapRoutesMap = L.map(this.mapRoutesRef.nativeElement).setView(this.CENTER, this.ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 18,
    }).addTo(this.mapRoutesMap);
    this.routeMarkersGroup.addTo(this.mapRoutesMap);
    this.routePolylineGroup.addTo(this.mapRoutesMap);
    this.pendingMarkersGroup.addTo(this.mapRoutesMap);

    // Click to add waypoints when form is open
    this.mapRoutesMap.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.showRouteForm()) return;
      const order = this.pendingWaypoints().length + 1;
      const wp = { lat: e.latlng.lat, lng: e.latlng.lng, order };
      this.pendingWaypoints.update(wps => [...wps, wp]);

      const marker = L.marker([wp.lat, wp.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#4F46E5;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)">${order}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }).addTo(this.pendingMarkersGroup);

      // Draw polyline
      this.routePolylineGroup.clearLayers();
      const coords = this.pendingWaypoints().map(p => [p.lat, p.lng] as L.LatLngExpression);
      if (coords.length > 1) {
        L.polyline(coords, { color: '#4F46E5', weight: 2, dashArray: '6, 4' }).addTo(this.routePolylineGroup);
      }
    });
  }

  loadRoutes(): void {
    this.svc.getRoutes().subscribe({ next: res => this.routes.set(res.data ?? res) });
  }

  routeForm = this.fb.group({
    name:           ['', Validators.required],
    encuestador_id: [''],
    scheduled_date: [''],
  });

  createRoute(): void {
    if (this.routeForm.invalid || this.pendingWaypoints().length === 0) return;
    this.savingRoute.set(true);
    const v = this.routeForm.value;
    this.svc.createRoute({
      name:           v.name!,
      encuestador_id: v.encuestador_id ? +v.encuestador_id : undefined,
      scheduled_date: v.scheduled_date || undefined,
      waypoints:      this.pendingWaypoints(),
    }).subscribe({
      next: route => {
        this.routes.update(rs => [route, ...rs]);
        this.cancelRouteForm();
        this.savingRoute.set(false);
      },
      error: () => this.savingRoute.set(false),
    });
  }

  cancelRouteForm(): void {
    this.showRouteForm.set(false);
    this.routeForm.reset();
    this.pendingWaypoints.set([]);
    this.pendingMarkersGroup.clearLayers();
    this.routePolylineGroup.clearLayers();
  }

  removeWaypoint(index: number): void {
    this.pendingWaypoints.update(wps => {
      const updated = wps.filter((_, i) => i !== index).map((wp, i) => ({ ...wp, order: i + 1 }));
      // Redraw pending markers
      this.pendingMarkersGroup.clearLayers();
      this.routePolylineGroup.clearLayers();
      for (const wp of updated) {
        L.marker([wp.lat, wp.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#4F46E5;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)">${wp.order}</div>`,
            iconSize: [22, 22], iconAnchor: [11, 11],
          }),
        }).addTo(this.pendingMarkersGroup);
      }
      if (updated.length > 1) {
        L.polyline(updated.map(p => [p.lat, p.lng] as L.LatLngExpression), { color: '#4F46E5', weight: 2, dashArray: '6,4' }).addTo(this.routePolylineGroup);
      }
      return updated;
    });
  }

  viewRoute(route: MapRoute): void {
    if (!this.mapRoutesMap) this.initRoutesMap();
    if (!this.mapRoutesMap) return;
    this.routeMarkersGroup.clearLayers();
    this.routePolylineGroup.clearLayers();

    for (const wp of route.waypoints) {
      L.marker([wp.lat, wp.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#10b981;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)">${wp.order}</div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        }),
      }).bindPopup(wp.address ?? `Punto ${wp.order}`).addTo(this.routeMarkersGroup);
    }

    const coords = route.waypoints.map(wp => [wp.lat, wp.lng] as L.LatLngExpression);
    if (coords.length > 1) {
      L.polyline(coords, { color: '#10b981', weight: 3 }).addTo(this.routePolylineGroup);
      this.mapRoutesMap.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
    }
  }

  deleteRoute(id: number): void {
    if (!confirm('¿Eliminar esta ruta?')) return;
    this.svc.deleteRoute(id).subscribe(() => this.routes.update(rs => rs.filter(r => r.id !== id)));
  }
}
