import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5174';
const bugs = [];
const notes = [];

function log(msg) { console.log(msg); notes.push(msg); }
function bug(msg) { console.error('🐛 BUG: ' + msg); bugs.push(msg); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  geolocation: { latitude: 39.3592, longitude: -84.3099 }, // Mason, OH
  permissions: ['geolocation'],
  viewport: { width: 1280, height: 800 },
});
const page = await ctx.newPage();

// Capture console errors
page.on('console', msg => {
  if (msg.type() === 'error') bug(`Console error: ${msg.text()}`);
});
page.on('pageerror', err => bug(`Page error: ${err.message}`));

// ── Load the page ─────────────────────────────────────────────────────────────
log('\n── Loading page...');
await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(1000);

const title = await page.title();
log(`Page title: "${title}"`);
if (!title.toLowerCase().includes('winder')) bug('Page title does not mention Winder');

// ── Check header ──────────────────────────────────────────────────────────────
log('\n── Checking header...');
const logoName = await page.locator('.logo-name').textContent().catch(() => null);
log(`Logo text: "${logoName}"`);
if (logoName !== 'Winder') bug('Logo text is not "Winder"');

const tagline = await page.locator('.app-tagline').textContent().catch(() => null);
log(`Tagline: "${tagline}"`);

// ── Check filter panel ────────────────────────────────────────────────────────
log('\n── Checking filter panel...');
const panelVisible = await page.locator('.panel-body').isVisible();
log(`Filter panel body visible: ${panelVisible}`);
if (!panelVisible) bug('Filter panel body is not visible on load');

// Check sliders exist
const sliders = await page.locator('.slider').count();
log(`Sliders found: ${sliders}`);
if (sliders < 3) bug(`Expected ≥3 sliders, found ${sliders}`);

// Check the search button
const btnText = await page.locator('.search-btn').textContent().catch(() => null);
log(`Search button text: "${btnText?.trim()}"`);

// ── Test collapse/expand ──────────────────────────────────────────────────────
log('\n── Testing filter panel collapse/expand...');
await page.locator('.collapse-btn').click();
await page.waitForTimeout(300);
const hiddenAfterCollapse = await page.locator('.panel-body').isHidden();
log(`Panel body hidden after collapse: ${hiddenAfterCollapse}`);
if (!hiddenAfterCollapse) bug('Filter panel did not collapse');

// Can the button still be clicked to expand?
const collapseBtn = page.locator('.collapse-btn');
const btnVisible = await collapseBtn.isVisible();
log(`Collapse button still visible: ${btnVisible}`);
if (!btnVisible) bug('Collapse button not visible after collapsing — cannot re-expand!');

await collapseBtn.click();
await page.waitForTimeout(300);
const visibleAfterExpand = await page.locator('.panel-body').isVisible();
log(`Panel body visible after re-expand: ${visibleAfterExpand}`);
if (!visibleAfterExpand) bug('Filter panel did not re-expand after clicking toggle again');

// ── Check map loaded ──────────────────────────────────────────────────────────
log('\n── Checking map...');
const mapExists = await page.locator('.leaflet-map').count();
log(`Leaflet map containers: ${mapExists}`);
if (mapExists === 0) bug('Leaflet map container not found');

const mapTiles = await page.locator('.leaflet-tile-container').count();
log(`Map tile containers: ${mapTiles}`);
if (mapTiles === 0) bug('Map tiles not loading');

// ── Click Find Loop Courses and watch network ─────────────────────────────────
log('\n── Clicking Find Loop Courses...');

let overpassCalled = false;
let overpassStatus = null;
let overpassResponseSize = 0;

page.on('response', async (resp) => {
  if (resp.url().includes('overpass-api.de')) {
    overpassCalled = true;
    overpassStatus = resp.status();
    try {
      const body = await resp.text();
      overpassResponseSize = body.length;
      const parsed = JSON.parse(body);
      log(`  Overpass response: status=${overpassStatus}, elements=${parsed.elements?.length ?? '?'}`);
      const nodeCount = parsed.elements?.filter(e=>e.type==='node').length ?? 0;
      const wayCount = parsed.elements?.filter(e=>e.type==='way').length ?? 0;
      log(`  Ways: ${wayCount}, Nodes: ${nodeCount}`);
      if (wayCount === 0) bug('Overpass returned 0 ways — no roads found for this area/filter');
      if (nodeCount === 0) bug('Overpass returned 0 nodes — graph will be empty');
    } catch { log(`  Overpass response: status=${overpassStatus}, size=${overpassResponseSize} (non-JSON?)`); }
  }
});

await page.locator('.search-btn').click();

// Watch for status text changes
const statusTexts = [];
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(1000);
  const btnTxt = await page.locator('.search-btn').textContent().catch(() => '');
  const loading = await page.locator('.search-btn.loading').count();
  if (loading > 0 && btnTxt) statusTexts.push(btnTxt.trim());
  if (loading === 0) { log(`  Done loading after ~${i+1}s`); break; }
  if (i === 29) bug('Search button still in loading state after 30s (likely stuck)');
}

if (statusTexts.length > 0) log(`  Status messages seen: ${[...new Set(statusTexts)].join(' → ')}`);
if (!overpassCalled) bug('Overpass API was never called — fetch may have failed silently');

// ── Check results ─────────────────────────────────────────────────────────────
log('\n── Checking results...');
await page.waitForTimeout(1000);

const resultCount = await page.locator('.result-count').textContent().catch(() => null);
log(`Result count text: "${resultCount}"`);

const routeItems = await page.locator('.route-item').count();
log(`Route items in sidebar: ${routeItems}`);

const errorBanner = await page.locator('.error-banner').textContent().catch(() => null);
if (errorBanner) bug(`Error banner shown: "${errorBanner}"`);

if (routeItems === 0 && !errorBanner) {
  bug('No routes found and no error shown — routing algorithm produced nothing');
}

// ── If routes found, click one ────────────────────────────────────────────────
if (routeItems > 0) {
  log(`\n── Clicking first route...`);
  await page.locator('.route-item').first().click();
  await page.waitForTimeout(500);
  const polylines = await page.locator('.leaflet-overlay-pane path').count();
  log(`Polylines on map after click: ${polylines}`);
  if (polylines === 0) bug('No polylines rendered on map after selecting a route');

  // Check for start/end marker
  const circles = await page.locator('.leaflet-overlay-pane circle').count();
  log(`Circle markers on map: ${circles}`);
}

// ── Screenshot ────────────────────────────────────────────────────────────────
await page.screenshot({ path: '/tmp/winder-e2e.png', fullPage: false });
log('\n── Screenshot saved to /tmp/winder-e2e.png');

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════');
console.log(`Bugs found: ${bugs.length}`);
bugs.forEach((b, i) => console.error(`  ${i+1}. ${b}`));
if (bugs.length === 0) console.log('  ✓ No bugs detected');
console.log('══════════════════════════════\n');

await browser.close();
