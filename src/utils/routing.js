function seededRng(seed) {
  let s = ((seed + 1) * 0x9e3779b9) >>> 0 || 1;
  return () => { s ^= s<<13; s ^= s>>>17; s ^= s<<5; return (s>>>0)/0x100000000; };
}

function edgeKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

class MinHeap {
  constructor() { this.h = []; }
  push(item) {
    this.h.push(item); let i=this.h.length-1;
    while(i>0){const p=(i-1)>>1;if(this.h[p].d<=this.h[i].d)break;[this.h[p],this.h[i]]=[this.h[i],this.h[p]];i=p;}
  }
  pop() {
    const top=this.h[0],last=this.h.pop();
    if(this.h.length>0){this.h[0]=last;let i=0;while(true){let m=i,l=2*i+1,r=2*i+2,n=this.h.length;if(l<n&&this.h[l].d<this.h[m].d)m=l;if(r<n&&this.h[r].d<this.h[m].d)m=r;if(m===i)break;[this.h[m],this.h[i]]=[this.h[i],this.h[m]];i=m;}}
    return top;
  }
  get size() { return this.h.length; }
}

function dijkstra(graph, startId, maxDist, excludeEdges=null) {
  const dist=new Map([[startId,0]]),prev=new Map(),heap=new MinHeap();
  heap.push({id:startId,d:0});
  while(heap.size>0){
    const {id:u,d:du}=heap.pop();
    if(du>(dist.get(u)??Infinity)||du>maxDist) continue;
    const node=graph.get(u); if(!node) continue;
    for(const e of node.edges){
      if(excludeEdges&&excludeEdges.has(edgeKey(u,e.to))) continue;
      const nd=du+e.dist;
      if(nd<(dist.get(e.to)??Infinity)){dist.set(e.to,nd);prev.set(e.to,u);heap.push({id:e.to,d:nd});}
    }
  }
  return {dist,prev};
}

function reconstructPath(prev, fromId, toId) {
  const path=[fromId]; let cur=fromId;
  for(let i=0;i<10000;i++){
    if(cur===toId) return path;
    const p=prev.get(cur); if(p===undefined) return null;
    path.push(p); cur=p;
  }
  return cur===toId?path:null;
}

// Bearing in radians from (lat1,lon1) to (lat2,lon2)
function bearing(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const dLon = (lon2 - lon1) * r;
  const y = Math.sin(dLon) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) -
    Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos(dLon);
  return Math.atan2(y, x); // -π to π
}

/**
 * Build a loop using two edge-disjoint paths from start to a midpoint.
 * Path A goes start → midpoint (shortest path in direction `outAngle`).
 * Path B goes start → midpoint via a completely different set of edges.
 * Loop = pathA forward + pathB reversed = start → mid → start with no shared edges.
 *
 * This reliably finds loops even on sparse high-speed road networks where a
 * random-walk + return-Dijkstra approach almost always fails to find a clean return.
 */
