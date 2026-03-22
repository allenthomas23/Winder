/**
 * Routing tests simulating Mason, OH default location.
 * Uses a large synthetic graph (~300 nodes) to mimic real OSM density.
 * Run: node test-routing.mjs
 */

// ── Helpers ───────────────────────────────────────────────────────────────────
function distMiles(lat1,lon1,lat2,lon2){
  const R=3958.8,r=Math.PI/180,dLat=(lat2-lat1)*r,dLon=(lon2-lon1)*r;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function edgeKey(a,b){return a<b?`${a}|${b}`:`${b}|${a}`;}
function seededRng(seed){let s=((seed+1)*0x9e3779b9)>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/0x100000000;};}
function weightedPick(items,wFn,rng){const ws=items.map(wFn),total=ws.reduce((a,b)=>a+b,0);if(total<=0)return items[Math.floor(rng()*items.length)];let r=rng()*total;for(let i=0;i<items.length;i++){r-=ws[i];if(r<=0)return items[i];}return items[items.length-1];}

class MinHeap{constructor(){this.h=[];}push(item){this.h.push(item);let i=this.h.length-1;while(i>0){const p=(i-1)>>1;if(this.h[p].d<=this.h[i].d)break;[this.h[p],this.h[i]]=[this.h[i],this.h[p]];i=p;}}pop(){const top=this.h[0],last=this.h.pop();if(this.h.length>0){this.h[0]=last;let i=0;while(true){let m=i,l=2*i+1,r=2*i+2,n=this.h.length;if(l<n&&this.h[l].d<this.h[m].d)m=l;if(r<n&&this.h[r].d<this.h[m].d)m=r;if(m===i)break;[this.h[m],this.h[i]]=[this.h[i],this.h[m]];i=m;}}return top;}get size(){return this.h.length;}}

function dijkstra(graph,startId,maxDist,excludeEdges=null){
  const dist=new Map([[startId,0]]),prev=new Map(),heap=new MinHeap();
  heap.push({id:startId,d:0});
  while(heap.size>0){const{id:u,d:du}=heap.pop();if(du>(dist.get(u)??Infinity)||du>maxDist)continue;const node=graph.get(u);if(!node)continue;for(const e of node.edges){if(excludeEdges&&excludeEdges.has(edgeKey(u,e.to)))continue;const nd=du+e.dist;if(nd<(dist.get(e.to)??Infinity)){dist.set(e.to,nd);prev.set(e.to,u);heap.push({id:e.to,d:nd});}}}
  return{dist,prev};
}
function reconstructPath(prev,fromId,toId){const path=[fromId];let cur=fromId;for(let i=0;i<10000;i++){if(cur===toId)return path;const p=prev.get(cur);if(p===undefined)return null;path.push(p);cur=p;}return cur===toId?path:null;}

function buildLoop(graph,startNodeId,targetDist,seed){
  const rng=seededRng(seed);
  const path=[startNodeId],usedEdges=new Set();
  let totalDist=0,current=startNodeId;
  const walkTarget=targetDist*(0.50+rng()*0.25);
  let steps=0;
  while(totalDist<walkTarget&&steps++<6000){
    const node=graph.get(current);if(!node)break;
    const candidates=node.edges.filter(e=>graph.has(e.to)&&!usedEdges.has(edgeKey(current,e.to)));
    if(candidates.length===0)break;
    const chosen=weightedPick(candidates,e=>Math.max(0.1,e.curviness)**2*(0.2+rng()*0.8),rng);
    usedEdges.add(edgeKey(current,chosen.to));path.push(chosen.to);totalDist+=chosen.dist;current=chosen.to;
  }
  if(current===startNodeId)return scoreRoute(graph,path);
  const{prev:retPrev}=dijkstra(graph,current,Infinity,usedEdges);
  const returnToStart=reconstructPath(retPrev,startNodeId,current);
  if(!returnToStart)return null;
  const returnReversed=[...returnToStart].reverse();
  for(let i=1;i<returnReversed.length;i++){if(usedEdges.has(edgeKey(returnReversed[i-1],returnReversed[i])))return null;}
  return scoreRoute(graph,[...path,...returnReversed.slice(1)]);
}

