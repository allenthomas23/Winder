import { calcCurviness } from './curviness';

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Build a simplified road graph — only intersection nodes, with full segment
 * coords stored on each edge.  Each edge spans from one true intersection
 * (degree ≥ 3 or way-endpoint) to the next, skipping intermediate shape nodes.
 *
 * Returns Map<nodeId, { lat, lon, edges: [{to, wayId, curviness, dist,
 *   name, highway, speedLimit, segCoords: [[lat,lon],...]}] }>
 */
export function buildGraph(ways, nodeCoords, { minSpeedLimit = 0 } = {}) {
  const filteredWays = ways.filter(
    (way) => minSpeedLimit === 0 || (way.speedLimit != null && way.speedLimit >= minSpeedLimit)
  );

  // Count how many ways reference each node
  const nodeWayCount = new Map();
  for (const way of filteredWays) {
    for (const id of way.nodes) {
      nodeWayCount.set(id, (nodeWayCount.get(id) || 0) + 1);
    }
  }

  // An "intersection" node: appears in 2+ ways OR is a way endpoint
  const isIntersection = new Set();
  for (const way of filteredWays) {
    if (way.nodes.length === 0) continue;
    isIntersection.add(way.nodes[0]);
    isIntersection.add(way.nodes[way.nodes.length - 1]);
    for (const id of way.nodes) {
      if ((nodeWayCount.get(id) || 0) >= 2) isIntersection.add(id);
    }
  }

  // Seed the graph with intersection nodes
  const graph = new Map();
  for (const id of isIntersection) {
    if (nodeCoords.has(id)) {
      const { lat, lon } = nodeCoords.get(id);
      graph.set(id, { lat, lon, edges: [] });
    }
  }

  // For each way, walk node-by-node and connect consecutive intersections
  for (const way of filteredWays) {
    const nodeIds = way.nodes;
    let segStartIdx = null;

    for (let i = 0; i < nodeIds.length; i++) {
      const id = nodeIds[i];
      if (!isIntersection.has(id) || !graph.has(id)) continue;

      if (segStartIdx === null) {
        segStartIdx = i;
        continue;
      }

      // Gather all coords from segStartIdx..i (including intermediate shape nodes)
      const segCoords = [];
      let dist = 0;
      let prev = null;
      for (let j = segStartIdx; j <= i; j++) {
        const nc = nodeCoords.get(nodeIds[j]);
        if (!nc) continue;
        const coord = [nc.lat, nc.lon];
        segCoords.push(coord);
        if (prev) dist += haversineMiles(prev[0], prev[1], coord[0], coord[1]);
        prev = coord;
      }

      if (segCoords.length < 2 || dist === 0) {
        segStartIdx = i;
        continue;
      }

      const curviness = calcCurviness(segCoords);
      const a = nodeIds[segStartIdx];
      const b = nodeIds[i];
      const nA = graph.get(a);
      const nB = graph.get(b);

      if (nA && nB) {
        const base = {
          wayId: way.id,
          curviness,
          dist,
          name: way.name,
          highway: way.highway,
          speedLimit: way.speedLimit,
        };
        if (way.oneway === true) {
          nA.edges.push({ to: b, ...base, segCoords });
        } else if (way.oneway === -1) {
          nB.edges.push({ to: a, ...base, segCoords: [...segCoords].reverse() });
        } else {
          nA.edges.push({ to: b, ...base, segCoords });
          nB.edges.push({ to: a, ...base, segCoords: [...segCoords].reverse() });
        }
      }

      segStartIdx = i;
    }
  }

  return graph;
}

/**
 * Find the graph node closest to (lat, lon) that is well-connected (>=2 edges).
 * Falls back to any node if none found.
 */
export function findNearestNode(graph, lat, lon) {
  let nearest = null;
  let minDist = Infinity;

  for (const [id, node] of graph) {
    if (node.edges.length < 2) continue;
    const d = (node.lat - lat) ** 2 + (node.lon - lon) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = id;
    }
  }

  if (!nearest) {
    for (const [id, node] of graph) {
      const d = (node.lat - lat) ** 2 + (node.lon - lon) ** 2;
      if (d < minDist) { minDist = d; nearest = id; }
    }
  }

  return nearest;
}
