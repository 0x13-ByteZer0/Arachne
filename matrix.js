const SEV_COLOR = { 4:'#f87171', 3:'#fb923c', 2:'#fbbf24', 1:'#60a5fa' };
const SEV_LABEL = { 4:'Crítica', 3:'Alta', 2:'Média', 1:'Baixa' };

let showSubs = true;
let currentFilter = 0;
let currentTacticFilter = 'all';
let currentSearch = '';

function toggleSubs() {
  showSubs = !showSubs;
  document.getElementById('btn-subs').classList.toggle('active', showSubs);
  renderMatrix();
}

function filterSeverity(n) {
  currentFilter = n;
  [0,1,2,3,4].forEach(i => {
    const btn = document.getElementById('f'+i);
    if(btn) {
      btn.classList.remove('active');
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }
  });
  const activeBtn = document.getElementById('f'+n);
  if(activeBtn){
    activeBtn.classList.add('active');
    if(n > 0){
      activeBtn.style.background = SEV_COLOR[n] + '22';
      activeBtn.style.borderColor = SEV_COLOR[n] + '44';
      activeBtn.style.color = SEV_COLOR[n];
    } else {
      // 'Todos' styling
      activeBtn.style.background = 'rgba(124,92,252,0.15)';
      activeBtn.style.borderColor = 'rgba(124,92,252,0.4)';
      activeBtn.style.color = 'var(--accent2)';
    }
  }
  renderMatrix();
}

function styleSeverityButtons(){
  [4,3,2,1].forEach(i => {
    const btn = document.getElementById('f'+i);
    if(!btn) return;
    const color = SEV_COLOR[i];
    btn.style.borderColor = color + '44';
    btn.style.color = color;
  });
  const allBtn = document.getElementById('f0');
  if(allBtn){ allBtn.style.borderColor = 'rgba(255,255,255,0.04)'; allBtn.style.color = 'var(--muted)'; }
}

function filterTactic(tacticId) {
  currentTacticFilter = tacticId;
  document.querySelectorAll('[id^="ftactic-"]').forEach(btn => btn.classList.remove('active'));
  document.getElementById('ftactic-' + tacticId)?.classList.add('active');
  renderMatrix();
}

function doSearch(val) {
  currentSearch = val.toLowerCase();
  renderMatrix();
}

function matches(tech, tacticId) {
  if (currentTacticFilter !== 'all' && currentTacticFilter !== tacticId) return false;
  if (currentFilter && tech.severity !== currentFilter) return false;
  if (currentSearch) {
    const haystack = (tech.name + tech.desc + (tech.subs||[]).join(' ')).toLowerCase();
    if (!haystack.includes(currentSearch)) return false;
  }
  return true;
}

