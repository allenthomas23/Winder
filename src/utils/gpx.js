export function exportGpx(route, name) {
  const coords = route.coords
    .map(([lat, lon]) => `    <trkpt lat="${lat}" lon="${lon}"></trkpt>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Winder" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</name>
    <trkseg>
${coords}
    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([xml], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_')}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}
