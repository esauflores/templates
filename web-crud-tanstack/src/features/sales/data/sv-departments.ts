import type { FeatureCollection, Geometry } from "geojson";

import raw from "./sv-departments.geo.json";

export type DepartmentProps = { name: string };

/**
 * El Salvador ADM1 (14 departments), geoBoundaries gbOpen (CC-BY 4.0).
 * `sv-departments.geo.json` is committed pre-wound clockwise — geoBoundaries winds
 * rings the other way, which d3-geo's spherical path reads as "the whole globe
 * minus this area" (every department fills the frame). After replacing the file,
 * re-wind it once with `@mapbox/geojson-rewind` (`rewind(gj, true)`, clockwise).
 * Source `shapeName` ("Departamento de X" / bare) is normalised to `name`.
 */
const source = raw as unknown as FeatureCollection<Geometry, { shapeName: string }>;

export const SV_DEPARTMENTS: FeatureCollection<Geometry, DepartmentProps> = {
  type: "FeatureCollection",
  features: source.features.map((f) => ({
    ...f,
    properties: { name: f.properties.shapeName.replace(/^Departamento de /, "") },
  })),
};

export const SV_DEPARTMENT_NAMES = SV_DEPARTMENTS.features
  .map((f) => f.properties.name)
  .sort((a, b) => a.localeCompare(b));