function scoreRoute(graph,path){
  if(path.length<5||path[0]!==path[path.length-1])return null;
  const seen=new Set();
  for(let i=1;i<path.length;i++){const key=edgeKey(path[i-1],path[i]);if(seen.has(key))return null;seen.add(key);}
  const coords=[];let totalDist=0,weightedCurv=0;
  for(let i=0;i<path.length;i++){const n=graph.get(path[i]);if(!n)continue;coords.push([n.lat,n.lon]);if(i>0){const p=graph.get(path[i-1]);const e=p?.edges.find(e=>e.to===path[i]);if(e){totalDist+=e.dist;weightedCurv+=e.curviness*e.dist;}}}
  if(totalDist<2)return null;
  return{id:'t',coords,totalDistance:totalDist,avgCurviness:weightedCurv/totalDist};
}

function findLoops(graph,startNodeId,targetDist,minCurv,count=5){
  if(!graph.get(startNodeId))return[];
  const probe=dijkstra(graph,startNodeId,targetDist*3);
  if(probe.dist.size<30){let bestId=startNodeId,bestSize=probe.dist.size,checked=0;for(const[id]of graph){if(checked++>300)break;const d=dijkstra(graph,id,targetDist*3);if(d.dist.size>bestSize){bestSize=d.dist.size;bestId=id;}}if(bestId!==startNodeId)startNodeId=bestId;}
  const routes=[];
  for(let seed=0;routes.length<count&&seed<count*15;seed++){const route=buildLoop(graph,startNodeId,targetDist,seed);if(!route)continue;const isDupe=routes.some(r=>Math.abs(r.totalDistance-route.totalDistance)/Math.max(r.totalDistance,1)<0.1&&Math.abs(r.avgCurviness-route.avgCurviness)<0.5);if(!isDupe)routes.push(route);}
  return routes.sort((a,b)=>b.avgCurviness-a.avgCurviness);
}

function findNearest(graph,lat,lon){let n=null,m=Infinity;for(const[id,nd]of graph){if(nd.edges.length<2)continue;const d=(nd.lat-lat)**2+(nd.lon-lon)**2;if(d<m){m=d;n=id;}}return n||[...graph.keys()][0];}

// ── Build large Mason OH synthetic graph (~300 nodes, 20x20 grid + diagonals) ─
// Simulates the road density of secondary/tertiary/unclassified around Mason OH
function buildMasonGraph() {
  const graph = new Map();
  const CENTER_LAT = 39.3592, CENTER_LON = -84.3099;
  const STEP = 0.008; // ~0.55 miles per grid cell
  const ROWS = 18, COLS = 18;

  // Grid nodes
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = r * COLS + c;
      const lat = CENTER_LAT + (r - ROWS/2) * STEP;
      const lon = CENTER_LON + (c - COLS/2) * STEP;
      graph.set(id, { lat, lon, edges: [] });
    }
  }

  function connect(a, b, curviness, name='road') {
    const na = graph.get(a), nb = graph.get(b);
    if (!na || !nb) return;
    const dist = distMiles(na.lat, na.lon, nb.lat, nb.lon);
    na.edges.push({ to: b, dist, curviness, name, highway: 'secondary', speedLimit: 45 });
    nb.edges.push({ to: a, dist, curviness, name, highway: 'secondary', speedLimit: 45 });
  }

  // Horizontal roads — curviness varies by row (mimicking real road variation)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      const a = r * COLS + c, b = r * COLS + c + 1;
      // Rows near center are more curvy (simulates curvy backroads)
      const distFromCenter = Math.abs(r - ROWS/2);
      const curv = Math.max(2, Math.min(9, 9 - distFromCenter * 0.7));
      connect(a, b, Math.round(curv));
    }
  }

  // Vertical roads
  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = r * COLS + c, b = (r+1) * COLS + c;
      const distFromCenter = Math.abs(c - COLS/2);
      const curv = Math.max(2, Math.min(9, 9 - distFromCenter * 0.7));
      connect(a, b, Math.round(curv));
    }
  }

  // Add some diagonal shortcuts (simulates curvy roads cutting across grid)
  const diagonalPairs = [
    [2,2, 3,3], [3,3, 4,4], [5,5, 6,6], [6,6, 7,7],
    [3,12, 4,13], [7,3, 8,4], [10,10, 11,11],
    [5,2, 6,3], [8,12, 9,13], [4,7, 5,8],
    [12,5, 13,6], [14,8, 15,9], [2,14, 3,15],
  ];
  for (const [r1,c1,r2,c2] of diagonalPairs) {
    if (r1<ROWS&&r2<ROWS&&c1<COLS&&c2<COLS) {
      connect(r1*COLS+c1, r2*COLS+c2, 8, 'curvy diagonal');
    }
  }

  return graph;
}