function renderMatrix() {
  // Create tactic filter buttons dynamically
  const tacticFilterContainer = document.getElementById('tactic-filter-buttons');
  if (tacticFilterContainer && !tacticFilterContainer.hasChildNodes()) {
    tactics.forEach(tactic => {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.id = 'ftactic-' + tactic.id;
      btn.style.color = tactic.color;
      btn.style.borderColor = tactic.color + '44';
      btn.textContent = tactic.name;
      btn.onclick = () => filterTactic(tactic.id);
      tacticFilterContainer.appendChild(btn);
    });
  }

  const isFiltering = currentSearch || currentFilter || currentTacticFilter !== 'all';
  const grid = document.getElementById('matrix-grid');
  grid.innerHTML = '';
  tactics.forEach(tactic => {
    const col = document.createElement('div');
    col.className = 'tactic-col';
    // expose tactic color as a CSS variable for children (.sub-item, .tech-card)
    col.style.setProperty('--tactic-color', tactic.color);
    // apply tactic color inline so headers and accents render with the tactic's color
    col.innerHTML = `
      <div class="tactic-header" style="--tactic-color:${tactic.color}; background: ${tactic.color}22; border: 1px solid ${tactic.color}44;">
        <div class="tactic-name" style="color:${tactic.color}">${tactic.name}</div>
        <div class="tactic-id">${tactic.id}</div>
        <div class="tactic-count">${tactic.techniques.length} técnicas</div>
      </div>
      <div class="tech-list"></div>`;
    const list = col.querySelector('.tech-list');
    let hasVisibleTechs = false;
    
    tactic.techniques.forEach(tech => {
      const matched = matches(tech, tactic.id);
      const card = document.createElement('div');
      card.className = 'tech-card';
      card.style.setProperty('--sev-color', SEV_COLOR[tech.severity]);
      card.style.setProperty('--tactic-color', tactic.color);
      
      // Se está filtrando e não combina, esconder completamente
      if (isFiltering && !matched) {
        card.style.display = 'none';
      } else {
        hasVisibleTechs = true;
      }
      
      card.innerHTML = `
        <div class="tech-id">${tech.id}</div>
        <div class="tech-name">${tech.name}</div>
        ${showSubs && tech.subs ? `<div class="sub-toggle">${tech.subs.length} sub-técnicas</div>` : ''}`;
      card.onclick = () => updateHash(tech.id);
      list.appendChild(card);
      if (showSubs && tech.subs) {
        const subList = document.createElement('div');
        subList.className = 'sub-list';
        tech.subs.forEach(s => {
          const si = document.createElement('div');
          si.className = 'sub-item';
          si.textContent = '↳ ' + s;
          si.onclick = (e) => { e.stopPropagation(); updateHash(tech.id, s); };
          subList.appendChild(si);
        });
        // Esconder sub-list se a técnica pai está escondida
        if (isFiltering && !matched) {
          subList.style.display = 'none';
        }
        list.appendChild(subList);
      }
    });
    
    // Se nenhuma técnica da tática é visível, esconder a coluna inteira
    if (isFiltering && !hasVisibleTechs) {
      col.style.display = 'none';
    }
    
    grid.appendChild(col);
  });
}

// Find technique and tactic by ID
function findTechnique(techId) {
  for (const tactic of tactics) {
    const tech = tactic.techniques.find(t => t.id === techId);
    if (tech) return { tech, tactic };
  }
  return null;
}

// Build reference URL
function getReferenceUrl(ref) {
  if (ref.startsWith('CWE-')) {
    return `https://cwe.mitre.org/data/definitions/${ref.split('-')[1]}.html`;
  } else if (ref.startsWith('OWASP A')) {
    return `https://owasp.org/Top10/`;
  } else if (ref.startsWith('OWASP')) {
    return `https://owasp.org/`;
  } else if (ref.startsWith('RFC')) {
    const num = ref.split(' ')[1];
    return `https://tools.ietf.org/html/rfc${num}`;
  } else if (ref.includes('NIST')) {
    return `https://csrc.nist.gov/`;
  }
  return null;
}

// Update URL hash when opening technique
function updateHash(techId, sub) {
  if (sub) {
    window.location.hash = `/technique/${techId}/${encodeURIComponent(sub)}`;
  } else {
    window.location.hash = `/technique/${techId}`;
  }
}

