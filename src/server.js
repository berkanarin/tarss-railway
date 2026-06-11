import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(rootDir, 'public');
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw);
}

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function cleanText(value = '') {
  return decodeXml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstTag(xml, names) {
  for (const name of names) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i');
    const match = xml.match(re);
    if (match) {
      return decodeXml(match[1]);
    }
  }
  return '';
}

function firstAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i');
  return decodeXml(xml.match(re)?.[1] || '');
}

function itemBlocks(xml) {
  const blocks = [];
  for (const re of [/<item\b[\s\S]*?<\/item>/gi, /<entry\b[\s\S]*?<\/entry>/gi]) {
    for (const match of xml.matchAll(re)) {
      blocks.push(match[0]);
    }
  }
  return blocks;
}

function articleId(url, title) {
  const input = `${url}|${title}`;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function extractImage(block) {
  return firstAttr(block, 'media:content', 'url') ||
    firstAttr(block, 'media:thumbnail', 'url') ||
    firstAttr(block, 'enclosure', 'url') ||
    (block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || '');
}

async function fetchFeed(source, maxItems) {
  const response = await fetch(source.url, {
    headers: {
      'user-agent': 'TA RSS Railway/1.0',
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
    },
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();
  return itemBlocks(xml).slice(0, maxItems).map((block) => {
    const title = cleanText(firstTag(block, ['title']));
    const atomLink = firstAttr(block, 'link', 'href');
    const url = cleanText(firstTag(block, ['link'])) || atomLink;
    const summary = cleanText(firstTag(block, ['description', 'summary', 'content:encoded', 'content'])).slice(0, 700);
    const published = cleanText(firstTag(block, ['pubDate', 'published', 'updated'])) || new Date().toISOString();
    return {
      id: articleId(url, title),
      title,
      url,
      summary,
      source: source.name,
      source_url: source.url,
      category: source.category || 'general',
      language: source.language || 'tr',
      priority: source.priority || 'medium',
      published,
      fetched_at: new Date().toISOString(),
      image_url: extractImage(block),
      categories: [],
      category_scores: {},
      scores: {},
      overall_score: null,
      selected: false
    };
  }).filter((item) => item.title && item.url);
}

function buildScorePrompt(article, categories, blacklist) {
  const categoryLines = categories.map((category) => {
    const keywords = Array.isArray(category.keywords) ? category.keywords.join(', ') : '';
    return `- ${category.name} [Oncelik: ${category.priority || 'medium'}]: ${keywords}`;
  }).join('\n');
  const blocked = [
    ...(blacklist?.competitors || []),
    ...(blacklist?.banned || []),
    ...(blacklist?.topics || [])
  ].filter(Boolean).join(', ');

  return `Kurumsal RSS bulteni icin haberi analiz et. Sadece JSON don.

Haber:
Baslik: ${article.title}
Ozet: ${(article.summary || '').slice(0, 700)}
Kaynak: ${article.source}
URL: ${article.url}

Kategoriler:
${categoryLines}

Yasakli kelimeler/konular: ${blocked || 'Yok'}

JSON formati:
{
  "turkish_title": "...",
  "turkish_summary": "...",
  "category_scores": {"Kategori": 8},
  "scores": {"relevance": 8, "quality": 7, "actionability": 6, "timeliness": 9},
  "reasoning": "..."
}

Kurallar:
- category_scores icinde sadece listedeki kategori adlarini kullan.
- Ilgisiz, magazin, suc, dedikodu veya blacklist eslesmesi varsa category_scores bos object olsun.
- Puanlar 1-10 arasinda olsun.`;
}

function parseJsonResponse(text) {
  const cleaned = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1));
  }
  return JSON.parse(cleaned);
}

