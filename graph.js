/* Arachne Attack Graph: canvas renderer with drag, zoom, filters and attack paths. */
const graphState = {
  nodes: [], edges: [], chains: [],
  tacticFilter: 'all', search: '', activeChain: null,
  mode: 'graph', startNode: null, endNode: null, path: [],
  scale: 1, panX: 0, panY: 0, dragging: false, dragNode: null,
  pointer: { x: 0, y: 0 }, animation: 0
};

const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
const graphArea = document.getElementById('graph-area');
const tooltip = document.getElementById('tooltip');
const severityColors = { 4: '#f87171', 3: '#fb923c', 2: '#fbbf24', 1: '#60a5fa' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
}

function buildGraphData() {
  const nodeMap = new Map();
  tactics.forEach(tactic => tactic.techniques.forEach((tech, index) => {
    nodeMap.set(tech.id, {
      id: tech.id, tech, tactic, index,
      x: 0, y: 0, vx: 0, vy: 0, radius: 16,
      hidden: false, match: true
    });
  }));

  const chainData = typeof attackChains === 'undefined' ? [] : attackChains;
  const edgeMap = new Map();
  chainData.forEach(chain => {
    (chain.techniques || []).forEach((techId, index, sequence) => {
      if (!nodeMap.has(techId)) return;
      const nextId = sequence[index + 1];
      if (!nextId || !nodeMap.has(nextId)) return;
      const key = `${techId}>${nextId}`;
      if (!edgeMap.has(key)) edgeMap.set(key, { source: techId, target: nextId, chains: [] });
      edgeMap.get(key).chains.push(chain.id);
    });
  });

  graphState.nodes = [...nodeMap.values()];
  graphState.edges = [...edgeMap.values()];
  graphState.chains = chainData;
  graphState.nodes.forEach((node, index) => {
    const angle = index * 2.39996;
    const radius = 80 + Math.sqrt(index + 1) * 25;
    node.x = Math.cos(angle) * radius;
    node.y = Math.sin(angle) * radius;
  });
  document.getElementById('hud-nodes').textContent = graphState.nodes.length;
  document.getElementById('hud-edges').textContent = graphState.edges.length;
  document.getElementById('hud-chains').textContent = graphState.chains.length;
  document.getElementById('tactic-count').textContent = tactics.length;
  document.getElementById('chain-count').textContent = graphState.chains.length;
  buildTacticList();
  buildChainList();
  buildLegend();
  applyFilters();
}

function buildTacticList() {
  const list = document.getElementById('tactic-list');
  list.innerHTML = '';
  const all = document.createElement('div');
  all.className = 'tactic-item active';
  all.dataset.tactic = 'all';
  all.innerHTML = '<span class="dot" style="color:#a78bfa;background:#a78bfa"></span><span class="tname">Todas as táticas</span><span class="tnum">' + graphState.nodes.length + '</span>';
  all.onclick = () => setTacticFilter('all');
  list.appendChild(all);
  tactics.forEach(tactic => {
    const item = document.createElement('div');
    item.className = 'tactic-item';
    item.dataset.tactic = tactic.id;
    item.innerHTML = `<span class="dot" style="color:${tactic.color};background:${tactic.color}"></span><span class="tname">${escapeHtml(tactic.name)}</span><span class="tnum">${tactic.techniques.length}</span>`;
    item.onclick = () => setTacticFilter(tactic.id);
    list.appendChild(item);
  });
}

function buildChainList() {
  const list = document.getElementById('chain-list');
  list.innerHTML = '';
  graphState.chains.forEach(chain => {
    const item = document.createElement('div');
    item.className = 'chain-item';
    item.dataset.chain = chain.id;
    item.innerHTML = `<div class="c-name">${escapeHtml(chain.name)}</div><div class="c-meta">${escapeHtml(chain.difficulty)} · ${escapeHtml(chain.impact || '')}</div>`;
    item.onclick = () => selectChain(chain.id);
    list.appendChild(item);
  });
}

