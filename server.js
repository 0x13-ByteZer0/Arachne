/* Arachne API — servidor REST (Node.js nativo, sem dependências).
 *
 * Expõe toda a base de conhecimento (táticas, técnicas, cadeias, grafo) para
 * consumo por SIEM/SOC, incluindo exportações STIX 2.1 e CSV.
 *
 * Variáveis de ambiente:
 *   ARACHNE_PORT      porta (padrão 8080)
 *   ARACHNE_API_KEY   se definido, exige autenticação Bearer em /api/*
 *   ARACHNE_RATE_LIMIT  requisições por janela por IP (padrão 120)
 *   ARACHNE_RATE_WINDOW janela em ms (padrão 60000)
 *
 * Uso:  node server.js
 */
'use strict';

const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const data = require('./lib/data');
const stix = require('./lib/stix');

const PORT = Number(process.env.ARACHNE_PORT || 8080);
const API_KEY = process.env.ARACHNE_API_KEY || '';
const RATE_LIMIT = Number(process.env.ARACHNE_RATE_LIMIT || 120);
const RATE_WINDOW = Number(process.env.ARACHNE_RATE_WINDOW || 60000);

const API_VERSION = '1.0.0';
const STARTED_AT = new Date().toISOString();

// ---------------------------------------------------------------------------
// Helpers de resposta
// ---------------------------------------------------------------------------

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...corsHeaders(),
    ...headers
  });
  res.end(body);
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8', headers = {}) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
    ...corsHeaders(),
    ...headers
  });
  res.end(text);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset'
  };
}

function notFound(res, message = 'Recurso não encontrado.') {
  sendJson(res, 404, { error: 'not_found', message });
}

function badRequest(res, message) {
  sendJson(res, 400, { error: 'bad_request', message });
}

// ---------------------------------------------------------------------------
// Rate limiting (janela fixa por IP, em memória)
// ---------------------------------------------------------------------------

const buckets = new Map();

function rateLimitHit(ip) {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + RATE_WINDOW };
    buckets.set(ip, bucket);
  }
  bucket.count += 1;
  return {
    limit: RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - bucket.count),
    reset: bucket.reset,
    allowed: bucket.count <= RATE_LIMIT
  };
}

// Limpeza periódica de buckets expirados.
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of buckets) if (now > bucket.reset) buckets.delete(ip);
}, RATE_WINDOW).unref();

// ---------------------------------------------------------------------------
// Autenticação opcional
// ---------------------------------------------------------------------------