// ── Test helpers ──────────────────────────────────────────────────────────────
let passed=0, failed=0;
function assert(cond, msg) {
  if(cond){console.log(`  ✓ ${msg}`);passed++;}
  else{console.error(`  ✗ FAIL: ${msg}`);failed++;process.exitCode=1;}
}

// ── Run tests ─────────────────────────────────────────────────────────────────
console.log('\n=== Winder Tests — Mason, OH default location ===\n');

const graph = buildMasonGraph();
const startId = findNearest(graph, 39.3592, -84.3099);
const startNode = graph.get(startId);

assert(graph.size >= 200, `Graph size sufficient: ${graph.size} nodes`);
assert(startId !== null, `Start node found near Mason, OH center`);
assert(startNode.edges.length >= 2, `Start node is well-connected (${startNode.edges.length} edges)`);

// Dijkstra reach
const { dist } = dijkstra(graph, startId, 9999);
assert(dist.size > 100, `Dijkstra from Mason center reaches ${dist.size} nodes`);

// ── Test loop generation at various distances ──
for (const targetMi of [20, 40, 60]) {
  console.log(`\n-- Target: ${targetMi} mi --`);
  const routes = findLoops(graph, startId, targetMi, 3, 5);
  console.log(`  Found: ${routes.length} routes`);
  for (const [i,r] of routes.entries()) {
    const first=r.coords[0], last=r.coords[r.coords.length-1];
    console.log(`  Route ${i+1}: ${r.totalDistance.toFixed(1)} mi, curviness ${r.avgCurviness.toFixed(1)}, ${r.coords.length} pts`);
    assert(Math.abs(first[0]-last[0])<0.0001&&Math.abs(first[1]-last[1])<0.0001, `Route ${i+1} is a closed loop`);
    assert(r.totalDistance>=2, `Route ${i+1} has meaningful length (${r.totalDistance.toFixed(1)} mi)`);
  }
  assert(routes.length>=3, `At least 3 routes found for ${targetMi}-mi target (got ${routes.length})`);

  // No edge reuse
  for (const [i,r] of routes.entries()) {
    const pathNodes = r.coords; // we can only check via coords now
    // Verify via edgeKey uniqueness (approximate using coord pairs as keys)
    const edgesSeen = new Set();
    let overlap = false;
    for (let j=1; j<pathNodes.length; j++) {
      const key = `${pathNodes[j-1][0].toFixed(6)},${pathNodes[j-1][1].toFixed(6)}->${pathNodes[j][0].toFixed(6)},${pathNodes[j][1].toFixed(6)}`;
      const revKey = `${pathNodes[j][0].toFixed(6)},${pathNodes[j][1].toFixed(6)}->${pathNodes[j-1][0].toFixed(6)},${pathNodes[j-1][1].toFixed(6)}`;
      if (edgesSeen.has(key)||edgesSeen.has(revKey)) { overlap=true; break; }
      edgesSeen.add(key); edgesSeen.add(revKey);
    }
    assert(!overlap, `Route ${i+1} has NO overlapping road segments`);
  }
}

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
