const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function buildQuery(lat, lon, radiusMeters, roadTypes) {
  const typeFilters = roadTypes
    .map((t) => `way["highway"="${t}"](around:${radiusMeters},${lat},${lon});`)
    .join('\n  ');

  return `[out:json][timeout:90];
(
  ${typeFilters}
);
out body;
>;
out skel qt;`.trim();
}

/**
 * Returns { ways: [...], nodeCoords: Map<id, {lat, lon}> }
 */
export function parseGraphData(data) {
  const nodeCoords = new Map();
  const ways = [];

  for (const el of data.elements) {
    if (el.type === 'node') {
      nodeCoords.set(el.id, { lat: el.lat, lon: el.lon });
    } else if (el.type === 'way' && el.nodes && el.nodes.length >= 2) {
      const tags = el.tags || {};
      const speedLimit = parseSpeedLimit(tags.maxspeed);
      ways.push({
        id: el.id,
        nodes: el.nodes,
        name: tags.name || null,
        highway: tags.highway || 'unknown',
        speedLimit,
      });
    }
  }

  return { ways, nodeCoords };
}

function parseSpeedLimit(maxspeed) {
  if (!maxspeed) return null;
  const n = parseInt(maxspeed, 10);
  if (isNaN(n)) return null;
  if (maxspeed.toLowerCase().includes('mph')) return n;
  if (n > 100) return Math.round(n * 0.621371);
  return n;
}

export async function fetchRoadGraph({ lat, lon, radiusMiles, roadTypes }) {
  const radiusMeters = Math.round(radiusMiles * 1609.34);
  const query = buildQuery(lat, lon, radiusMeters, roadTypes);

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

  const data = await response.json();
  return parseGraphData(data);
}