function buildLoop(graph, startNodeId, targetDist, seed) {
  const rng = seededRng(seed);

  // 12 primary directions (every 30°) with ±15° jitter so seeds spread out
  const baseAngle = ((seed % 12) / 12) * 2 * Math.PI;
  const outAngle = baseAngle + (rng() - 0.5) * (Math.PI / 6);

  const startNode = graph.get(startNodeId);
  const sLat = startNode.lat, sLon = startNode.lon;

  // Dijkstra from start — find nodes within 65% of targetDist
  const { dist: fwdDist, prev: fwdPrev } = dijkstra(graph, startNodeId, targetDist * 0.65);

  // Candidates: nodes at 35–65% of targetDist road-distance, in the right direction
  const minD = targetDist * 0.35, maxD = targetDist * 0.65;
  const candidates = [];
  for (const [id, d] of fwdDist) {
    if (id === startNodeId || d < minD || d > maxD) continue;
    const node = graph.get(id);
    if (!node || node.edges.length < 2) continue;
    const b = bearing(sLat, sLon, node.lat, node.lon);
    const diff = Math.abs(((b - outAngle) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    if (diff < Math.PI / 3) candidates.push({ id, d, diff }); // within 60° of target
  }

  if (candidates.length === 0) return null;

  // Prefer midpoints close to targetDist/2 road distance; pick randomly from top 10
  candidates.sort((a, b) => Math.abs(a.d - targetDist * 0.5) - Math.abs(b.d - targetDist * 0.5));
  const midpointId = candidates[Math.floor(rng() * Math.min(10, candidates.length))].id;
  const pathADist = fwdDist.get(midpointId);
  if (!Number.isFinite(pathADist)) return null;

  // Path A: startNodeId → midpointId (reconstruct from fwdPrev, then reverse)
  const rawA = reconstructPath(fwdPrev, midpointId, startNodeId);
  if (!rawA) return null;
  const pathA = [...rawA].reverse(); // [startNodeId, ..., midpointId]

  // Collect path A edges so path B must avoid them
  const pathAEdges = new Set();
  for (let i = 0; i < pathA.length - 1; i++) {
    pathAEdges.add(edgeKey(pathA[i], pathA[i + 1]));
  }

  // Path B: startNodeId → midpointId on entirely different edges
  const maxReturnDist = targetDist * 2.0 - pathADist;
  if (maxReturnDist <= 0) return null;
  const { dist: distB, prev: prevB } = dijkstra(graph, startNodeId, maxReturnDist, pathAEdges);
  const rawB = reconstructPath(prevB, midpointId, startNodeId);
  if (!rawB) return null;
  const pathB = [...rawB].reverse(); // [startNodeId, ..., midpointId]
  const pathBDist = distB.get(midpointId);
  const totalDist = pathADist + pathBDist;
  if (!Number.isFinite(pathBDist) || totalDist < targetDist * 0.4 || totalDist > targetDist * 2.0) {
    return null;
  }

  // Loop: pathA forward + pathB reversed (mid→start) with no shared edges
  const fullPath = [...pathA, ...[...pathB].reverse().slice(1)];
  return scoreRoute(graph, fullPath);
}

function scoreRoute(graph, path) {
  if (path.length < 3) return null;
  if (path[0] !== path[path.length - 1]) return null;

  // Reject any route that traverses the same physical road segment twice
  // (catches both forward+reverse overlap and true duplicate edges)
  const edgesSeen = new Set();
  for (let i = 0; i < path.length - 1; i++) {
    const key = edgeKey(path[i], path[i + 1]);
    if (edgesSeen.has(key)) return null;
    edgesSeen.add(key);
  }

  const coords = [];
  let totalDist = 0, weightedCurv = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const nodeA = graph.get(a);
    const matchingEdges = nodeA?.edges.filter((e) => e.to === b) ?? [];
    const e = matchingEdges.reduce(
      (best, candidate) => (!best || candidate.curviness > best.curviness ? candidate : best),
      null
    );
    if (!e) continue;

    totalDist += e.dist;
    weightedCurv += e.curviness * e.dist;

    if (e.segCoords) {
      // Use full road geometry (intermediate shape nodes included)
      if (i === 0) coords.push(...e.segCoords);
      else coords.push(...e.segCoords.slice(1));
    } else {
      // Fallback for graphs without segCoords (e.g., synthetic test graphs)
      if (i === 0) { const n = graph.get(a); if (n) coords.push([n.lat, n.lon]); }
      const n = graph.get(b); if (n) coords.push([n.lat, n.lon]);
    }
  }

  if (totalDist < 2) return null;

  return {
    id: Math.random().toString(36).slice(2),
    coords,
    totalDistance: totalDist,
    avgCurviness: weightedCurv / totalDist,
  };
}

export function findLoops(graph, startNodeId, targetDist, minCurviness, count = 5) {
  if (!graph.get(startNodeId)) return [];

  // If the chosen start node is in a tiny component, stop early so the caller
  // can prompt the user to move the search pin onto the main road network.
  const probe = dijkstra(graph, startNodeId, targetDist * 3);
  if (probe.dist.size < 10) return [];

  // Require routes to be at least 15% of target to avoid cluttering results
  // with tiny loops when a longer target was requested
  const minDist = targetDist * 0.15;

  const routes = [];
  for (let seed = 0; routes.length < count && seed < count * 50; seed++) {
    const route = buildLoop(graph, startNodeId, targetDist, seed);
    if (!route) continue;
    if (route.totalDistance < minDist) continue;
    if (route.avgCurviness < minCurviness) continue;

    const isDupe = routes.some(
      (r) =>
        Math.abs(r.totalDistance - route.totalDistance) / Math.max(r.totalDistance, 1) < 0.12 &&
        Math.abs(r.avgCurviness - route.avgCurviness) < 0.4
    );
    if (!isDupe) routes.push(route);
  }

  // Sort by combined score: curviness + closeness to target distance
  return routes
    .filter((route) => route.avgCurviness >= minCurviness)
    .sort((a, b) => {
    const scoreA = a.avgCurviness * 2 + Math.max(0, 1 - Math.abs(a.totalDistance - targetDist) / targetDist);
    const scoreB = b.avgCurviness * 2 + Math.max(0, 1 - Math.abs(b.totalDistance - targetDist) / targetDist);
    return scoreB - scoreA;
    });
}
