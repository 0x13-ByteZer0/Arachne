/* Arachne API — exportação STIX 2.1.
 * Converte a base de conhecimento em um bundle STIX 2.1 compatível com o padrão
 * MITRE ATT&CK (attack-pattern + x_mitre_*), para ingestão em SIEM/SOC
 * (Splunk, Elastic, MISP, TheHive, OpenCTI, etc.).
 */
'use strict';

const crypto = require('crypto');
const { load } = require('./data');

const STIX_VERSION = '2.1';
const SPEC_VERSION = '2.1';
const NAMESPACE = 'arachne';

/**
 * Gera um UUID v5 determinístico a partir de um namespace e de um nome.
 * Garante ids estáveis entre execuções (mesmo objeto => mesmo id).
 * @param {string} name
 * @returns {string}
 */
function uuid5(name) {
  // Namespace URL (RFC 4122)
  const ns = crypto.createHash('sha1').update('6ba7b811-9dad-11d1-80b4-00c04fd430c8').digest();
  const hash = crypto.createHash('sha1').update(Buffer.concat([ns, Buffer.from(name, 'utf8')])).digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Cria o objeto base de um SDO STIX.
 * @param {string} type
 * @param {string} name
 * @param {object} extra
 * @returns {object}
 */
function sdo(type, name, extra = {}) {
  const id = `${type}--${uuid5(`${NAMESPACE}:${type}:${name}`)}`;
  return {
    type,
    id,
    created: nowIso(),
    modified: nowIso(),
    ...extra
  };
}

/**
 * Converte uma tática em attack-pattern (x_mitre_tactic_id).
 */
function tacticToStix(tactic) {
  return sdo('attack-pattern', tactic.id, {
    name: tactic.name,
    description: `Tática ${tactic.id} — ${tactic.name}.`,
    x_mitre_version: '1.1',
    x_mitre_tactic_id: tactic.id,
    x_mitre_tactic: tactic.id,
    x_mitre_is_subtechnique: false
  });
}

/**
 * Converte uma técnica em attack-pattern (x_mitre_technique_id).
 */
function techniqueToStix(tech) {
  const obj = sdo('attack-pattern', tech.id, {
    name: tech.name,
    description: tech.desc || '',
    x_mitre_version: '1.1',
    x_mitre_technique_id: tech.id,
    x_mitre_tactic: tech.tacticId,
    x_mitre_is_subtechnique: false,
    x_arachne_severity: tech.severity,
    x_arachne_subtechniques: tech.subs || [],
    x_arachne_mitigations: tech.mitigations || [],
    x_arachne_references: tech.references || []
  });
  if (tech.detection && tech.detection.length) obj.x_arachne_detection = tech.detection;
  if (tech.tools && tech.tools.length) obj.x_arachne_tools = tech.tools;
  return obj;
}

/**
 * Converte uma cadeia de ataque em campaign, com referências ordenadas às técnicas.
 */
function chainToStix(chain) {
  const refs = (chain.techniques || []).map((id) => `attack-pattern--${uuid5(`${NAMESPACE}:attack-pattern:${id}`)}`);
  return sdo('campaign', chain.id, {
    name: chain.name,
    description: chain.description || '',
    x_mitre_version: '1.1',
    x_arachne_chain_id: chain.id,
    x_arachne_difficulty: chain.difficulty,
    x_arachne_timeframe: chain.timeframe,
    x_arachne_impact: chain.impact,
    x_arachne_entry: chain.entry ? { label: chain.entry.label, description: chain.entry.description } : undefined,
    x_arachne_steps: (chain.steps || []).map((step) => ({
      order: step.order,
      technique: step.technique,
      action: step.action,
      description: step.description,
      duration: step.duration,
      mitigations: step.mitigations || []
    })),
    object_refs: refs
  });
}

/**
 * Gera um bundle STIX 2.1 completo com todas as táticas, técnicas e cadeias.
 * @returns {object}
 */
function buildBundle() {
  const { tactics, attackChains, techniqueIndex } = load();
  const objects = [];

  tactics.forEach((tactic) => objects.push(tacticToStix(tactic)));
  [...techniqueIndex.values()].forEach((tech) => objects.push(techniqueToStix(tech)));
  attackChains.forEach((chain) => objects.push(chainToStix(chain)));

  return {
    type: 'bundle',
    id: `bundle--${uuid5(`${NAMESPACE}:bundle:${nowIso()}`)}`,
    objects
  };
}

/**
 * Gera um bundle STIX 2.1 contendo apenas uma cadeia e as técnicas/táticas que ela usa.
 * @param {string} chainId
 * @returns {object|null}
 */
function buildChainBundle(chainId) {
  const { chainIndex, techniqueIndex, tacticIndex } = load();
  const chain = chainIndex.get(chainId);
  if (!chain) return null;

  const objects = [];
  const usedTactics = new Set();
  (chain.techniques || []).forEach((id) => {
    const tech = techniqueIndex.get(id);
    if (!tech) return;
    objects.push(techniqueToStix(tech));
    usedTactics.add(tech.tacticId);
  });
  usedTactics.forEach((tacticId) => {
    const tactic = tacticIndex.get(tacticId);
    if (tactic) objects.push(tacticToStix(tactic));
  });
  objects.push(chainToStix(chain));

  return {
    type: 'bundle',
    id: `bundle--${uuid5(`${NAMESPACE}:bundle:${chainId}:${nowIso()}`)}`,
    objects
  };
}

module.exports = { buildBundle, buildChainBundle, uuid5, STIX_VERSION, SPEC_VERSION };