function buildLegend() {
  const legend = document.getElementById('legend-items');
  legend.innerHTML = '';
  tactics.slice(0, 8).forEach(tactic => {
    legend.insertAdjacentHTML('beforeend', `<div class="lg-item"><span class="lg-dot" style="background:${tactic.color}"></span>${escapeHtml(tactic.name)}</div>`);
  });
  legend.insertAdjacentHTML('beforeend', '<div class="lg-item"><span class="lg-line" style="border-color:#a78bfa"></span>relação de cadeia</div>');
}

function setTacticFilter(tacticId) {
  graphState.tacticFilter = tacticId;
  graphState.activeChain = null;
  graphState.path = [];
  document.querySelectorAll('.tactic-item').forEach(item => item.classList.toggle('active', item.dataset.tactic === tacticId));
  document.querySelectorAll('.chain-item').forEach(item => item.classList.remove('active'));
  applyFilters();
}

function applyFilters() {
  const query = graphState.search.trim().toLowerCase();
  graphState.nodes.forEach(node => {
    const haystack = `${node.id} ${node.tech.name} ${node.tech.desc} ${(node.tech.subs || []).join(' ')}`.toLowerCase();
    node.match = (!query || haystack.includes(query)) && (graphState.tacticFilter === 'all' || node.tactic.id === graphState.tacticFilter);
    node.hidden = !node.match;
  });
  const visible = graphState.nodes.filter(node => node.match).length;
  document.getElementById('search-count').textContent = query ? `${visible}/${graphState.nodes.length}` : graphState.nodes.length;
  draw();
}

function setMode(mode) {
  graphState.mode = mode;
  graphState.startNode = null;
  graphState.endNode = null;
  graphState.path = [];
  document.getElementById('btn-mode-graph').classList.toggle('primary', mode === 'graph');
  document.getElementById('btn-mode-path').classList.toggle('primary', mode === 'path');
  document.getElementById('mode-note').innerHTML = mode === 'path'
    ? 'Selecione o <b>nó de origem</b> e depois o <b>nó de destino</b> para encontrar o caminho mais curto.'
    : 'Clique em um <b>nó</b> para ver detalhes. Arraste para mover, use a roda do mouse para zoom.';
  draw();
}

function selectChain(chainId) {
  graphState.activeChain = graphState.chains.find(chain => chain.id === chainId) || null;
  graphState.path = graphState.activeChain ? graphState.activeChain.techniques : [];
  document.querySelectorAll('.chain-item').forEach(item => item.classList.toggle('active', item.dataset.chain === chainId));
  if (graphState.activeChain) showChainDetails(graphState.activeChain);
  draw();
}

function findNode(id) { return graphState.nodes.find(node => node.id === id); }
function edgeKey(source, target) { return `${source}>${target}`; }

function findShortestPath(startId, endId) {
  const queue = [startId];
  const previous = new Map([[startId, null]]);
  while (queue.length) {
    const current = queue.shift();
    if (current === endId) break;
    graphState.edges.filter(edge => edge.source === current).forEach(edge => {
      if (!previous.has(edge.target)) { previous.set(edge.target, current); queue.push(edge.target); }
    });
  }
  if (!previous.has(endId)) return [];
  const path = [];
  for (let current = endId; current !== null; current = previous.get(current)) path.unshift(current);
  return path;
}

function selectNode(node) {
  if (graphState.mode === 'path') {
    if (!graphState.startNode || graphState.endNode) {
      graphState.startNode = node.id;
      graphState.endNode = null;
      graphState.path = [node.id];
      showPathPrompt(node, 'origem selecionada');
    } else {
      graphState.endNode = node.id;
      graphState.path = findShortestPath(graphState.startNode, graphState.endNode);
      if (graphState.path.length) showPathDetails(graphState.path);
      else showPathPrompt(node, 'nenhum caminho direcionado encontrado');
    }
  } else {
    showTechniqueDetails(node);
  }
  draw();
}

