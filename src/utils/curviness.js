/**
 * Calculate bearing (degrees) from point A to point B.
 */
function bearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Haversine distance in miles between two lat/lon points.
 */
function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Given an array of [lat, lng] coordinates, returns a curviness score 1–10.
 * Method: total absolute bearing change / total length (degrees per mile), normalized.
 */
export function calcCurviness(coords) {
  if (!coords || coords.length < 3) return 1;

  let totalBearingChange = 0;
  let totalLength = 0;

  for (let i = 1; i < coords.length; i++) {
    const [lat1, lon1] = coords[i - 1];
    const [lat2, lon2] = coords[i];
    totalLength += distanceMiles(lat1, lon1, lat2, lon2);
  }

  for (let i = 1; i < coords.length - 1; i++) {
    const [lat0, lon0] = coords[i - 1];
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];
    const b1 = bearing(lat0, lon0, lat1, lon1);
    const b2 = bearing(lat1, lon1, lat2, lon2);
    let diff = Math.abs(b2 - b1);
    if (diff > 180) diff = 360 - diff;
    totalBearingChange += diff;
  }

  if (totalLength < 0.01) return 1;

  const degreesPerMile = totalBearingChange / totalLength;
  // Normalize: 0–50 deg/mi → 1, 50–500 deg/mi → 1–10, 500+ → 10
  const raw = Math.log1p(degreesPerMile) / Math.log1p(500);
  return Math.max(1, Math.min(10, Math.round(raw * 10)));
}

/**
 * Total road length in miles from [lat, lng] coords array.
 */
export function roadLengthMiles(coords) {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += distanceMiles(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
  }
  return total;
}