function openPanel(tech, tactic, sub) {
  ensureDetailPanelExists();
  const sc = SEV_COLOR[tech.severity];
  const sl = SEV_LABEL[tech.severity];
  const shareUrl = `${window.location.origin}${window.location.pathname}#/technique/${tech.id}`;
  document.getElementById('panel-content').innerHTML = `
    <div class="panel-id">${tech.id}${sub ? ' › ' + sub : ''}</div>
    <div class="panel-title" style="color:${sc};">${sub || tech.name}</div>
    <div class="panel-badges">
      <span class="badge" style="color:${tactic.color};border-color:${tactic.color}44">${tactic.name}</span>
      <span class="badge" style="color:${sc};border-color:${sc}44">${sl}</span>
    </div>
    <div class="panel-desc">${tech.desc}</div>
    ${tech.subs ? `<div class="panel-section">
      <div class="panel-section-title">Sub-técnicas</div>
      <div class="tag-list">${tech.subs.map(s=>`<span class="tag">${s}</span>`).join('')}</div>
    </div>` : ''}
    <div class="panel-section">
      <div class="panel-section-title">Mitigações</div>
      <div class="tag-list">${tech.mitigations.map(m=>`<span class="tag green">${m}</span>`).join('')}</div>
    </div>
    ${tech.references.length ? `<div class="panel-section">
      <div class="panel-section-title">Referências</div>
      <div class="tag-list">${tech.references.map(r=>{
        const url = getReferenceUrl(r);
        return url ? `<a href="${url}" target="_blank" class="tag blue" style="text-decoration:none;cursor:pointer">${r}</a>` : `<span class="tag blue">${r}</span>`;
      }).join('')}</div>
    </div>` : ''}
    <div class="panel-section">
      <div class="panel-section-title">Severidade — ${sl}</div>
      <div class="sev-meter">
        ${[1,2,3,4].map(i=>`<div class="sev-bar"><div class="sev-fill" style="width:${i<=tech.severity?100:0}%;background:${sc}"></div></div>`).join('')}
      </div>
    </div>
    ${tech.example ? `<div class="panel-section">
      <div class="panel-section-title">Exemplo</div>
      <pre style="background:var(--bg3);padding:10px;border-radius:2px;overflow-x:auto;font-size:11px;line-height:1.4;border:0.5px solid var(--border2);color:var(--text2);font-family:var(--mono)">${tech.example}</pre>
    </div>` : ''}`;
  // show copy button in footer and wire it to the current shareUrl
  const copyBtn = document.getElementById('panel-copy-btn');
  if (copyBtn) {
    copyBtn.style.display = 'inline-block';
    copyBtn.onclick = (e) => { e.stopPropagation(); copyShareUrl(shareUrl, copyBtn); };
  }
  document.getElementById('detail-panel').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  updateHash(tech.id, sub);
}

// Ensure overlay and detail panel markup exist in the document
function ensureDetailPanelExists(){
  if(document.getElementById('panel-content')) return;
  try {
    // reuse existing overlay if present
    let overlay = document.getElementById('overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'overlay';
      overlay.className = 'overlay';
      document.body.appendChild(overlay);
    }
    overlay.onclick = closePanel;

    // reuse existing panel if present
    let panel = document.getElementById('detail-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'detail-panel';
      panel.className = 'detail-panel';
      panel.innerHTML = '<button class="panel-close" onclick="closePanel()">✕</button>' +
                        '<div class="panel-body"><div id="panel-content"></div></div>' +
                        '<div class="panel-footer"><button id="panel-copy-btn" class="chip" style="display:none">📋 Copiar link</button><button class="panel-action" onclick="closePanel()">Fechar</button></div>';
      document.body.appendChild(panel);
    } else {
      if (!panel.querySelector('#panel-content')) {
        panel.innerHTML = '<button class="panel-close" onclick="closePanel()">✕</button>' +
                          '<div class="panel-body"><div id="panel-content"></div></div>' +
                          '<div class="panel-footer"><button id="panel-copy-btn" class="chip" style="display:none">📋 Copiar link</button><button class="panel-action" onclick="closePanel()">Fechar</button></div>';
      } else {
        // ensure footer copy button exists
        if (!panel.querySelector('#panel-copy-btn')) {
          const footer = panel.querySelector('.panel-footer');
          if (footer) footer.insertAdjacentHTML('afterbegin', '<button id="panel-copy-btn" class="chip" style="display:none">📋 Copiar link</button>');
        }
      }
    }
    console.info('Detail panel ensured in DOM');
  } catch (e) {
    console.error('Failed to create detail panel dynamically', e);
  }
}