function showTechniqueDetails(node) {
  const tech = node.tech;
  const color = severityColors[tech.severity];
  const chainTags = graphState.chains.filter(chain => (chain.techniques || []).includes(node.id));
  document.getElementById('detail-empty').style.display = 'none';
  const content = document.getElementById('detail-content');
  content.style.display = 'block';
  content.innerHTML = `
    <div class="d-id">${escapeHtml(tech.id)}</div>
    <div class="d-title" style="color:${color}">${escapeHtml(tech.name)}</div>
    <div class="d-badges"><span class="badge" style="color:${node.tactic.color};border-color:${node.tactic.color}55">${escapeHtml(node.tactic.name)}</span><span class="badge" style="color:${color};border-color:${color}55">${['','Baixa','Média','Alta','Crítica'][tech.severity]}</span></div>
    <div class="d-section"><div class="d-section-title">Descrição</div><div class="d-desc">${escapeHtml(tech.desc)}</div></div>
    <div class="d-section"><div class="d-section-title">Severidade</div><div class="sev-meter">${[1,2,3,4].map(level => `<div class="sev-bar"><div class="sev-fill" style="width:${level <= tech.severity ? 100 : 0}%;background:${color}"></div></div>`).join('')}</div></div>
    <div class="d-section"><div class="d-section-title">Sub-técnicas</div><div class="tag-list">${(tech.subs || []).map(sub => `<span class="tag">${escapeHtml(sub)}</span>`).join('')}</div></div>
    <div class="d-section"><div class="d-section-title">Mitigações</div><div class="tag-list">${(tech.mitigations || []).map(item => `<span class="tag green">${escapeHtml(item)}</span>`).join('')}</div></div>
    <div class="d-section"><div class="d-section-title">Cadeias relacionadas</div><div class="tag-list">${chainTags.length ? chainTags.map(chain => `<span class="tag chain" data-chain-detail="${escapeHtml(chain.id)}">${escapeHtml(chain.id)}</span>`).join('') : '<span class="d-desc">Nenhuma cadeia cadastrada.</span>'}</div></div>
  `;
  content.querySelectorAll('[data-chain-detail]').forEach(item => item.onclick = () => selectChain(item.dataset.chainDetail));
}

function showChainDetails(chain) {
  document.getElementById('detail-empty').style.display = 'none';
  const content = document.getElementById('detail-content');
  content.style.display = 'block';
  content.innerHTML = `
    <div class="d-id">${escapeHtml(chain.id)}</div>
    <div class="d-title" style="color:var(--accent2)">${escapeHtml(chain.name)}</div>
    <div class="chain-meta"><div class="cm"><div class="k">Dificuldade</div><div class="v">${escapeHtml(chain.difficulty)}</div></div><div class="cm"><div class="k">Prazo</div><div class="v">${escapeHtml(chain.timeframe)}</div></div></div>
    <div class="d-section"><div class="d-section-title">Objetivo</div><div class="d-desc">${escapeHtml(chain.description)}</div></div>
    <div class="d-section"><div class="d-section-title">Caminho no grafo</div><div class="path-steps">${(chain.steps || []).map(step => renderPathStep(step)).join('')}</div></div>
    <div class="d-section"><div class="d-section-title">Impacto</div><div class="d-desc">${escapeHtml(chain.impact)}</div></div>`;
}

function renderPathStep(step) {
  const node = findNode(step.technique);
  const color = node ? node.tactic.color : 'var(--accent)';
  return `<div class="path-step"><div class="rail"><div class="node-dot" style="background:${color}">${escapeHtml(step.order)}</div><div class="line"></div></div><div class="p-body"><div class="p-tech">${escapeHtml(step.technique)}</div><div class="p-name">${escapeHtml(step.action)}</div><div class="p-action">${escapeHtml(step.description || '')}</div><div class="p-dur">${escapeHtml(step.duration || '')}</div></div></div>`;
}

function showPathPrompt(node, status) {
  document.getElementById('detail-empty').style.display = 'none';
  const content = document.getElementById('detail-content');
  content.style.display = 'block';
  content.innerHTML = `<div class="d-id">CAMINHO DE ATAQUE</div><div class="d-title" style="color:${node.tactic.color}">${escapeHtml(node.tech.name)}</div><div class="d-desc">${escapeHtml(status)}. Agora selecione outro nó para calcular o caminho direcionado pelas cadeias.</div>`;
}

