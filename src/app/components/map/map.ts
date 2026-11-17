import { Component, AfterViewInit, Input } from '@angular/core';

import * as Leaflet from 'leaflet';
import { GlobalFunctions } from '../../_globals/global-functions';
import { IMapMarker } from '../../_interfaces/i-map-marker';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = Leaflet.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
// sets default icon as option for marker
Leaflet.Marker.prototype.options.icon = iconDefault;

// individual instance of Leaflet is needed for each component instance
const L = Leaflet;

@Component({
  selector: 'dsy-map',
  templateUrl: './map.html',
  styleUrl: './map.css',
  imports: []
})
export class MapComponent implements AfterViewInit {

  public name = 'MapComponent';

  @Input({required: true}) mapMarkers!: Array<IMapMarker>;
  @Input() mapCenter!: [number, number, number?];

  private map: any;

  private initMap(markers:  Array<IMapMarker>, center: [number, number, number?]): void {
    this.map = L.map('map', {
      center,
      zoom: GlobalFunctions.getMapZoomLevel(markers, center)
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      // we allow min zoom 2 instead of 3 (which is proposed as default min)
      minZoom: 2,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    tiles.addTo(this.map);
  }

  constructor() {

  }

  ngAfterViewInit(): void {
    let center: [number, number, number?];
    if (this.mapCenter) {
      center = this.mapCenter;
    } else {
      if (this.mapMarkers?.length > 1) {
        // we set center of markers as center of map?
        center = GlobalFunctions.getMapCenter(this.mapMarkers);
      } else  {
        // default center vienna 48.2050, 16.3729
        // TODO take center latitude, longitude from options
        center =  [ 48.2050, 16.3729 ];
      }
    }
    this.initMap(this.mapMarkers, center);
    this.mapMarkers.forEach(_ => {
      // not necessary, is set via L.Marker.prototype
      // const marker = L.marker(_,{icon: iconDefault});
      const marker = L.marker(_.marker,);
      if (_.tooltip && _.tooltip?.length > 0) {
        marker.bindTooltip(_.tooltip, {permanent: true}).openTooltip();
      }
      marker.addTo(this.map);
    })
  }

}

