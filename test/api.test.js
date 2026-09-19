/* Arachne API — testes de fumaça (smoke tests).
 * Sobe o servidor em uma porta efêmera e valida os principais endpoints.
 * Uso: node test/api.test.js
 */
'use strict';

process.env.ARACHNE_PORT = '8123';
process.env.ARACHNE_RATE_LIMIT = '10000';

const assert = require('assert');
const server = require('../server');

const BASE = 'http://localhost:8123';
let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

async function get(path, headers) {
  const res = await fetch(BASE + path, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) { /* não-JSON */ }
  return { status: res.status, headers: res.headers, text, json };
}

(async () => {
  // Aguarda o servidor aceitar conexões.
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE + '/api/health'); break; } catch (_) { await new Promise((r) => setTimeout(r, 100)); }
  }

  console.log('Arachne API — smoke tests\n');

  await check('GET /api/health retorna 200 e status ok', async () => {
    const r = await get('/api/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.status, 'ok');
  });

  await check('GET /api/meta expõe stats consistentes', async () => {
    const r = await get('/api/meta');
    assert.strictEqual(r.status, 200);
    assert.ok(r.json.stats.tactics >= 20);
    assert.ok(r.json.stats.techniques >= 100);
    assert.ok(r.json.stats.chains >= 40);
    assert.ok(Array.isArray(r.json.endpoints));
  });

  await check('GET /api/tactics lista táticas com contagem', async () => {
    const r = await get('/api/tactics');
    assert.strictEqual(r.status, 200);
    assert.ok(r.json.count > 0);
    assert.ok(r.json.data[0].id);
  });

  await check('GET /api/tactics/:id retorna tática com técnicas', async () => {
    const list = await get('/api/tactics');
    const id = list.json.data[0].id;
    const r = await get(`/api/tactics/${id}`);
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.json.techniques));
  });

  await check('GET /api/techniques pagina e filtra por severidade', async () => {
    const all = await get('/api/techniques');
    assert.strictEqual(all.status, 200);
    assert.ok(all.json.pagination.total >= 100);
    const sev4 = await get('/api/techniques?severity=4');
    assert.ok(sev4.json.data.every((t) => t.severity === 4));
  });

  await check('GET /api/techniques/:id retorna detalhe + cadeias + vizinhos', async () => {
    const r = await get('/api/techniques/W008');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.json.relatedChains));
    assert.ok(r.json.neighbors);
  });

  await check('GET /api/techniques/:id/chains lista cadeias relacionadas', async () => {
    const r = await get('/api/techniques/W008/chains');
    assert.strictEqual(r.status, 200);
    assert.ok(r.json.count >= 1);
  });

  await check('GET /api/chains filtra por dificuldade', async () => {
    const r = await get('/api/chains?difficulty=Avancado');
    assert.strictEqual(r.status, 200);
    assert.ok(r.json.data.every((c) => c.difficulty === 'Avancado'));
  });

  await check('GET /api/chains/:id retorna entry + steps com mitigations', async () => {
    const r = await get('/api/chains/CHAIN-004');
    assert.strictEqual(r.status, 200);
    assert.ok(r.json.entry && r.json.entry.label);
    assert.ok(r.json.steps.every((s) => Array.isArray(s.mitigations) && s.mitigations.length >= 2));
  });

  await check('GET /api/chains/:id/steps retorna os passos', async () => {
    const r = await get('/api/chains/CHAIN-004/steps');
    assert.strictEqual(r.status, 200);
    assert.ok(r.json.data.length >= 2);
  });

  await check('GET /api/graph retorna nós e arestas', async () => {
    const r = await get('/api/graph');
    assert.strictEqual(r.status, 200);
    assert.ok(r.json.nodes.length >= 100);
    assert.ok(r.json.edges.length > 0);
  });

  await check('GET /api/graph/path calcula caminho mais curto', async () => {
    const r = await get('/api/graph/path?from=W001&to=W022');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.found, true);
    assert.strictEqual(r.json.path[0], 'W001');
    assert.strictEqual(r.json.path[r.json.path.length - 1], 'W022');
  });

  await check('GET /api/graph/path sem parâmetros retorna 400', async () => {
    const r = await get('/api/graph/path');
    assert.strictEqual(r.status, 400);
  });

  await check('GET /api/search encontra resultados', async () => {
    const r = await get('/api/search?q=xss');
    assert.strictEqual(r.status, 200);
    assert.ok(r.json.techniques.count >= 1);
  });

  await check('GET /api/export/stix gera bundle válido', async () => {
    const r = await get('/api/export/stix');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.type, 'bundle');
    assert.ok(r.json.objects.length > 100);
    const types = new Set(r.json.objects.map((o) => o.type));
    assert.ok(types.has('attack-pattern'));
    assert.ok(types.has('campaign'));
  });

  await check('GET /api/export/stix/chains/:id gera bundle da cadeia', async () => {
    const r = await get('/api/export/stix/chains/CHAIN-004');
    assert.strictEqual(r.status, 200);
    assert.ok(r.json.objects.some((o) => o.type === 'campaign'));
  });

  await check('GET /api/export/csv/techniques retorna CSV', async () => {
    const r = await get('/api/export/csv/techniques');
    assert.strictEqual(r.status, 200);
    assert.ok(r.headers.get('content-type').includes('text/csv'));
    assert.ok(r.text.startsWith('id,name,'));
  });

  await check('GET /api/export/csv/chains retorna CSV', async () => {
    const r = await get('/api/export/csv/chains');
    assert.strictEqual(r.status, 200);
    assert.ok(r.text.split('\r\n').length > 40);
  });

  await check('GET /api/export/csv/steps retorna CSV', async () => {
    const r = await get('/api/export/csv/steps');
    assert.strictEqual(r.status, 200);
    assert.ok(r.text.startsWith('chain_id,chain_name,'));
  });

  await check('Rota inexistente retorna 404', async () => {
    const r = await get('/api/techniques/W999');
    assert.strictEqual(r.status, 404);
    assert.strictEqual(r.json.error, 'not_found');
  });

  console.log(`\nResultado: ${passed} passaram, ${failed} falharam.`);
  server.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('Erro fatal nos testes:', err);
  server.close();
  process.exit(1);
});