async function scoreArticle(article, categories, blacklist) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return localScoreArticle(article, categories, blacklist);
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildScorePrompt(article, categories, blacklist) }] }],
      generationConfig: { temperature: 0.25, maxOutputTokens: 4000 }
    }),
    signal: AbortSignal.timeout(45000)
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Gemini HTTP ${response.status}`);
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  const result = parseJsonResponse(text);
  const categoryNames = new Set(categories.map((category) => category.name));
  const categoryScores = Object.fromEntries(
    Object.entries(result.category_scores || {}).filter(([key]) => categoryNames.has(key))
  );
  const scoreValues = Object.values(result.scores || {}).filter((value) => Number.isFinite(Number(value))).map(Number);
  const qualityAvg = scoreValues.length ? scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length : 0;
  const maxCategory = Object.values(categoryScores).reduce((max, value) => Math.max(max, Number(value) || 0), 0);
  const overall = maxCategory ? Math.round((maxCategory * .7 + qualityAvg * .3) * 100) / 100 : 0;

  return {
    ...article,
    turkish_title: result.turkish_title || article.title,
    turkish_summary: result.turkish_summary || article.summary,
    categories: Object.keys(categoryScores).sort((a, b) => (categoryScores[b] || 0) - (categoryScores[a] || 0)),
    category_scores: categoryScores,
    scores: result.scores || {},
    overall_score: overall,
    reasoning: result.reasoning || '',
    scored_at: new Date().toISOString()
  };
}

function localScoreArticle(article, categories, blacklist) {
  const text = `${article.title || ''} ${article.summary || ''}`.toLowerCase();
  const blocked = [
    ...(blacklist?.competitors || []),
    ...(blacklist?.banned || []),
    ...(blacklist?.topics || [])
  ].some((word) => word && text.includes(String(word).toLowerCase()));

  const category_scores = {};
  if (!blocked) {
    for (const category of categories) {
      const hits = (category.keywords || []).filter((keyword) => text.includes(String(keyword).toLowerCase())).length;
      if (hits > 0) {
        const priorityBoost = category.priority === 'high' ? 2 : category.priority === 'medium' ? 1 : 0;
        category_scores[category.name] = Math.min(10, 5 + hits + priorityBoost);
      }
    }
  }

  const categoriesSorted = Object.keys(category_scores).sort((a, b) => category_scores[b] - category_scores[a]);
  const maxCategory = categoriesSorted.length ? category_scores[categoriesSorted[0]] : 0;
  const scores = {
    relevance: maxCategory,
    quality: maxCategory ? 6 : 0,
    actionability: maxCategory ? 5 : 0,
    timeliness: 7
  };
  const qualityAvg = Object.values(scores).reduce((sum, value) => sum + value, 0) / 4;
  const overall = maxCategory ? Math.round((maxCategory * .7 + qualityAvg * .3) * 100) / 100 : 0;

  return {
    ...article,
    turkish_title: article.turkish_title || article.title,
    turkish_summary: article.turkish_summary || article.summary,
    categories: categoriesSorted,
    category_scores,
    scores,
    overall_score: overall,
    reasoning: blocked ? 'Blacklist eslesmesi nedeniyle skor 0.' : 'Yerel anahtar kelime skorlama fallback sonucu.',
    scored_at: new Date().toISOString()
  };
}

async function handleApi(req, res, pathname) {
  try {
    if (req.method === 'POST' && pathname === '/api/rss/fetch') {
      const body = await readJson(req);
      const sources = Array.isArray(body.sources) ? body.sources.filter((source) => source.enabled !== false) : [];
      const maxItems = Math.min(Number(body.maxItems || 20), 100);
      const settled = await Promise.allSettled(sources.map((source) => fetchFeed(source, maxItems)));
      const items = [];
      const errors = [];
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          items.push(...result.value);
        } else {
          errors.push({ source: sources[index]?.name || sources[index]?.url || 'unknown', error: result.reason.message });
        }
      });
      const seen = new Set();
      const unique = items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      sendJson(res, 200, { items: unique, errors, total: unique.length, sources_ok: settled.length - errors.length, sources_fail: errors.length });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/ai/score-batch') {
      const body = await readJson(req);
      const articles = Array.isArray(body.articles) ? body.articles : [];
      const categories = Array.isArray(body.categories) ? body.categories : [];
      const limit = Math.min(Number(body.limit || articles.length), 25);
      const scored = [];
      const errors = [];
      for (const article of articles.slice(0, limit)) {
        try {
          scored.push(await scoreArticle(article, categories, body.blacklist || {}));
        } catch (error) {
          errors.push({ id: article.id, title: article.title, error: error.message });
        }
      }
      sendJson(res, errors.length && !scored.length ? 400 : 200, { scored, errors });
      return;
    }

    sendJson(res, 404, { error: 'api_not_implemented' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'server_error' });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const normalized = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(publicDir, normalized);

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(body);
  } catch {
    const fallback = await readFile(join(publicDir, 'index.html'));
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    });
    res.end(fallback);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'tarss-railway',
      mode: 'browser-first',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url.pathname);
    return;
  }

  await serveStatic(req, res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`TA RSS Railway Version listening on http://localhost:${port}`);
});
