# ⬡ Arachne

> Web Application Attack Matrix — uma base de conhecimento de táticas e técnicas adversárias voltadas a aplicações web, inspirada no MITRE ATT&CK.

[![License: MIT](https://img.shields.io/badge/code-MIT-7c5cfc?style=flat-square)](LICENSE-CODE)
[![License: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-a78bfa?style=flat-square)](LICENSE-CONTENT)
[![GitHub Pages](https://img.shields.io/badge/site-live-4ade80?style=flat-square)](https://SEU_USUARIO.github.io/arachne)

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

## Como usar

O Arachne é um site estático. Basta abrir o `index.html` no navegador ou acessar a versão hospedada.

```bash
git clone https://github.com/SEU_USUARIO/arachne.git
cd arachne
open index.html   # macOS
xdg-open index.html   # Linux
```

## Estrutura do projeto

```
arachne/
├── index.html          # Aplicação principal
├── data/
│   └── techniques.js   # Base de dados de técnicas (CC BY 4.0)
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
- Traduções

## Licença

- **Código** (HTML, JS, CSS): [MIT](LICENSE-CODE)
- **Conteúdo** (técnicas, descrições, mitigações): [CC BY 4.0](LICENSE-CONTENT)

---

Inspirado pelo [MITRE ATT&CK®](https://attack.mitre.org/) e pelo [OWASP](https://owasp.org/).
