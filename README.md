# ⬡ Arachne

> Web Application Attack Matrix — uma base de conhecimento de táticas e técnicas adversárias voltadas a aplicações web, inspirada no MITRE ATT&CK.

[![License: MIT](https://img.shields.io/badge/code-MIT-7c5cfc?style=flat-square)](LICENSE-CODE)
[![License: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-a78bfa?style=flat-square)](LICENSE-CONTENT)
[![GitHub Pages](https://img.shields.io/badge/site-live-4ade80?style=flat-square)](https://SEU_USUARIO.github.io/arachne)
[![API](https://img.shields.io/badge/API-REST%20·%20STIX%202.1-7c5cfc?style=flat-square)](API.md)

---

## O que é?

O **MITRE ATT&CK** é excelente para ameaças a infraestrutura e endpoints, mas oferece cobertura limitada ao universo específico de aplicações web. O Arachne preenche essa lacuna com uma matriz interativa cobrindo:

| Tática | Exemplos de técnicas |
|--------|---------------------|
| Reconhecimento | Fingerprinting, mapeamento de endpoints, OSINT |
| Acesso Inicial | Phishing, credential stuffing, supply chain |
| Injeção | SQLi, XSS, SSTI, Command Injection |
| Autenticação | Session hijacking, JWT attacks, OAuth abuse |
| Autorização | IDOR, escalada de privilégio, path traversal |
| Exfiltração | SSRF, API scraping, exposição de dados |
| Impacto | RCE, DoS aplicacional, defacement |

### Cobertura técnica atual

- 108 técnicas em 22 táticas, incluindo cloud/serverless, Kubernetes, identidade federada, APIs modernas e segurança de LLM.
- 43 cadeias de ataque com caminhos compostos e relações direcionadas.
- Técnicas enriquecidas com sub-técnicas, mitigação, detecção/telemetria, ferramentas operacionais e referências.

## Como usar

O Arachne é um site estático. Basta abrir o `index.html` no navegador ou acessar a versão hospedada.

```bash
git clone https://github.com/SEU_USUARIO/arachne.git
cd arachne
open index.html   # macOS
xdg-open index.html   # Linux
```

### Páginas

| Página | Arquivo | Descrição |
|--------|---------|-----------|
| Home | `index.html` | Visão geral e navegação. |
| Matriz | `matrix.html` | Matriz de táticas × técnicas com detalhe. |
| Grafo | `graph.html` | Grafo interativo de ataque (estilo BloodHound). |

## API REST

O Arachne também é consumível **via API** — toda a base de conhecimento (táticas, técnicas,
cadeias, grafo) é exposta como endpoints REST, com exportações **STIX 2.1** e **CSV** para
integração com **SIEM** e **SOC**.

```bash
# Requer Node.js >= 18 (sem dependências externas)
node server.js
# → http://localhost:8080
```

Exemplos rápidos:

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/techniques?severity=4
curl http://localhost:8080/api/chains/CHAIN-004
curl "http://localhost:8080/api/graph/path?from=W001&to=W022"
curl http://localhost:8080/api/export/stix
```

A API suporta autenticação opcional por API key, rate limiting e CORS. Veja a documentação
completa em **[API.md](API.md)**.

```bash
# Com autenticação
ARACHNE_API_KEY="sua-chave" node server.js
curl -H "Authorization: Bearer sua-chave" http://localhost:8080/api/techniques
```

## Estrutura do projeto

```
arachne/
├── index.html          # Aplicação principal (home)
├── matrix.html         # Matriz de táticas × técnicas
├── graph.html          # Grafo interativo de ataque
├── techniques.js       # Base de dados: táticas, técnicas e cadeias (CC BY 4.0)
├── matrix.js           # Lógica da matriz
├── graph.js            # Lógica do grafo (canvas)
├── server.js           # API REST (Node.js nativo)
├── lib/
│   ├── data.js         # Carregamento/indexação + grafo (API)
│   └── stix.js         # Exportação STIX 2.1 (API)
├── test/
│   └── api.test.js     # Smoke tests da API
├── package.json        # Scripts da API (start/dev/test)
├── API.md              # Documentação da API
├── ATTACK_CHAINS.md    # Guia de cadeias de ataque
├── .github/
│   └── workflows/
│       └── pages.yml   # Deploy automático no GitHub Pages
├── CONTRIBUTING.md
├── LICENSE-CODE        # MIT (código)
├── LICENSE-CONTENT     # CC BY 4.0 (conteúdo)
└── README.md
```

## Contribuindo

Contribuições são muito bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para diretrizes.

Formas de contribuir:
- Adicionar novas técnicas ou sub-técnicas
- Melhorar descrições e mitigações
- Adicionar referências (CVEs, CWEs, writeups)
- Melhorias de UI/UX
- Melhorias na API REST (novos endpoints, exportações)
- Traduções

## Licença

- **Código** (HTML, JS, CSS): [MIT](LICENSE-CODE)
- **Conteúdo** (técnicas, descrições, mitigações): [CC BY 4.0](LICENSE-CONTENT)

---

Inspirado pelo [MITRE ATT&CK®](https://attack.mitre.org/) e pelo [OWASP](https://owasp.org/).
