export class AppleLookAroundPano {
  panoId: string;
  coverage_type: number;
  camera_type: string;
  date: number;
  heading: number;
  lat: number;
  lng: number;
  altitude?: number;

  constructor(
    panoId: string,
    coverage_type: number,
    camera_type: string,
    date: string,
    heading: number,
    lat: number,
    lng: number,
    altitude? :number
  ) {
    this.coverage_type=coverage_type;
    this.camera_type=camera_type;
    this.date = Number(date);
    this.panoId = panoId;
    this.heading = heading;
    this.lat = lat;
    this.lng = lng;
    this.altitude = altitude;
  }
}