function copyShareUrl(url, btnElement) {
  navigator.clipboard.writeText(url).then(() => {
    const btn = btnElement || document.getElementById('panel-copy-btn') || document.querySelector('.panel-action');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '✓ Link copiado!';
    setTimeout(() => btn.textContent = orig, 2000);
  }).catch(err => { console.error('copy failed', err); alert('Falha ao copiar link'); });
}

function closePanel() {
  const panel = document.getElementById('detail-panel');
  const overlay = document.getElementById('overlay');
  if(panel) panel.classList.remove('open');
  if(overlay) overlay.classList.remove('open');
  window.location.hash = '';
}

// Hash routing
function handleHashChange() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('/technique/')) {
    const parts = hash.slice(11).split('/');
    const techId = parts[0];
    const sub = parts[1] ? decodeURIComponent(parts[1]) : null;
    const found = findTechnique(techId);
    if (found) {
      openPanel(found.tech, found.tactic, sub);
    }
  } else if (!hash || hash === '/') {
    closePanel();
  }
}

window.addEventListener('hashchange', handleHashChange);

// Stats
function buildStatsAndRender() {
  const totalTechs = tactics.reduce((a,t)=>a+t.techniques.length,0);
  const totalSubs = tactics.reduce((a,t)=>a+t.techniques.reduce((b,tc)=>b+(tc.subs?.length||0),0),0);
  const sevCounts = { 1:0, 2:0, 3:0, 4:0 };
  tactics.forEach(t => t.techniques.forEach(tc => sevCounts[tc.severity]++));

  document.getElementById('hero-stats').innerHTML = `
    <div class="stat">
      <div class="stat-num">${tactics.length}</div>
      <div class="stat-label">Táticas</div>
    </div>
    <div class="stat">
      <div class="stat-num">${totalTechs}</div>
      <div class="stat-label">Técnicas</div>
    </div>
    <div class="stat">
      <div class="stat-num">${totalSubs}</div>
      <div class="stat-label">Sub-técnicas</div>
    </div>
    <div class="stat">
      <div class="stat-num">${sevCounts[4] + sevCounts[3]}</div>
      <div class="stat-label">Crítica/Alta</div>
    </div>`;
}

function buildHeatmap() {
  const heatmapContainer = document.getElementById('severity-heatmap');
  if (!heatmapContainer) return;
  heatmapContainer.innerHTML = '';
  
  tactics.forEach(tactic => {
    const sevCount = { 1:0, 2:0, 3:0, 4:0 };
    tactic.techniques.forEach(tech => sevCount[tech.severity]++);
    
    // Calculate max severity
    const maxSev = sevCount[4] > 0 ? 4 : sevCount[3] > 0 ? 3 : sevCount[2] > 0 ? 2 : 1;
    const avgSev = (sevCount[4]*4 + sevCount[3]*3 + sevCount[2]*2 + sevCount[1]*1) / tactic.techniques.length;
    
    const heatCell = document.createElement('div');
    heatCell.style.cssText = `
      flex: 1; min-width: 120px;
      padding: 12px; border-radius: 4px;
      background: ${tactic.color}22; border: 0.5px solid ${tactic.color}44;
      cursor: pointer; transition: all 0.2s;
    `;
    heatCell.onmouseover = () => {
      heatCell.style.background = tactic.color + '33';
      heatCell.style.borderColor = tactic.color + '66';
    };
    heatCell.onmouseout = () => {
      heatCell.style.background = tactic.color + '22';
      heatCell.style.borderColor = tactic.color + '44';
    };
    heatCell.onclick = () => filterTactic(tactic.id);
    
    heatCell.innerHTML = `
      <div style="font-family: var(--mono); font-size: 10px; color: ${tactic.color}; font-weight: 600;">${tactic.name}</div>
      <div style="font-size: 11px; color: var(--text2); margin-top: 4px;">
        <span style="color: #f87171;">●${sevCount[4]}</span>
        <span style="color: #fb923c; margin-left: 8px;">●${sevCount[3]}</span>
        <span style="color: #fbbf24; margin-left: 8px;">●${sevCount[2]}</span>
      </div>
    `;
    heatmapContainer.appendChild(heatCell);
  });
}