function showPathDetails(path) {
  document.getElementById('detail-empty').style.display = 'none';
  const content = document.getElementById('detail-content');
  content.style.display = 'block';
  content.innerHTML = `<div class="d-id">CAMINHO DE ATAQUE</div><div class="d-title" style="color:var(--accent2)">${path.length - 1} salto(s)</div><div class="d-section"><div class="d-section-title">Rota encontrada</div><div class="path-steps">${path.map((id, index) => { const node = findNode(id); return renderPathStep({ order: index + 1, technique: id, action: node ? node.tech.name : id, description: node ? node.tactic.name : '', duration: '' }); }).join('')}</div></div>`;
}

function clearSelection() {
  graphState.activeChain = null; graphState.startNode = null; graphState.endNode = null; graphState.path = [];
  document.querySelectorAll('.chain-item').forEach(item => item.classList.remove('active'));
  document.getElementById('detail-empty').style.display = 'flex';
  document.getElementById('detail-content').style.display = 'none';
  draw();
}

function resizeCanvas() {
  const rect = graphArea.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, rect.width * ratio);
  canvas.height = Math.max(1, rect.height * ratio);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (!graphState.animation) { graphState.panX = rect.width / 2; graphState.panY = rect.height / 2; }
  draw();
}

function toScreen(node) { return { x: node.x * graphState.scale + graphState.panX, y: node.y * graphState.scale + graphState.panY }; }
function toWorld(x, y) { return { x: (x - graphState.panX) / graphState.scale, y: (y - graphState.panY) / graphState.scale }; }

function drawGrid(width, height) {
  ctx.save();
  ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, width, height);
  const step = 32 * graphState.scale;
  const offsetX = graphState.panX % step, offsetY = graphState.panY % step;
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
  for (let x = offsetX; x < width; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = offsetY; y < height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  ctx.restore();
}

