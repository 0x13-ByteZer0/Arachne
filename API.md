# Arachne API — Documentação

> **Arachne** é uma matriz de ataques para aplicações web inspirada em MITRE ATT&CK.
> A **Arachne API** expõe toda a base de conhecimento (táticas, técnicas, cadeias de ataque e grafo)
> como uma API REST para consumo por **SIEM**, **SOC** e integrações de segurança.

- **Versão da API:** `1.0.0`
- **Protocolo:** HTTP/1.1, JSON
- **Dependências:** nenhuma (Node.js nativo, `>= 18`)
- **Licença do conteúdo:** CC BY 4.0

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Como executar](#2-como-executar)
3. [Autenticação](#3-autenticação)
4. [Rate limiting](#4-rate-limiting)
5. [Convenções da API](#5-convenções-da-api)
6. [Modelos de dados](#6-modelos-de-dados)
7. [Endpoints](#7-endpoints)
   - [Meta e saúde](#71-meta-e-saúde)
   - [Táticas](#72-táticas)
   - [Técnicas](#73-técnicas)
   - [Cadeias de ataque](#74-cadeias-de-ataque)
   - [Grafo](#75-grafo)
   - [Busca](#76-busca)
   - [Exportações](#77-exportações)
8. [Códigos de erro](#8-códigos-de-erro)
9. [Integração com SIEM / SOC](#9-integração-com-siem--soc)
10. [Referências](#10-referências)

---

## 1. Visão geral

A API expõe três dimensões da base de conhecimento:

| Dimensão | Descrição | Exemplo de id |
|----------|-----------|---------------|
| **Táticas** | Categorias de objetivo do atacante (22) | `TA-W01` |
| **Técnicas** | Ações específicas dentro de uma tática (108) | `W008` |
| **Cadeias** | Sequências de técnicas que formam um ataque (43) | `CHAIN-004` |

Além dos dados, a API expõe o **grafo de ataque** (nós = técnicas, arestas = relações
derivadas das cadeias) e operações de análise: **caminho mais curto** entre duas técnicas,
**vizinhos** (entrada/saída) e **cadeias relacionadas**.

Para consumo em SIEM/SOC, há exportações em **STIX 2.1** (padrão de troca de informação de
ameaça) e **CSV** (para importação em planilhas, dashboards e correlação).

**Estatísticas da base (valores atuais):**

```
22 táticas · 108 técnicas · 43 cadeias · 86 arestas
```

> Os números reais são sempre retornados em `GET /api/meta` e `GET /api/graph`.

---

## 2. Como executar

A API é um servidor Node.js sem dependências externas.

```bash
# A partir da raiz do projeto
node server.js
```

Por padrão a API escuta em `http://localhost:8080`.

### Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `ARACHNE_PORT` | `8080` | Porta TCP de escuta. |
| `ARACHNE_API_KEY` | *(vazio)* | Se definido, exige autenticação `Bearer` em todas as rotas `/api/*`. |
| `ARACHNE_RATE_LIMIT` | `120` | Máximo de requisições por janela, por IP. |
| `ARACHNE_RATE_WINDOW` | `60000` | Janela do rate limit, em milissegundos. |

Exemplo com autenticação e porta customizada:

```bash
ARACHNE_PORT=9000 ARACHNE_API_KEY="sua-chave-secreta" node server.js
```

### Scripts do `package.json`

```bash
npm start        # node server.js
npm run dev      # node --watch server.js (reinicia ao salvar)
npm test         # node test/api.test.js (smoke tests)
```

### Testes

```bash
node test/api.test.js
```

A suíte sobe o servidor em uma porta efêmera e valida os principais endpoints
(20 verificações).

---

## 3. Autenticação

A autenticação é **opcional**. Quando `ARACHNE_API_KEY` **não** está definido, todas as
rotas `/api/*` são públicas.

Quando `ARACHNE_API_KEY` está definido, cada requisição a `/api/*` deve apresentar a chave
por **um** dos três métodos:

| Método | Como enviar |
|--------|-------------|
| Header `Authorization` (recomendado) | `Authorization: Bearer <chave>` |
| Header `X-API-Key` | `X-API-Key: <chave>` |
| Query string | `?api_key=<chave>` |

Exemplos:

```bash
# Bearer (recomendado)
curl -H "Authorization: Bearer sua-chave" http://localhost:8080/api/techniques

# Header alternativo
curl -H "X-API-Key: sua-chave" http://localhost:8080/api/chains

# Query string
curl "http://localhost:8080/api/chains?api_key=sua-chave"
```

Sem chave válida, a API responde `401 Unauthorized`. A comparação é feita com
`crypto.timingSafeEqual` (resistente a timing attacks).

> **Boa prática:** em produção, sirva a API atrás de um proxy (nginx/traefik) com TLS e
> defina `ARACHNE_API_KEY`. A autenticação por chave é suficiente para uso interno de SOC;
> para exposição pública, prefira um gateway com OAuth2/OIDC.

---

## 4. Rate limiting

O rate limit usa **janela fixa por IP** (em memória). Os cabeçalhos de resposta informam o
estado:

| Cabeçalho | Descrição |
|-----------|-----------|
| `X-RateLimit-Limit` | Limite da janela. |
| `X-RateLimit-Remaining` | Requisições restantes na janela. |
| `X-RateLimit-Reset` | Timestamp (ms) em que a janela reseta. |

Ao exceder o limite, a API responde `429 Too Many Requests`.

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json; charset=utf-8
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1716200000000

{
  "error": "rate_limited",
  "message": "Muitas requisições. Tente novamente em instantes."
}
```

> O rate limit é por processo (em memória). Em deployments com múltiplas instâncias atrás
> de um load balancer, considere um rate limit centralizado no proxy.

---

## 5. Convenções da API

### Base URL

```
http://<host>:<porta>/api
```

### Formato de resposta

Todas as respostas de sucesso são JSON. Listas usam o envelope:

```json
{
  "data": [ ... ],
  "count": 43,
  "pagination": { "total": 43, "limit": 100, "offset": 0, "returned": 43 }
}
```

- `count` — total de itens que atendem ao filtro (antes da paginação).
- `pagination` — presente em endpoints paginados (`/api/techniques`, `/api/chains`).

### Parâmetros de paginação (query string)

| Parâmetro | Padrão | Máx. | Descrição |
|-----------|--------|------|-----------|
| `limit` | `100` | `500` | Itens por página. |
| `offset` | `0` | — | Posição inicial. |

### Parâmetros de filtro (query string)

| Parâmetro | Aplica-se a | Descrição |
|-----------|-------------|-----------|
| `q` | táticas, técnicas, cadeias, busca | Busca textual (case-insensitive) em nome/id/descrição. |
| `tactic` | técnicas | Filtra por id de tática (ex.: `TA-W01`). |
| `severity` | técnicas | Filtra por severidade `1`–`4`. |
| `difficulty` | cadeias | Filtra por dificuldade (`Intermediario`, `Avancado`, etc.). |

### Cabeçalhos CORS

A API responde a preflight `OPTIONS` e permite consumo cross-origin:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
```

> A API é **somente leitura** (GET). Não há rotas de escrita.

---

## 6. Modelos de dados

### Tática

```json
{
  "id": "TA-W01",
  "name": "Reconhecimento",
  "color": "#a78bfa",
  "techniqueCount": 6
}
```

Com `GET /api/tactics/:id`, o campo `techniques` (array de Técnica) é incluído.

### Técnica

```json
{
  "id": "W008",
  "name": "Cross-Site Scripting",
  "subs": ["Reflected", "Stored", "DOM-based"],
  "desc": "Descrição da técnica...",
  "severity": 3,
  "severityLabel": "Alta",
  "mitigations": ["Context-aware output encoding", "CSP restritiva"],
  "references": ["OWASP", "CWE-79"],
  "tactic": { "id": "TA-W02", "name": "Injeção", "color": "#fb923c" },
  "example": "// código de exemplo (quando disponível)",
  "detection": ["telemetria de detecção (quando disponível)"],
  "tools": ["ferramentas operacionais (quando disponível)"]
}
```

Campos opcionais (`example`, `detection`, `tools`) só aparecem quando existem.

### Cadeia (resumo)

```json
{
  "id": "CHAIN-004",
  "name": "XSS Stored → Session Hijacking → Data Theft",
  "description": "Roubo de sessão via XSS armazenado",
  "entry": {
    "label": "Input não sanitizado persistido no banco",
    "description": "O início do ataque é um campo de texto..."
  },
  "techniques": ["W008", "W011", "W040"],
  "difficulty": "Intermediário",
  "timeframe": "1-2 semanas",
  "impact": "Account Takeover - Roubo de sessão de múltiplos usuários",
  "stepCount": 3
}
```

### Cadeia (completa — `GET /api/chains/:id`)

Além dos campos acima, inclui `steps`:

```json
{
  "steps": [
    {
      "order": 1,
      "technique": "W008",
      "action": "Stored XSS Injection",
      "description": "Injetar script malicioso em campo de perfil...",
      "duration": "1-3 dias",
      "mitigations": ["Context-aware output encoding", "CSP restritiva"],
      "techniqueDetail": { "id": "W008", "name": "Cross-Site Scripting", "...": "..." }
    }
  ]
}
```

### Grafo

```json
{
  "nodes": [
    { "id": "W001", "name": "Fingerprinting de tecnologia", "severity": 2,
      "tactic": "TA-W01", "tacticName": "Reconhecimento", "color": "#a78bfa" }
  ],
  "edges": [
    { "source": "W001", "target": "W002", "chains": ["CHAIN-001"] }
  ],
  "stats": { "tactics": 22, "techniques": 108, "chains": 43, "edges": 86 }
}
```

Arestas são **direcionadas** e derivadas das sequências de técnicas das cadeias. Uma aresta
pode pertencer a várias cadeias (campo `chains`).

---

## 7. Endpoints

> Todos os exemplos usam `http://localhost:8080` como base.

### 7.1 Meta e saúde

#### `GET /api/health`

Verifica se a API está no ar.

```bash
curl http://localhost:8080/api/health
```

```json
{
  "status": "ok",
  "service": "arachne-api",
  "version": "1.0.0",
  "uptime": 317.33
}
```

#### `GET /api/meta`

Metadados do serviço, estatísticas da base e lista de endpoints.

```bash
curl http://localhost:8080/api/meta
```

```json
{
  "service": "arachne-api",
  "version": "1.0.0",
  "startedAt": "2026-09-19T12:00:00.000Z",
  "stix": { "version": "2.1", "spec": "2.1" },
  "stats": { "tactics": 22, "techniques": 108, "chains": 43, "edges": 86 },
  "endpoints": [ "GET /api/health", "GET /api/meta", "..." ]
}
```

---

### 7.2 Táticas

#### `GET /api/tactics`

Lista todas as táticas.

| Parâmetro | Descrição |
|-----------|-----------|
| `q` | Filtra por nome/id. |

```bash
curl http://localhost:8080/api/tactics
curl "http://localhost:8080/api/tactics?q=recon"
```

```json
{
  "data": [
    { "id": "TA-W01", "name": "Reconhecimento", "color": "#a78bfa", "techniqueCount": 6 }
  ],
  "count": 22
}
```

#### `GET /api/tactics/:id`

Detalha uma tática, incluindo suas técnicas.

```bash
curl http://localhost:8080/api/tactics/TA-W01
```

```json
{
  "id": "TA-W01",
  "name": "Reconhecimento",
  "color": "#a78bfa",
  "techniqueCount": 6,
  "techniques": [ { "id": "W001", "name": "Fingerprinting de tecnologia", "...": "..." } ]
}
```

---

### 7.3 Técnicas

#### `GET /api/techniques`

Lista técnicas com filtros e paginação.

| Parâmetro | Descrição |
|-----------|-----------|
| `q` | Busca em nome/id/descrição/sub-técnicas. |
| `tactic` | Filtra por id de tática. |
| `severity` | Filtra por severidade (`1`–`4`). |
| `limit` / `offset` | Paginação. |

```bash
curl "http://localhost:8080/api/techniques?severity=4&limit=10"
curl "http://localhost:8080/api/techniques?tactic=TA-W02&q=injection"
```

```json
{
  "data": [ { "id": "W022", "name": "Remote Code Execution", "severity": 4, "...": "..." } ],
  "count": 12,
  "pagination": { "total": 12, "limit": 10, "offset": 0, "returned": 10 }
}
```

#### `GET /api/techniques/:id`

Detalha uma técnica, incluindo **cadeias relacionadas** e **vizinhos** no grafo.

```bash
curl http://localhost:8080/api/techniques/W008
```

```json
{
  "id": "W008",
  "name": "Cross-Site Scripting",
  "severity": 3,
  "severityLabel": "Alta",
  "mitigations": [ "..." ],
  "tactic": { "id": "TA-W02", "name": "Injeção", "color": "#fb923c" },
  "relatedChains": [ { "id": "CHAIN-004", "name": "XSS Stored → ...", "...": "..." } ],
  "neighbors": { "inbound": ["W002"], "outbound": ["W011"] }
}
```

#### `GET /api/techniques/:id/chains`

Lista as cadeias que contêm a técnica.

```bash
curl http://localhost:8080/api/techniques/W008/chains
```

```json
{
  "data": [ { "id": "CHAIN-004", "name": "XSS Stored → Session Hijacking → Data Theft", "...": "..." } ],
  "count": 2
}
```

#### `GET /api/techniques/:id/neighbors`

Vizinhos diretos (entrada e saída) no grafo, com detalhe.

```bash
curl http://localhost:8080/api/techniques/W008/neighbors
```

```json
{
  "id": "W008",
  "inbound": ["W002"],
  "outbound": ["W011"],
  "inboundDetail": [ { "id": "W002", "name": "Mapeamento de endpoints", "...": "..." } ],
  "outboundDetail": [ { "id": "W011", "name": "Session Hijacking", "...": "..." } ]
}
```

---

### 7.4 Cadeias de ataque

#### `GET /api/chains`

Lista cadeias com filtros e paginação.

| Parâmetro | Descrição |
|-----------|-----------|
| `q` | Busca em nome/id/descrição/impacto. |
| `difficulty` | Filtra por dificuldade. |
| `limit` / `offset` | Paginação. |

```bash
curl "http://localhost:8080/api/chains?difficulty=Avancado"
curl "http://localhost:8080/api/chains?q=ssrf"
```

```json
{
  "data": [ { "id": "CHAIN-036", "name": "SSRF → Cloud Metadata → ...", "...": "..." } ],
  "count": 13,
  "pagination": { "total": 13, "limit": 100, "offset": 0, "returned": 13 }
}
```

#### `GET /api/chains/:id`

Detalha uma cadeia, incluindo **ponto de partida** (`entry`) e **passos** com mitigações.

```bash
curl http://localhost:8080/api/chains/CHAIN-004
```

```json
{
  "id": "CHAIN-004",
  "name": "XSS Stored → Session Hijacking → Data Theft",
  "entry": {
    "label": "Input não sanitizado persistido no banco",
    "description": "O início do ataque é um campo de texto..."
  },
  "techniques": ["W008", "W011", "W040"],
  "difficulty": "Intermediário",
  "timeframe": "1-2 semanas",
  "impact": "Account Takeover - Roubo de sessão de múltiplos usuários",
  "stepCount": 3,
  "steps": [
    {
      "order": 1,
      "technique": "W008",
      "action": "Stored XSS Injection",
      "description": "Injetar script malicioso em campo de perfil...",
      "duration": "1-3 dias",
      "mitigations": ["Context-aware output encoding", "CSP restritiva"],
      "techniqueDetail": { "id": "W008", "name": "Cross-Site Scripting", "...": "..." }
    }
  ]
}
```

#### `GET /api/chains/:id/steps`

Retorna apenas os passos da cadeia (leve, para correlação).

```bash
curl http://localhost:8080/api/chains/CHAIN-004/steps
```

```json
{
  "chainId": "CHAIN-004",
  "data": [
    { "order": 1, "technique": "W008", "action": "Stored XSS Injection",
      "duration": "1-3 dias", "mitigations": ["..."] }
  ]
}
```

#### `GET /api/chains/:id/techniques`

Retorna as técnicas (completo) usadas pela cadeia.

```bash
curl http://localhost:8080/api/chains/CHAIN-004/techniques
```

```json
{
  "chainId": "CHAIN-004",
  "data": [ { "id": "W008", "name": "Cross-Site Scripting", "...": "..." } ],
  "count": 3
}
```

---

### 7.5 Grafo

#### `GET /api/graph`

Retorna todos os nós, arestas e estatísticas — suficiente para renderizar o grafo em
qualquer front-end.

```bash
curl http://localhost:8080/api/graph
```

```json
{
  "nodes": [ { "id": "W001", "name": "Fingerprinting de tecnologia", "severity": 2,
    "tactic": "TA-W01", "tacticName": "Reconhecimento", "color": "#a78bfa" } ],
  "edges": [ { "source": "W001", "target": "W002", "chains": ["CHAIN-001"] } ],
  "stats": { "tactics": 22, "techniques": 108, "chains": 43, "edges": 86 }
}
```

#### `GET /api/graph/path?from=&to=`

Calcula o **caminho mais curto** (BFS) entre duas técnicas, seguindo as arestas
direcionadas derivadas das cadeias.

| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `from` | sim | Id da técnica de origem. |
| `to` | sim | Id da técnica de destino. |

```bash
curl "http://localhost:8080/api/graph/path?from=W001&to=W022"
```

```json
{
  "from": "W001",
  "to": "W022",
  "found": true,
  "hops": 3,
  "path": ["W001", "W002", "W007", "W022"],
  "pathDetail": [ { "id": "W001", "name": "Fingerprinting de tecnologia", "...": "..." } ]
}
```

Se não houver caminho, `found` é `false`, `hops` é `0` e `path` é `[]`.

#### `GET /api/graph/neighbors/:id`

Vizinhos (entrada/saída) de uma técnica, apenas ids.

```bash
curl http://localhost:8080/api/graph/neighbors/W008
```

```json
{ "id": "W008", "inbound": ["W002"], "outbound": ["W011"] }
```

---

### 7.6 Busca

#### `GET /api/search?q=`

Busca textual em técnicas, táticas e cadeias em uma única chamada.

| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `q` | sim | Termo de busca (case-insensitive). |

```bash
curl "http://localhost:8080/api/search?q=xss"
```

```json
{
  "query": "xss",
  "techniques": { "count": 6, "data": [ { "id": "W008", "name": "Cross-Site Scripting", "...": "..." } ] },
  "tactics": { "count": 0, "data": [] },
  "chains": { "count": 2, "data": [ { "id": "CHAIN-004", "name": "XSS Stored → ...", "...": "..." } ] }
}
```

Cada categoria retorna no máximo 50 itens.

---

### 7.7 Exportações

#### `GET /api/export/stix`

Gera um **bundle STIX 2.1** completo com todas as táticas, técnicas e cadeias.

- Táticas e técnicas → `attack-pattern` (com `x_mitre_tactic_id` / `x_mitre_technique_id`).
- Cadeias → `campaign` (com `object_refs` apontando para as técnicas).
- Campos extras em `x_arachne_*` (severidade, mitigações, entry, steps).

```bash
curl http://localhost:8080/api/export/stix
```

```json
{
  "type": "bundle",
  "id": "bundle--<uuid>",
  "objects": [
    { "type": "attack-pattern", "id": "attack-pattern--<uuid>",
      "name": "W008", "x_mitre_technique_id": "W008", "x_mitre_tactic": "TA-W02",
      "x_arachne_severity": 3, "x_arachne_mitigations": ["..."] },
    { "type": "campaign", "id": "campaign--<uuid>",
      "name": "CHAIN-004", "x_arachne_chain_id": "CHAIN-004",
      "object_refs": ["attack-pattern--<uuid>", "..."] }
  ]
}
```

> Os ids STIX são **determinísticos** (UUID v5 por namespace), então o mesmo objeto
> sempre gera o mesmo id — ideal para ingestão incremental em SIEM.

#### `GET /api/export/stix/chains/:id`

Gera um bundle STIX 2.1 contendo **apenas** uma cadeia e as técnicas/táticas que ela usa.

```bash
curl http://localhost:8080/api/export/stix/chains/CHAIN-004
```

#### `GET /api/export/csv/techniques`

Exporta todas as técnicas em CSV.

```bash
curl -OJ http://localhost:8080/api/export/csv/techniques
```

Colunas: `id, name, tactic_id, tactic_name, severity, subtechniques, mitigations, references`
(listas internas separadas por `; `).

#### `GET /api/export/csv/chains`

Exporta todas as cadeias em CSV.

Colunas: `id, name, difficulty, timeframe, impact, techniques, entry_label, entry_description`

#### `GET /api/export/csv/steps`

Exporta todos os passos de todas as cadeias em CSV (útil para correlação em SIEM).

Colunas: `chain_id, chain_name, step_order, technique, action, duration, mitigations`

> Os CSVs usam `CRLF` e escapam campos com aspas/vírgulas conforme RFC 4180.
> O cabeçalho `Content-Disposition` sugere o nome do arquivo.

---

## 8. Códigos de erro

Todos os erros seguem o formato:

```json
{ "error": "<código>", "message": "<descrição>" }
```

| HTTP | `error` | Quando ocorre |
|------|---------|---------------|
| `400` | `bad_request` | Parâmetros ausentes/inválidos (ex.: `/api/graph/path` sem `from`/`to`). |
| `401` | `unauthorized` | API key ausente ou inválida (quando `ARACHNE_API_KEY` está definido). |
| `404` | `not_found` | Recurso inexistente (técnica, tática, cadeia ou rota). |
| `429` | `rate_limited` | Limite de requisições excedido. |
| `500` | `internal_error` | Erro interno inesperado. |

Exemplo `404`:

```json
{ "error": "not_found", "message": "Técnica W999 não encontrada." }
```

---

## 9. Integração com SIEM / SOC

A API foi desenhada para ser consumida por pipelines de segurança. Seguem cenários práticos.

### 9.1 Ingestão de conhecimento (onboarding)

Importar a base de conhecimento uma vez (ou em cron) para enriquecer o SIEM:

```bash
# Bundle STIX completo (para TheHive, MISP, OpenCTI, Elastic SIEM)
curl -H "Authorization: Bearer $KEY" \
  -o arachne.stix.json http://localhost:8080/api/export/stix

# CSVs para planilhas/dashboards
curl -H "Authorization: Bearer $KEY" -OJ http://localhost:8080/api/export/csv/techniques
curl -H "Authorization: Bearer $KEY" -OJ http://localhost:8080/api/export/csv/chains
curl -H "Authorization: Bearer $KEY" -OJ http://localhost:8080/api/export/csv/steps
```

### 9.2 Enriquecimento de alertas em tempo real

Quando um alerta menciona uma técnica (ex.: `W008` — XSS), o analista/SOAR busca o
contexto de mitigação e as cadeias associadas:

```bash
curl -H "Authorization: Bearer $KEY" http://localhost:8080/api/techniques/W008
```

A resposta traz `mitigations`, `detection` e `relatedChains` — material para o playbook.

### 9.3 Correlação de cadeia de ataque

Dado um alerta no passo 1 de uma cadeia, o SOAR pode buscar os passos seguintes e as
mitigações de cada um:

```bash
curl -H "Authorization: Bearer $KEY" http://localhost:8080/api/chains/CHAIN-004/steps
```

### 9.4 Análise de caminho (threat hunting)

Para responder "como um atacante chega de `W001` (recon) a `W022` (RCE)?":

```bash
curl -H "Authorization: Bearer $KEY" "http://localhost:8080/api/graph/path?from=W001&to=W022"
```

### 9.5 Exemplo: Splunk (input de STIX)

O bundle STIX pode ser ingerido via `input_stix` ou importado para o
**Threat Knowledge** do Splunk. Como os ids são determinísticos, reimportações não
criam duplicatas.

### 9.6 Exemplo: Elastic (enriquecimento por lookup)

```bash
# Carrega técnicas em um índice de lookup
curl -H "Authorization: Bearer $KEY" http://localhost:8080/api/techniques?limit=500 \
  | jq -c '.data[]' | while read -r line; do
    echo "$line"
  done
```

### 9.7 Exemplo: SOAR (playbook em pseudo-código)

```python
import requests

BASE = "http://localhost:8080"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

def enrich_alert(technique_id: str) -> dict:
    """Enriquece um alerta com contexto da técnica e cadeias relacionadas."""
    r = requests.get(f"{BASE}/api/techniques/{technique_id}", headers=HEADERS, timeout=10)
    r.raise_for_status()
    tech = r.json()
    return {
        "technique": tech["name"],
        "severity": tech["severityLabel"],
        "mitigations": tech["mitigations"],
        "detection": tech.get("detection", []),
        "related_chains": [c["id"] for c in tech["relatedChains"]],
    }

def next_steps(chain_id: str) -> list:
    """Retorna os passos de uma cadeia para o playbook de resposta."""
    r = requests.get(f"{BASE}/api/chains/{chain_id}/steps", headers=HEADERS, timeout=10)
    r.raise_for_status()
    return r.json()["data"]
```

### 9.8 Boas práticas operacionais

- **Cache:** os dados são estáticos; cacheie respostas (ex.: `Cache-Control` no proxy) para
  reduzir carga. A API responde `Cache-Control: no-store` por padrão — ajuste no proxy se
  quiser cache.
- **Idempotência:** todas as rotas são `GET` e idempotentes.
- **Observabilidade:** use `GET /api/health` em health checks e `GET /api/meta` para
  monitorar a contagem da base.
- **Segurança:** defina `ARACHNE_API_KEY` e sirva atrás de TLS. Para exposição pública,
  prefira um gateway com OAuth2/OIDC.

---

## 10. Referências

- **STIX 2.1** — OASIS Standard, *STIX 2.1 Specification* (https://oasis-open.org/standards/stix)
- **MITRE ATT&CK** — estrutura de táticas/técnicas usada como inspiração (https://attack.mitre.org)
- **RFC 4180** — formato CSV
- **RFC 4122** — UUID (usado para ids STIX determinísticos via UUID v5)
- **OWASP** — referências de mitigação e detecção por técnica

---

## Changelog

- **1.0.0** — API REST completa: táticas, técnicas, cadeias, grafo, busca, exportações
  STIX 2.1 e CSV, autenticação opcional por API key, rate limiting e suíte de testes.
