import { calcCurviness, roadLengthMiles } from './curviness';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Build Overpass QL query to fetch road ways with geometry.
 * @param {number} lat  Center latitude
 * @param {number} lon  Center longitude
 * @param {number} radiusMiles  Search radius in miles
 * @param {string[]} roadTypes  Array of OSM highway values
 */
function buildQuery(lat, lon, radiusMiles, roadTypes) {
  const radiusMeters = Math.round(radiusMiles * 1609.34);
  const typeFilters = roadTypes
    .map((t) => `way["highway"="${t}"](around:${radiusMeters},${lat},${lon});`)
    .join('\n  ');

  return `
[out:json][timeout:60];
(
  ${typeFilters}
);
out geom;
`.trim();
}

/**
 * Parse Overpass JSON response into road objects.
 */
function parseRoads(data) {
  if (!data || !data.elements) return [];

  return data.elements
    .filter((el) => el.type === 'way' && el.geometry && el.geometry.length >= 2)
    .map((el) => {
      const coords = el.geometry.map((pt) => [pt.lat, pt.lon]);
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || null;
      const speedLimit = parseSpeedLimit(tags.maxspeed);
      const highway = tags.highway || 'unknown';
      const curviness = calcCurviness(coords);
      const length = roadLengthMiles(coords);

      return {
        id: el.id,
        name,
        coords,
        highway,
        speedLimit,
        curviness,
        length,
        tags,
      };
    });
}

function parseSpeedLimit(maxspeed) {
  if (!maxspeed) return null;
  const n = parseInt(maxspeed, 10);
  if (isNaN(n)) return null;
  // OSM maxspeed is in mph for US, kph for others — if > 100 assume kph, convert
  if (maxspeed.toLowerCase().includes('mph')) return n;
  if (n > 100) return Math.round(n * 0.621371);
  return n; // assume mph for US roads
}

/**
 * Fetch and process winding roads near a location.
 */
export async function fetchRoads({ lat, lon, radiusMiles, roadTypes }) {
  const query = buildQuery(lat, lon, radiusMiles, roadTypes);
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  return parseRoads(data);
}