// Show featured critical technique on page load
function showFeaturedTechnique() {
  // Find first critical technique
  for (const tactic of tactics) {
    const criticalTech = tactic.techniques.find(t => t.severity === 4);
    if (criticalTech) {
      setTimeout(() => {
        openPanel(criticalTech, tactic);
      }, 500);
      return;
    }
  }
}

// Load from URL on page load
function bootMatrix() {
  buildStatsAndRender();
  renderMatrix();
  buildHeatmap();
  // style severity filter buttons
  styleSeverityButtons();
  if (window.location.hash) {
    setTimeout(handleHashChange, 100);
  }
  // Intentionally do not auto-open a featured technique on load.
}

// === Chains UI: builder, render and export ===
let builderSeq = [];

function toggleView(view) {
  const matrix = document.getElementById('matrix-container');
  const chains = document.getElementById('chains-container');
  document.getElementById('btn-view-matrix').classList.toggle('active', view === 'matrix');
  document.getElementById('btn-view-chains').classList.toggle('active', view === 'chains');
  matrix.style.display = view === 'matrix' ? 'block' : 'none';
  chains.style.display = view === 'chains' ? 'block' : 'none';
  if (view === 'chains') renderChainsList();
}

function renderChainsList() {
  const container = document.getElementById('chains-list');
  if (!container) return;
  container.innerHTML = '';

  const header = document.createElement('div');
  header.style = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;gap:12px;';
  header.innerHTML = `
    <div style="font-size:16px;font-weight:600;color:var(--text);">Cadeias disponíveis</div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="chip" onclick="openChainBuilder()">➕ Criar nova cadeia</button>
      <button class="chip" onclick="exportUserChains()">📤 Exportar</button>
    </div>`;
  container.appendChild(header);

  let userChains = [];
  try {
    userChains = JSON.parse(localStorage.getItem('arachne:userChains') || '[]');
    if(!Array.isArray(userChains)) userChains = [];
  } catch (e) {
    console.error('Failed to parse arachne:userChains, resetting local value', e);
    userChains = [];
    localStorage.removeItem('arachne:userChains');
  }
  const allChains = (typeof attackChains !== 'undefined' ? attackChains : []).concat(userChains);

  allChains.forEach(chain => {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg2);padding:12px;border:0.5px solid var(--border);border-radius:4px;margin-bottom:12px;display:flex;justify-content:space-between;gap:12px;';
    card.innerHTML = `
      <div style="flex:1;min-width:0;">
        <div style="font-family:var(--mono);font-size:11px;color:var(--text3)">${chain.id}</div>
        <div style="font-size:16px;font-weight:600;color:var(--accent2);margin-top:4px">${chain.name}</div>
        <div style="color:var(--text2);margin-top:6px">${chain.description || ''}</div>
      </div>
      <div style="text-align:right;min-width:160px;">
        <div style="font-size:12px;color:var(--text3)">${chain.difficulty} • ${chain.timeframe}</div>
        <button class="panel-action" style="margin-top:10px;padding:6px 10px;font-size:12px">Ver cadeia</button>
      </div>`;
    container.appendChild(card);
    // bind event listener to the button to avoid relying on inline onclick
    const btn = card.querySelector('.panel-action');
    if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); openChainDetail(chain.id); });
  });
}

