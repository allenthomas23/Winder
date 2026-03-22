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

  let totalLength = 0;
  const segments = [];

  for (let i = 1; i < coords.length; i++) {
    const [lat1, lon1] = coords[i - 1];
    const [lat2, lon2] = coords[i];
    const length = distanceMiles(lat1, lon1, lat2, lon2);
    totalLength += length;
    segments.push({
      bearing: bearing(lat1, lon1, lat2, lon2),
      length,
    });
  }

  let sustainedCurveScore = 0;
  let wigglePenalty = 0;
  let shortSegmentMiles = 0;
  let prevSignedDiff = 0;
  let runLength = 0;

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const next = segments[i];
    let diff = next.bearing - prev.bearing;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const signedDiff = diff;
    diff = Math.abs(signedDiff);
    if (diff > 180) diff = 360 - diff;

    const transitionLength = prev.length + next.length;
    if (prev.length < 0.05 || next.length < 0.05) shortSegmentMiles += transitionLength / 2;

    if (Math.abs(signedDiff) >= 4) {
      const sameDirection = prevSignedDiff !== 0 && Math.sign(prevSignedDiff) === Math.sign(signedDiff);
      runLength = sameDirection ? runLength + 1 : 1;
      const sustainedBoost = 1 + Math.min(1.5, runLength * 0.35);
      sustainedCurveScore += diff * sustainedBoost * Math.max(transitionLength, 0.03);

      if (!sameDirection && prevSignedDiff !== 0) {
        wigglePenalty += Math.min(diff, Math.abs(prevSignedDiff)) * 1.1;
      }

      prevSignedDiff = signedDiff;
    }
  }

  if (totalLength < 0.01) return 1;

  const effectiveLength = Math.max(totalLength - shortSegmentMiles * 0.5, totalLength * 0.35);
  const sustainedPerMile = Math.max(0, sustainedCurveScore - wigglePenalty) / effectiveLength;
  const shortPenalty = Math.min(0.45, shortSegmentMiles / Math.max(totalLength, 0.01));
  const raw = Math.log1p(sustainedPerMile) / Math.log1p(220) - shortPenalty;
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
