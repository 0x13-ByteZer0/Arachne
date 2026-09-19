/* Arachne API — camada de dados.
 * Carrega a base de conhecimento (techniques.js), indexa técnicas/táticas/cadeias
 * e replica a lógica de grafo usada pelo front-end (caminho mais curto, vizinhos,
 * cadeias relacionadas). Sem dependências externas.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DATA_FILE = path.join(__dirname, '..', 'techniques.js');

let cache = null;

/**
 * Carrega e indexa a base de conhecimento. O resultado é cacheado em memória.
 * @returns {{
 *   tactics: Array,
 *   attackChains: Array,
 *   techniqueIndex: Map<string, object>,
 *   tacticIndex: Map<string, object>,
 *   chainIndex: Map<string, object>,
 *   edges: Array<{source:string,target:string,chains:string[]}>,
 *   adjacency: Map<string, Array<{to:string,chains:string[]}>>,
 *   stats: object
 * }}
 */
function load() {
  if (cache) return cache;

  const source = fs.readFileSync(DATA_FILE, 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  // techniques.js declara `const tactics` e `const attackChains`.
  // Adicionamos um export explícito para capturar os valores no sandbox.
  vm.runInContext(source + '\n;globalThis.__export = { tactics, attackChains };', sandbox, {
    filename: 'techniques.js'
  });

  const { tactics, attackChains } = sandbox.__export;

  // --- Índices ---
  const techniqueIndex = new Map();
  const tacticIndex = new Map();
  const chainIndex = new Map();

  tactics.forEach((tactic) => {
    tacticIndex.set(tactic.id, tactic);
    (tactic.techniques || []).forEach((tech) => {
      techniqueIndex.set(tech.id, { ...tech, tacticId: tactic.id, tacticName: tactic.name, tacticColor: tactic.color });
    });
  });

  (attackChains || []).forEach((chain) => chainIndex.set(chain.id, chain));

  // --- Grafo (arestas direcionadas a partir das sequências de técnicas) ---
  const edgeMap = new Map();
  (attackChains || []).forEach((chain) => {
    (chain.techniques || []).forEach((techId, index, sequence) => {
      if (!techniqueIndex.has(techId)) return;
      const nextId = sequence[index + 1];
      if (!nextId || !techniqueIndex.has(nextId)) return;
      const key = `${techId}>${nextId}`;
      if (!edgeMap.has(key)) edgeMap.set(key, { source: techId, target: nextId, chains: [] });
      edgeMap.get(key).chains.push(chain.id);
    });
  });

  const edges = [...edgeMap.values()];

  // Adjacência (saídas) para BFS.
  const adjacency = new Map();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source).push({ to: edge.target, chains: edge.chains });
  });

  const stats = {
    tactics: tactics.length,
    techniques: techniqueIndex.size,
    chains: (attackChains || []).length,
    edges: edges.length
  };

  cache = {
    tactics,
    attackChains: attackChains || [],
    techniqueIndex,
    tacticIndex,
    chainIndex,
    edges,
    adjacency,
    stats
  };
  return cache;
}

/**
 * Caminho mais curto (BFS) entre duas técnicas, seguindo as arestas direcionadas
 * derivadas das cadeias. Retorna a lista de ids (inclusive origem e destino) ou [].
 * @param {string} startId
 * @param {string} endId
 * @returns {string[]}
 */
function findShortestPath(startId, endId) {
  const { techniqueIndex, adjacency } = load();
  if (!techniqueIndex.has(startId) || !techniqueIndex.has(endId)) return [];
  if (startId === endId) return [startId];

  const queue = [startId];
  const previous = new Map([[startId, null]]);
  while (queue.length) {
    const current = queue.shift();
    if (current === endId) break;
    (adjacency.get(current) || []).forEach(({ to }) => {
      if (!previous.has(to)) {
        previous.set(to, current);
        queue.push(to);
      }
    });
  }
  if (!previous.has(endId)) return [];
  const path = [];
  for (let current = endId; current !== null; current = previous.get(current)) path.unshift(current);
  return path;
}

/**
 * Cadeias que contêm uma técnica.
 * @param {string} techniqueId
 * @returns {Array}
 */
function relatedChains(techniqueId) {
  const { attackChains } = load();
  return attackChains.filter((chain) => (chain.techniques || []).includes(techniqueId));
}

/**
 * Vizinhos diretos (entrada e saída) de uma técnica.
 * @param {string} techniqueId
 * @returns {{inbound: Array<string>, outbound: Array<string>}}
 */
function neighbors(techniqueId) {
  const { edges } = load();
  const inbound = edges.filter((e) => e.target === techniqueId).map((e) => e.source);
  const outbound = edges.filter((e) => e.source === techniqueId).map((e) => e.target);
  return { inbound, outbound };
}

/**
 * Normaliza uma lista de ids de técnica (remove vazios, duplicados consecutivos e ids inválidos).
 * @param {string[]} ids
 * @returns {string[]}
 */
function normalizePath(ids) {
  const { techniqueIndex } = load();
  return (ids || []).filter((id, index, sequence) => id && id !== sequence[index - 1] && techniqueIndex.has(id));
}

module.exports = {
  load,
  findShortestPath,
  relatedChains,
  neighbors,
  normalizePath
};