function isAuthorized(req, url) {
  if (!API_KEY) return true;
  const header = req.headers['authorization'] || '';
  if (header.startsWith('Bearer ')) return safeEqual(header.slice(7), API_KEY);
  const apiKey = req.headers['x-api-key'] || url.searchParams.get('api_key');
  if (apiKey) return safeEqual(apiKey, API_KEY);
  return false;
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// ---------------------------------------------------------------------------
// Serializadores (shape de resposta da API)
// ---------------------------------------------------------------------------

function serializeTactic(tactic, withTechniques = false) {
  const base = {
    id: tactic.id,
    name: tactic.name,
    color: tactic.color,
    techniqueCount: (tactic.techniques || []).length
  };
  if (withTechniques) base.techniques = (tactic.techniques || []).map(serializeTechnique);
  return base;
}

function serializeTechnique(tech) {
  const out = {
    id: tech.id,
    name: tech.name,
    subs: tech.subs || [],
    desc: tech.desc || '',
    severity: tech.severity,
    severityLabel: ['Baixa', 'Média', 'Alta', 'Crítica'][tech.severity - 1] || '—',
    mitigations: tech.mitigations || [],
    references: tech.references || [],
    tactic: tech.tacticId ? { id: tech.tacticId, name: tech.tacticName, color: tech.tacticColor } : undefined
  };
  if (tech.example) out.example = tech.example;
  if (tech.detection && tech.detection.length) out.detection = tech.detection;
  if (tech.tools && tech.tools.length) out.tools = tech.tools;
  return out;
}

function serializeChain(chain) {
  return {
    id: chain.id,
    name: chain.name,
    description: chain.description,
    entry: chain.entry || null,
    techniques: chain.techniques || [],
    difficulty: chain.difficulty,
    timeframe: chain.timeframe,
    impact: chain.impact,
    stepCount: (chain.steps || []).length
  };
}

function serializeChainFull(chain) {
  return {
    ...serializeChain(chain),
    steps: (chain.steps || []).map((step) => ({
      order: step.order,
      technique: step.technique,
      action: step.action,
      description: step.description,
      duration: step.duration,
      mitigations: step.mitigations || [],
      techniqueDetail: data.load().techniqueIndex.get(step.technique)
        ? serializeTechnique(data.load().techniqueIndex.get(step.technique))
        : null
    }))
  };
}

// ---------------------------------------------------------------------------
// Filtros e paginação
// ---------------------------------------------------------------------------

function paginate(items, params) {
  const limit = Math.min(Number(params.get('limit')) || 100, 500);
  const offset = Math.max(Number(params.get('offset')) || 0, 0);
  const total = items.length;
  const dataSlice = items.slice(offset, offset + limit);
  return { data: dataSlice, pagination: { total, limit, offset, returned: dataSlice.length } };
}

function matchesQuery(text, q) {
  if (!q) return true;
  return String(text || '').toLowerCase().includes(q.toLowerCase());
}

// ---------------------------------------------------------------------------
// Handlers por rota
// ---------------------------------------------------------------------------

const handlers = {
  // --- Meta / health ---
  'GET /api/health': (req, res) => {
    sendJson(res, 200, { status: 'ok', service: 'arachne-api', version: API_VERSION, uptime: process.uptime() });
  },

  'GET /api/meta': (req, res) => {
    const { stats } = data.load();
    sendJson(res, 200, {
      service: 'arachne-api',
      version: API_VERSION,
      startedAt: STARTED_AT,
      stix: { version: stix.STIX_VERSION, spec: stix.SPEC_VERSION },
      stats,
      endpoints: [
        'GET /api/health',
        'GET /api/meta',
        'GET /api/tactics',
        'GET /api/tactics/:id',
        'GET /api/techniques',
        'GET /api/techniques/:id',
        'GET /api/techniques/:id/chains',
        'GET /api/techniques/:id/neighbors',
        'GET /api/chains',
        'GET /api/chains/:id',
        'GET /api/chains/:id/steps',
        'GET /api/chains/:id/techniques',
        'GET /api/graph',
        'GET /api/graph/path?from=&to=',
        'GET /api/graph/neighbors/:id',
        'GET /api/search?q=',
        'GET /api/export/stix',
        'GET /api/export/stix/chains/:id',
        'GET /api/export/csv/techniques',
        'GET /api/export/csv/chains',
        'GET /api/export/csv/steps'
      ]
    });
  },

  // --- Táticas ---
  'GET /api/tactics': (req, res, params) => {
    const { tactics } = data.load();
    const q = params.get('q');
    const filtered = tactics.filter((t) => !q || matchesQuery(t.name, q) || matchesQuery(t.id, q));
    sendJson(res, 200, { data: filtered.map((t) => serializeTactic(t)), count: filtered.length });
  },

  // --- Técnicas ---
  'GET /api/techniques': (req, res, params) => {
    const { techniqueIndex } = data.load();
    const q = params.get('q');
    const tactic = params.get('tactic');
    const severity = params.get('severity');
    const all = [...techniqueIndex.values()];
    const filtered = all.filter((tech) => {
      if (tactic && tech.tacticId !== tactic) return false;
      if (severity && tech.severity !== Number(severity)) return false;
      if (q && !(matchesQuery(tech.name, q) || matchesQuery(tech.id, q) || matchesQuery(tech.desc, q) ||
        (tech.subs || []).some((s) => matchesQuery(s, q)))) return false;
      return true;
    });
    const { data: page, pagination } = paginate(filtered, params);
    sendJson(res, 200, { data: page.map(serializeTechnique), count: filtered.length, pagination });
  },

  // --- Cadeias ---
  'GET /api/chains': (req, res, params) => {
    const { attackChains } = data.load();
    const q = params.get('q');
    const difficulty = params.get('difficulty');
    const filtered = attackChains.filter((c) => {
      if (difficulty && c.difficulty !== difficulty) return false;
      if (q && !(matchesQuery(c.name, q) || matchesQuery(c.id, q) || matchesQuery(c.description, q) ||
        matchesQuery(c.impact, q))) return false;
      return true;
    });
    const { data: page, pagination } = paginate(filtered, params);
    sendJson(res, 200, { data: page.map(serializeChain), count: filtered.length, pagination });
  },

  // --- Export STIX ---
  'GET /api/export/stix': (req, res) => {
    sendJson(res, 200, stix.buildBundle());
  }
};

// ---------------------------------------------------------------------------
// Rota principal (com parâmetros dinâmicos)
// ---------------------------------------------------------------------------

function handleApi(req, res, url) {
  const method = req.method;
  const segments = url.pathname.split('/').filter(Boolean); // ex.: ['api','techniques','W001']
  const params = url.searchParams;

  // /api/health e /api/meta
  if (segments[1] === 'health' && method === 'GET') return handlers['GET /api/health'](req, res, params);
  if (segments[1] === 'meta' && method === 'GET') return handlers['GET /api/meta'](req, res, params);

  // /api/tactics
  if (segments[1] === 'tactics') {
    if (method === 'GET' && !segments[2]) return handlers['GET /api/tactics'](req, res, params);
    if (method === 'GET' && segments[2]) {
      const { tacticIndex } = data.load();
      const tactic = tacticIndex.get(segments[2]);
      if (!tactic) return notFound(res, `Tática ${segments[2]} não encontrada.`);
      return sendJson(res, 200, serializeTactic(tactic, true));
    }
  }

  // /api/techniques
  if (segments[1] === 'techniques') {
    if (method === 'GET' && !segments[2]) return handlers['GET /api/techniques'](req, res, params);
    if (method === 'GET' && segments[2]) {
      const { techniqueIndex } = data.load();
      const tech = techniqueIndex.get(segments[2]);
      if (!tech) return notFound(res, `Técnica ${segments[2]} não encontrada.`);
      if (segments[3] === 'chains') {
        const chains = data.relatedChains(segments[2]);
        return sendJson(res, 200, { data: chains.map(serializeChain), count: chains.length });
      }
      if (segments[3] === 'neighbors') {
        const nb = data.neighbors(segments[2]);
        return sendJson(res, 200, {
          id: segments[2],
          inbound: nb.inbound,
          outbound: nb.outbound,
          inboundDetail: nb.inbound.map((id) => techniqueIndex.get(id) ? serializeTechnique(techniqueIndex.get(id)) : null),
          outboundDetail: nb.outbound.map((id) => techniqueIndex.get(id) ? serializeTechnique(techniqueIndex.get(id)) : null)
        });
      }
      return sendJson(res, 200, {
        ...serializeTechnique(tech),
        relatedChains: data.relatedChains(segments[2]).map(serializeChain),
        neighbors: data.neighbors(segments[2])
      });
    }
  }

  // /api/chains
  if (segments[1] === 'chains') {
    if (method === 'GET' && !segments[2]) return handlers['GET /api/chains'](req, res, params);
    if (method === 'GET' && segments[2]) {
      const { chainIndex } = data.load();
      const chain = chainIndex.get(segments[2]);
      if (!chain) return notFound(res, `Cadeia ${segments[2]} não encontrada.`);
      if (segments[3] === 'steps') {
        return sendJson(res, 200, {
          chainId: chain.id,
          data: (chain.steps || []).map((step) => ({
            order: step.order,
            technique: step.technique,
            action: step.action,
            description: step.description,
            duration: step.duration,
            mitigations: step.mitigations || []
          }))
        });
      }
      if (segments[3] === 'techniques') {
        const { techniqueIndex } = data.load();
        const techs = (chain.techniques || [])
          .map((id) => techniqueIndex.get(id))
          .filter(Boolean)
          .map(serializeTechnique);
        return sendJson(res, 200, { chainId: chain.id, data: techs, count: techs.length });
      }
      return sendJson(res, 200, serializeChainFull(chain));
    }
  }

  // /api/graph
  if (segments[1] === 'graph') {
    if (method === 'GET' && !segments[2]) {
      const { techniqueIndex, edges, stats } = data.load();
      const nodes = [...techniqueIndex.values()].map((tech) => ({
        id: tech.id,
        name: tech.name,
        severity: tech.severity,
        tactic: tech.tacticId,
        tacticName: tech.tacticName,
        color: tech.tacticColor
      }));
      return sendJson(res, 200, { nodes, edges, stats });
    }
    if (method === 'GET' && segments[2] === 'path') {
      const from = params.get('from');
      const to = params.get('to');
      if (!from || !to) return badRequest(res, 'Parâmetros "from" e "to" são obrigatórios.');
      const { techniqueIndex } = data.load();
      if (!techniqueIndex.has(from) || !techniqueIndex.has(to)) {
        return badRequest(res, 'Um ou ambos os ids de técnica não existem.');
      }
      const path = data.findShortestPath(from, to);
      return sendJson(res, 200, {
        from,
        to,
        found: path.length > 0,
        hops: path.length > 0 ? path.length - 1 : 0,
        path,
        pathDetail: path.map((id) => techniqueIndex.get(id) ? serializeTechnique(techniqueIndex.get(id)) : null)
      });
    }
    if (method === 'GET' && segments[2] === 'neighbors' && segments[3]) {
      const { techniqueIndex } = data.load();
      if (!techniqueIndex.has(segments[3])) return notFound(res, `Técnica ${segments[3]} não encontrada.`);
      const nb = data.neighbors(segments[3]);
      return sendJson(res, 200, {
        id: segments[3],
        inbound: nb.inbound,
        outbound: nb.outbound
      });
    }
  }

  // /api/search
  if (segments[1] === 'search' && method === 'GET') {
    const q = (params.get('q') || '').trim();
    if (!q) return badRequest(res, 'Parâmetro "q" é obrigatório.');
    const { techniqueIndex, tactics, attackChains } = data.load();
    const techniques = [...techniqueIndex.values()]
      .filter((t) => matchesQuery(t.name, q) || matchesQuery(t.id, q) || matchesQuery(t.desc, q) ||
        (t.subs || []).some((s) => matchesQuery(s, q)))
      .slice(0, 50)
      .map(serializeTechnique);
    const tacticsMatch = tactics.filter((t) => matchesQuery(t.name, q) || matchesQuery(t.id, q))
      .map((t) => serializeTactic(t));
    const chains = attackChains
      .filter((c) => matchesQuery(c.name, q) || matchesQuery(c.id, q) || matchesQuery(c.description, q) ||
        matchesQuery(c.impact, q))
      .slice(0, 50)
      .map(serializeChain);
    return sendJson(res, 200, {
      query: q,
      techniques: { count: techniques.length, data: techniques },
      tactics: { count: tacticsMatch.length, data: tacticsMatch },
      chains: { count: chains.length, data: chains }
    });
  }

  // /api/export
  if (segments[1] === 'export') {
    if (method === 'GET' && segments[2] === 'stix') {
      if (segments[3] === 'chains' && segments[4]) {
        const bundle = stix.buildChainBundle(segments[4]);
        if (!bundle) return notFound(res, `Cadeia ${segments[4]} não encontrada.`);
        return sendJson(res, 200, bundle);
      }
      return handlers['GET /api/export/stix'](req, res, params);
    }
    if (method === 'GET' && segments[2] === 'csv') {
      if (segments[3] === 'techniques') return exportTechniquesCsv(res);
      if (segments[3] === 'chains') return exportChainsCsv(res);
      if (segments[3] === 'steps') return exportStepsCsv(res);
    }
  }

  notFound(res);
}

// ---------------------------------------------------------------------------
// Exportações CSV
// ---------------------------------------------------------------------------

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach((row) => lines.push(row.map(csvEscape).join(',')));
  return lines.join('\r\n') + '\r\n';
}