function openChainDetail(chainId) {
  console.log('openChainDetail called for', chainId);
  let userChains = [];
  try {
    userChains = JSON.parse(localStorage.getItem('arachne:userChains') || '[]');
    if(!Array.isArray(userChains)) userChains = [];
  } catch(e) { userChains = []; console.error('Invalid userChains JSON', e); localStorage.removeItem('arachne:userChains'); }
  const chain = ((attackChains || []).concat(userChains)).find(c => c.id === chainId);
  if (!chain) { console.warn('openChainDetail: chain not found', chainId); alert('Cadeia não encontrada: ' + chainId); return; }
  ensureDetailPanelExists();
  const content = document.getElementById('panel-content');
  const stepsHtml = chain.steps.map(s => `
    <div style="margin-bottom:8px">
      <div style="font-family:var(--mono);font-size:11px;color:var(--text3)">${s.order}. ${s.technique}</div>
      <div style="font-weight:600">${s.action}</div>
      <div style="color:var(--text2)">${s.description || ''}</div>
      <div style="font-size:11px;color:var(--text3)">Duração: ${s.duration || ''}</div>
    </div>`).join('');

  content.innerHTML = `
    <div class="panel-id">${chain.id}</div>
    <div class="panel-title">${chain.name}</div>
    <div class="panel-badges">
      <span class="badge" style="color:var(--accent2);border-color:rgba(124,92,252,0.3)">${chain.difficulty}</span>
      <span class="badge" style="color:var(--text2);border-color:rgba(255,255,255,0.06)">${chain.timeframe}</span>
    </div>
    <div class="panel-section"><div class="panel-section-title">Descrição</div><div class="panel-desc">${chain.description || ''}</div></div>
    <div class="panel-section"><div class="panel-section-title">Fluxo</div>${stepsHtml}</div>
    <div class="panel-section"><div class="panel-section-title">Impacto</div><div class="panel-desc">${chain.impact || ''}</div></div>
`;

  // hide footer copy button for chains (no share URL)
  const copyBtn = document.getElementById('panel-copy-btn');
  if (copyBtn) { copyBtn.style.display = 'none'; copyBtn.onclick = null; }

  document.getElementById('detail-panel').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}

