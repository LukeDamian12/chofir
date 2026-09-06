const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIRS = [path.join(ROOT, 'content', 'videos'), path.join(ROOT, 'content', 'directos')];
const DATA_DIR = path.join(ROOT, '_data');
const CACHE_FILE = path.join(DATA_DIR, 'platform-thumbnails.json');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}

function frontMatterValue(text, key) {
  const re = new RegExp(`^${key}:\\s*["']([^"']+)["']\\s*$`, 'm');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

async function jsonFetch(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'SoFirMoLo/1.0 thumbnail-fetcher',
        'Accept': 'application/json,text/plain,*/*',
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function odyseeParts(source) {
  const u = new URL(source);
  const pathName = decodeURIComponent(u.pathname.replace(/^\/+|\/+$/g, ''));
  const colon = pathName.lastIndexOf(':');
  if (colon < 1) return null;
  return { name: pathName.slice(0, colon), claimId: pathName.slice(colon + 1) };
}

async function fetchOdyseeThumbnail(source) {
  const parts = odyseeParts(source);
  if (!parts) return null;

  const endpoint = 'https://lighthouse.odysee.tv/search?s=' + encodeURIComponent(parts.name) +
    '&size=20&from=0&include=channel,thumbnail_url,title,description,duration,release_time&mediaType=video';
  const rows = await jsonFetch(endpoint);
  if (!Array.isArray(rows)) return null;

  const item = rows.find(row => String(row.claimId || '') === parts.claimId);
  const raw = item && item.thumbnail_url;
  if (!raw) return null;

  return 'https://thumbnails.odycdn.com/optimize/s:640:360/quality:85/plain/' + raw;
}

async function fetchBitchuteThumbnail(source) {
  const m = String(source).match(/bitchute\.com\/(?:video|embed)\/([^/?#]+)/i);
  if (!m) return null;
  const id = m[1];

  const data = await jsonFetch('https://api.bitchute.com/api/beta/search/videos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      offset: 0,
      limit: 20,
      query: id,
      sensitivity_id: 'normal',
      sort: 'new'
    })
  });

  const videos = data && Array.isArray(data.videos) ? data.videos : [];
  const item = videos.find(video => String(video.video_id || '') === id);
  return item && typeof item.thumbnail_url === 'string' ? item.thumbnail_url : null;
}

async function fetchThumbnail(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (host === 'odysee.com' || host.endsWith('.odysee.com')) return fetchOdyseeThumbnail(url);
  if (host === 'bitchute.com' || host.endsWith('.bitchute.com')) return fetchBitchuteThumbnail(url);
  return null;
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { cache = {}; }
  }

  const urls = new Set();
  for (const dir of CONTENT_DIRS) {
    for (const file of walk(dir)) {
      if (!file.endsWith('.md')) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const key of ['odysee', 'bitchute']) {
        const url = frontMatterValue(text, key);
        if (url) urls.add(url);
      }
    }
  }

  const pending = [...urls].filter(url => !cache[url]);
  console.log(`[SoFirMoLo] Miniaturas de plataforma: ${urls.size} URLs, ${pending.length} pendientes.`);

  let index = 0;
  const concurrency = 6;

  async function worker() {
    while (index < pending.length) {
      const url = pending[index++];
      try {
        const thumb = await fetchThumbnail(url);
        if (thumb) {
          cache[url] = thumb;
          console.log(`[thumb] OK ${url}`);
        } else {
          console.warn(`[thumb] Sin miniatura: ${url}`);
        }
      } catch (err) {
        console.warn(`[thumb] No se pudo obtener ${url}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, pending.length)) }, worker));
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  console.log(`[SoFirMoLo] Cache guardada: ${Object.keys(cache).length} miniaturas.`);
}

main().catch(err => {
  console.error('[SoFirMoLo] Error obteniendo miniaturas:', err);
  process.exitCode = 0;
});