function exportTechniquesCsv(res) {
  const { techniqueIndex } = data.load();
  const rows = [...techniqueIndex.values()].map((t) => [
    t.id, t.name, t.tacticId, t.tacticName, t.severity,
    (t.subs || []).join('; '), (t.mitigations || []).join('; '), (t.references || []).join('; ')
  ]);
  const csv = toCsv(['id', 'name', 'tactic_id', 'tactic_name', 'severity', 'subtechniques', 'mitigations', 'references'], rows);
  sendText(res, 200, csv, 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="arachne-techniques.csv"' });
}

function exportChainsCsv(res) {
  const { attackChains } = data.load();
  const rows = attackChains.map((c) => [
    c.id, c.name, c.difficulty, c.timeframe, c.impact,
    (c.techniques || []).join('; '),
    c.entry ? c.entry.label : '',
    c.entry ? c.entry.description : ''
  ]);
  const csv = toCsv(['id', 'name', 'difficulty', 'timeframe', 'impact', 'techniques', 'entry_label', 'entry_description'], rows);
  sendText(res, 200, csv, 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="arachne-chains.csv"' });
}

function exportStepsCsv(res) {
  const { attackChains } = data.load();
  const rows = [];
  attackChains.forEach((c) => {
    (c.steps || []).forEach((s) => {
      rows.push([
        c.id, c.name, s.order, s.technique, s.action, s.duration,
        (s.mitigations || []).join('; ')
      ]);
    });
  });
  const csv = toCsv(['chain_id', 'chain_name', 'step_order', 'technique', 'action', 'duration', 'mitigations'], rows);
  sendText(res, 200, csv, 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="arachne-steps.csv"' });
}

// ---------------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  // Rotas de API
  if (url.pathname.startsWith('/api/')) {
    const ip = req.socket.remoteAddress || 'unknown';
    const rl = rateLimitHit(ip);
    res.setHeader('X-RateLimit-Limit', String(rl.limit));
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    res.setHeader('X-RateLimit-Reset', String(rl.reset));

    if (!rl.allowed) {
      return sendJson(res, 429, { error: 'rate_limited', message: 'Muitas requisições. Tente novamente em instantes.' });
    }
    if (!isAuthorized(req, url)) {
      return sendJson(res, 401, { error: 'unauthorized', message: 'API key inválida ou ausente. Use Authorization: Bearer <key>.' });
    }
    try {
      return handleApi(req, res, url);
    } catch (err) {
      console.error('[arachne-api] erro ao processar', url.pathname, err);
      return sendJson(res, 500, { error: 'internal_error', message: 'Erro interno ao processar a requisição.' });
    }
  }

  // Fora da API: redireciona para o site estático (informa que a API é em /api).
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return sendJson(res, 200, {
      service: 'arachne-api',
      message: 'API REST ativa. Consulte GET /api/meta para a lista de endpoints.',
      docs: 'API.md'
    });
  }

  notFound(res, 'Use /api/* para a API REST. O site estático é servido separadamente.');
});

server.listen(PORT, () => {
  const { stats } = data.load();
  console.log(`[arachne-api] ouvindo em http://localhost:${PORT}`);
  console.log(`[arachne-api] base: ${stats.tactics} táticas, ${stats.techniques} técnicas, ${stats.chains} cadeias, ${stats.edges} arestas`);
  console.log(`[arachne-api] auth: ${API_KEY ? 'ATIVA (ARACHNE_API_KEY)' : 'desativada'}`);
  console.log(`[arachne-api] rate limit: ${RATE_LIMIT} req / ${RATE_WINDOW / 1000}s por IP`);
});

module.exports = server;
