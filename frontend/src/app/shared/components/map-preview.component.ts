import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div #mapContainer class="w-full h-full z-0"></div>
      
      <!-- Overlay controls -->
      <div class="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm border border-slate-100 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
        {{ points.length }} puntos capturados
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; }
    .leaflet-container { font-family: inherit; }
  `]
})
export class MapPreviewComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @Input() points: { lat: number; lng: number; time?: string; [key: string]: any }[] = [];
  @Input() center: [number, number] = [4.5709, -74.2973]; // Colombia default
  @Input() zoom: number = 5;

  private map?: L.Map;
  private markers: L.CircleMarker[] = [];

  ngOnInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points'] && !changes['points'].firstChange) {
      this.updateMarkers();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: this.center,
      zoom: this.zoom,
      attributionControl: false,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    this.updateMarkers();
  }

  private updateMarkers(): void {
    if (!this.map) return;

    // Clear old markers
    this.markers.forEach(m => m.remove());
    this.markers = [];

    if (this.points.length === 0) return;

    const bounds = L.latLngBounds([]);

    this.points.forEach(p => {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 6,
        fillColor: '#6366f1', // indigo-500
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(this.map!);

      if (p.time) {
        marker.bindPopup(`<div class="text-[11px] font-medium">Encuesta: ${p.time}</div>`);
      }

      this.markers.push(marker);
      bounds.extend([p.lat, p.lng]);
    });

    // Fit bounds if we have many points far apart
    if (this.points.length > 1) {
      this.map.fitBounds(bounds, { padding: [40, 40] });
    } else if (this.points.length === 1) {
      this.map.setView([this.points[0].lat, this.points[0].lng], 13);
    }
  }
}