function draw() {
  if (!canvas.width) return;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  drawGrid(width, height);
  ctx.save();
  graphState.edges.forEach(edge => {
    const source = findNode(edge.source), target = findNode(edge.target);
    if (!source || !target || (source.hidden && target.hidden)) return;
    const a = toScreen(source), b = toScreen(target);
    const active = graphState.path.includes(edge.source) && graphState.path.includes(edge.target) && graphState.path.indexOf(edge.target) === graphState.path.indexOf(edge.source) + 1;
    const focusedPath = graphState.activeChain || graphState.path.length > 1;
    if (focusedPath && !active) return;
    ctx.strokeStyle = active ? '#a78bfa' : 'rgba(167,139,250,0.22)';
    ctx.lineWidth = active ? 3 : 1;
    drawArrow(a.x, a.y, b.x, b.y, source.radius * graphState.scale, active);
  });
  graphState.nodes.forEach(node => {
    if (node.hidden && !graphState.path.includes(node.id)) return;
    const point = toScreen(node);
    const active = graphState.path.includes(node.id) || node.id === graphState.startNode || node.id === graphState.endNode;
    const color = node.tactic.color;
    const radius = (active ? 19 : 15) * Math.min(graphState.scale, 1.4);
    ctx.beginPath(); ctx.arc(point.x, point.y, radius + (active ? 7 : 3), 0, Math.PI * 2);
    ctx.fillStyle = active ? color + '22' : 'rgba(255,255,255,0.025)'; ctx.fill();
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.28)'; ctx.lineWidth = active ? 2 : 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(9, 10 * Math.min(graphState.scale, 1.3))}px ${getComputedStyle(document.documentElement).getPropertyValue('--mono') || 'monospace'}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(node.id.replace('W',''), point.x, point.y);
    if (graphState.scale > 0.8 || active) {
      ctx.fillStyle = active ? '#fff' : 'rgba(232,232,240,0.78)';
      ctx.font = `${active ? 600 : 500} ${Math.max(10, 11 * Math.min(graphState.scale, 1.3))}px ${getComputedStyle(document.documentElement).getPropertyValue('--sans') || 'sans-serif'}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(node.tech.name.length > 25 ? `${node.tech.name.slice(0, 23)}…` : node.tech.name, point.x, point.y + radius + 7);
    }
  });
  ctx.restore();
}

function drawArrow(x1, y1, x2, y2, gap, active) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
  if (!length) return;
  const ux = dx / length, uy = dy / length;
  const startX = x1 + ux * gap, startY = y1 + uy * gap;
  const endX = x2 - ux * gap, endY = y2 - uy * gap;
  ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
  const size = active ? 8 : 6;
  ctx.fillStyle = active ? '#a78bfa' : 'rgba(167,139,250,0.45)';
  ctx.beginPath(); ctx.moveTo(endX, endY); ctx.lineTo(endX - ux * size - uy * size * .6, endY - uy * size + ux * size * .6); ctx.lineTo(endX - ux * size + uy * size * .6, endY - uy * size - ux * size * .6); ctx.closePath(); ctx.fill();
}

function nodeAt(x, y) {
  for (let index = graphState.nodes.length - 1; index >= 0; index--) {
    const node = graphState.nodes[index];
    if (node.hidden && !graphState.path.includes(node.id)) continue;
    const point = toScreen(node);
    if (Math.hypot(point.x - x, point.y - y) <= 22 * Math.max(1, graphState.scale)) return node;
  }
  return null;
}

function zoomBy(factor) {
  const oldScale = graphState.scale;
  graphState.scale = Math.max(.35, Math.min(2.8, graphState.scale * factor));
  const centerX = canvas.clientWidth / 2, centerY = canvas.clientHeight / 2;
  graphState.panX = centerX - (centerX - graphState.panX) * (graphState.scale / oldScale);
  graphState.panY = centerY - (centerY - graphState.panY) * (graphState.scale / oldScale);
  draw();
}

function resetView() {
  graphState.scale = 1; graphState.panX = canvas.clientWidth / 2; graphState.panY = canvas.clientHeight / 2;
  graphState.nodes.forEach((node, index) => { const angle = index * 2.39996, radius = 80 + Math.sqrt(index + 1) * 25; node.x = Math.cos(angle) * radius; node.y = Math.sin(angle) * radius; });
  draw();
}

function showTooltip(node, x, y) {
  tooltip.innerHTML = `<div class="tt-id">${escapeHtml(node.id)}</div><div class="tt-name">${escapeHtml(node.tech.name)}</div><div class="tt-tactic" style="color:${node.tactic.color}">${escapeHtml(node.tactic.name)}</div>`;
  tooltip.style.left = `${Math.min(x + 14, window.innerWidth - 280)}px`;
  tooltip.style.top = `${Math.min(y + 14, window.innerHeight - 90)}px`;
  tooltip.classList.add('show');
}
function hideTooltip() { tooltip.classList.remove('show'); }

canvas.addEventListener('mousedown', event => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  const node = nodeAt(x, y);
  graphState.dragging = true; graphState.dragNode = node;
  graphState.pointer = { x: event.clientX, y: event.clientY };
  canvas.classList.add('dragging');
  if (node) selectNode(node);
});
canvas.addEventListener('mousemove', event => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  const hovered = nodeAt(x, y);
  if (hovered) showTooltip(hovered, event.clientX, event.clientY); else hideTooltip();
  if (!graphState.dragging) return;
  const dx = event.clientX - graphState.pointer.x, dy = event.clientY - graphState.pointer.y;
  graphState.pointer = { x: event.clientX, y: event.clientY };
  if (graphState.dragNode) {
    const world = toWorld(x, y); graphState.dragNode.x = world.x; graphState.dragNode.y = world.y;
  } else { graphState.panX += dx; graphState.panY += dy; }
  draw();
});
canvas.addEventListener('mouseup', () => { graphState.dragging = false; graphState.dragNode = null; canvas.classList.remove('dragging'); });
canvas.addEventListener('mouseleave', () => { graphState.dragging = false; graphState.dragNode = null; canvas.classList.remove('dragging'); hideTooltip(); });
canvas.addEventListener('wheel', event => { event.preventDefault(); zoomBy(event.deltaY < 0 ? 1.1 : .9); }, { passive: false });

document.getElementById('graph-search').addEventListener('input', event => { graphState.search = event.target.value; applyFilters(); });
window.addEventListener('resize', resizeCanvas);

buildGraphData();
resizeCanvas();