function openChainBuilder() {
  if (document.getElementById('chain-builder')) return;
  const container = document.getElementById('chains-list');
  const builder = document.createElement('div');
  builder.id = 'chain-builder';
  builder.style.cssText = 'background:var(--bg3);padding:12px;border:0.5px solid var(--border);border-radius:4px;margin-bottom:12px;';
  builder.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
      <input id="cb-name" placeholder="Nome da cadeia" style="flex:1;min-width:220px;padding:8px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text)" />
      <input id="cb-difficulty" placeholder="Dificuldade" value="Intermediário" style="width:160px;padding:8px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text)" />
      <input id="cb-timeframe" placeholder="Timeframe" value="1-2 semanas" style="width:160px;padding:8px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text)" />
    </div>
    <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
      <select id="cb-tech-select" style="flex:1;padding:8px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text)"></select>
      <input id="cb-action" placeholder="Ação (p.ex. SQLi → exfiltration)" style="width:320px;padding:8px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text)" />
      <button class="chip" onclick="addTechniqueToBuilder()">Adicionar técnica</button>
    </div>
    <div id="cb-sequence" style="margin-top:12px"></div>
    <div style="margin-top:12px;display:flex;gap:8px;">
      <button class="panel-action" onclick="saveBuilderChain()">Salvar cadeia</button>
      <button class="chip" onclick="closeChainBuilder()">Cancelar</button>
    </div>`;

  container.insertBefore(builder, container.children[1] || container.firstChild);

  const select = document.getElementById('cb-tech-select');
  (tactics || []).forEach(tactic => {
    tactic.techniques.forEach(tech => {
      const opt = document.createElement('option');
      opt.value = tech.id;
      opt.textContent = `${tech.id} — ${tech.name}`;
      select.appendChild(opt);
    });
  });
  builderSeq = [];
}

function closeChainBuilder() {
  const b = document.getElementById('chain-builder');
  if (b) b.remove();
  builderSeq = [];
}

function addTechniqueToBuilder() {
  const sel = document.getElementById('cb-tech-select');
  const action = document.getElementById('cb-action').value || '';
  const techId = sel.value;
  if (!techId) return;
  const found = findTechnique(techId);
  const step = { technique: techId, action: action || (found && found.tech && found.tech.name) || '', description: '', duration: '' };
  builderSeq.push(step);
  renderBuilderSequence();
}

function renderBuilderSequence() {
  const seq = document.getElementById('cb-sequence');
  seq.innerHTML = '';
  builderSeq.forEach((s, i) => {
    const div = document.createElement('div');
    div.style.cssText = 'padding:8px;border:0.5px solid var(--border);margin-bottom:6px;background:var(--bg2);display:flex;justify-content:space-between;align-items:center;gap:8px;';
    div.innerHTML = `
      <div style="min-width:0;">
        <div style="font-family:var(--mono);font-size:11px;color:var(--text3)">${i+1}. ${s.technique}</div>
        <div style="color:var(--text)">${s.action}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="chip" onclick="moveBuilderStep(${i}, -1)">↑</button>
        <button class="chip" onclick="moveBuilderStep(${i}, 1)">↓</button>
        <button class="chip" onclick="removeBuilderStep(${i})">Remover</button>
      </div>`;
    seq.appendChild(div);
  });
}

function moveBuilderStep(index, dir) {
  const to = index + dir;
  if (to < 0 || to >= builderSeq.length) return;
  const tmp = builderSeq[to];
  builderSeq[to] = builderSeq[index];
  builderSeq[index] = tmp;
  renderBuilderSequence();
}

function removeBuilderStep(index) {
  builderSeq.splice(index, 1);
  renderBuilderSequence();
}

function saveBuilderChain() {
  const name = document.getElementById('cb-name').value || 'Cadeia sem nome';
  const difficulty = document.getElementById('cb-difficulty').value || 'Intermediário';
  const timeframe = document.getElementById('cb-timeframe').value || '1-2 semanas';
  if (!builderSeq.length) { alert('Adicione pelo menos uma técnica.'); return; }
  let userChains = [];
  try {
    userChains = JSON.parse(localStorage.getItem('arachne:userChains') || '[]');
    if(!Array.isArray(userChains)) userChains = [];
  } catch(e) { userChains = []; console.error('Invalid userChains JSON', e); localStorage.removeItem('arachne:userChains'); }
  const id = 'CHAIN-USER-' + Math.random().toString(36).substr(2,4).toUpperCase();
  const steps = builderSeq.map((s, idx) => ({ order: idx+1, technique: s.technique, action: s.action, description: s.description, duration: s.duration }));
  const chain = { id, name, description: '', techniques: builderSeq.map(s=>s.technique), difficulty, timeframe, impact: '', steps };
  userChains.push(chain);
  localStorage.setItem('arachne:userChains', JSON.stringify(userChains));
  builderSeq = [];
  closeChainBuilder();
  renderChainsList();
  alert('Cadeia salva localmente. Use Exportar para baixar o JSON.');
}

function exportUserChains() {
  let userChains = [];
  try {
    userChains = JSON.parse(localStorage.getItem('arachne:userChains') || '[]');
    if(!Array.isArray(userChains)) userChains = [];
  } catch(e){ userChains = []; console.error('Invalid userChains JSON', e); localStorage.removeItem('arachne:userChains'); }
  if (!userChains.length) { alert('Nenhuma cadeia salva localmente.'); return; }
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(userChains, null, 2));
  const dl = document.createElement('a');
  dl.setAttribute('href', dataStr);
  dl.setAttribute('download', 'arachne-user-chains.json');
  document.body.appendChild(dl);
  dl.click();
  dl.remove();
}

// Expose boot function
window.bootMatrix = bootMatrix;
