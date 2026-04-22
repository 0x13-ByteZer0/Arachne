// Arachne — Web Application Attack Matrix
// Conteúdo licenciado sob CC BY 4.0
// Contribua em: https://github.com/SEU_USUARIO/arachne

const tactics = [
  {
    id: "TA-W01",
    name: "Reconhecimento",
    color: "#a78bfa",
    techniques: [
      {
        id: "W001",
        name: "Fingerprinting de tecnologia",
        subs: ["Cabeçalhos HTTP", "Erros verbosos", "Metadados de framework", "Cookies de sessão"],
        desc: "Identificar tecnologias, versões e frameworks usados pela aplicação através de respostas HTTP, cabeçalhos, cookies e mensagens de erro. Informações como X-Powered-By, Server, e padrões de cookies podem revelar o stack tecnológico.",
        severity: 2,
        mitigations: ["Remover headers X-Powered-By e Server", "Páginas de erro genéricas", "Cookies com nomes neutros"],
        references: ["OWASP OTG-INFO-002", "CWE-200"]
      },
      {
        id: "W002",
        name: "Mapeamento de endpoints",
        subs: ["Fuzzing de paths", "Crawling", "JS parsing", "API schema discovery"],
        desc: "Descobrir endpoints, APIs e funcionalidades ocultas por meio de rastreamento automatizado, força bruta de diretórios e análise de arquivos JavaScript que revelam rotas internas.",
        severity: 2,
        mitigations: ["Rate limiting em 404s", "Não expor rotas em JS público", "robots.txt cuidadoso"],
        references: ["OWASP OTG-INFO-007"]
      },
      {
        id: "W003",
        name: "OSINT de aplicação",
        subs: ["Google dorks", "Shodan", "Wayback Machine", "GitHub leaks"],
        desc: "Coleta de informações públicas sobre a aplicação usando motores de busca, arquivos históricos, bancos de dados de ativos expostos e repositórios de código com segredos acidentalmente commitados.",
        severity: 1,
        mitigations: ["Monitorar exposição pública", "Escanear repositórios com git-secrets", "Google Alerts"],
        references: ["OWASP OTG-INFO-001"]
      }
    ]
  },
  {
    id: "TA-W02",
    name: "Acesso Inicial",
    color: "#f87171",
    techniques: [
      {
        id: "W004",
        name: "Phishing direcionado",
        subs: ["Link malicioso", "Formulário falso", "OAuth phishing"],
        desc: "Enganar usuários para capturar credenciais ou sessões via páginas falsas que imitam a aplicação legítima, explorando confiança na marca e urgência.",
        severity: 3,
        mitigations: ["MFA obrigatório", "Anti-phishing training", "DMARC/DKIM/SPF"],
        references: ["OWASP A7", "NIST SP 800-63B"]
      },
      {
        id: "W005",
        name: "Exploração de autenticação",
        subs: ["Credential stuffing", "Brute force", "Default credentials", "Password spraying"],
        desc: "Tentativas de acesso usando credenciais vazadas de outros serviços, senhas comuns, padrões de fábrica ou ataques de força bruta distribuídos para evitar lockout.",
        severity: 3,
        mitigations: ["Lockout de conta progressivo", "MFA", "Captcha", "Detecção de anomalia"],
        references: ["OWASP A7", "CWE-307"]
      },
      {
        id: "W006",
        name: "Supply chain",
        subs: ["Pacotes npm maliciosos", "CDN comprometido", "Typosquatting"],
        desc: "Comprometer a aplicação via dependências de terceiros mal protegidas, pacotes com nomes similares a libs populares ou CDNs que servem scripts modificados.",
        severity: 4,
        mitigations: ["Subresource Integrity (SRI)", "Lock files versionados", "Auditoria de dependências"],
        references: ["CWE-829", "OWASP A8"]
      }
    ]
  },
  {
    id: "TA-W03",
    name: "Injeção",
    color: "#fb923c",
    techniques: [
      {
        id: "W007",
        name: "SQL Injection",
        subs: ["In-band", "Blind boolean", "Time-based blind", "Out-of-band"],
        desc: "Inserção de código SQL malicioso em entradas de usuário para manipular, exfiltrar ou destruir dados do banco. É uma das vulnerabilidades mais críticas e prevalentes em aplicações web.",
        severity: 4,
        mitigations: ["Prepared statements", "ORMs com binding", "WAF", "Princípio do menor privilégio no DB"],
        references: ["CWE-89", "OWASP A3", "OWASP Top 10"]
      },
      {
        id: "W008",
        name: "Cross-Site Scripting",
        subs: ["Reflected", "Stored", "DOM-based", "mXSS"],
        desc: "Injeção de scripts maliciosos em páginas web para roubo de sessão, defacement, keylogging ou redirecionamento de usuários. Stored XSS persiste no banco e afeta múltiplos usuários.",
        severity: 3,
        mitigations: ["Content Security Policy (CSP)", "Output encoding contextual", "HttpOnly cookies", "DOMPurify"],
        references: ["CWE-79", "OWASP A3"]
      },
      {
        id: "W009",
        name: "Command Injection",
        subs: ["OS command", "LDAP injection", "XPath injection", "Header injection"],
        desc: "Execução de comandos do sistema operacional ou outros interpreters (LDAP, XPath) via entrada de usuário não sanitizada que é passada diretamente para chamadas de sistema.",
        severity: 4,
        mitigations: ["Evitar exec de comandos com input de usuário", "Validação e allowlist rigorosa", "Containerização"],
        references: ["CWE-78", "CWE-90"]
      },
      {
        id: "W010",
        name: "Server-Side Template Injection",
        subs: ["Jinja2", "Twig", "Freemarker", "Pebble"],
        desc: "Exploração de engines de template que processam input de usuário como código de template, permitindo execução de código arbitrário no contexto do servidor.",
        severity: 4,
        mitigations: ["Nunca renderizar input de usuário como template", "Sandbox de templates", "Atualizar engines"],
        references: ["CWE-94", "PortSwigger SSTI"]
      }
    ]
  },
  {
    id: "TA-W04",
    name: "Autenticação",
    color: "#60a5fa",
    techniques: [
      {
        id: "W011",
        name: "Session hijacking",
        subs: ["Cookie theft via XSS", "Session fixation", "Session prediction", "CSRF"],
        desc: "Roubo, fixação ou falsificação de tokens de sessão para personificar usuários autenticados sem conhecer suas credenciais.",
        severity: 3,
        mitigations: ["HttpOnly + Secure + SameSite=Strict cookies", "Regenerar ID após login", "Timeout de sessão", "CSRF tokens"],
        references: ["OWASP A7", "CWE-384"]
      },
      {
        id: "W012",
        name: "JWT attacks",
        subs: ["Algorithm none", "RS256 → HS256 confusion", "Weak secret brute force", "Kid injection"],
        desc: "Exploração de tokens JWT mal configurados para forjar identidade, elevar privilégios ou bypassar autenticação via manipulação do header ou payload.",
        severity: 3,
        mitigations: ["Validar alg explicitamente no servidor", "Chaves fortes (256+ bits)", "Biblioteca atualizada", "Validar claims"],
        references: ["CWE-347", "RFC 8725"]
      },
      {
        id: "W013",
        name: "OAuth abuse",
        subs: ["Open redirect", "State parameter bypass", "Token leakage via referrer", "Implicit flow abuse"],
        desc: "Manipulação de fluxos OAuth/OIDC para sequestro de authorization codes, roubo de tokens de acesso ou redirecionamento malicioso após autenticação.",
        severity: 3,
        mitigations: ["Validar redirect_uri estritamente", "State param obrigatório", "PKCE para public clients", "Curta expiração de codes"],
        references: ["RFC 6749", "OWASP OAuth Cheat Sheet"]
      }
    ]
  },
  {
    id: "TA-W05",
    name: "Autorização",
    color: "#4ade80",
    techniques: [
      {
        id: "W014",
        name: "IDOR",
        subs: ["ID numérico sequencial", "Referência direta a arquivo", "UUID previsível", "Mass assignment"],
        desc: "Acesso não autorizado a recursos pertencentes a outros usuários pela manipulação de identificadores previsíveis em parâmetros de URL, body ou headers.",
        severity: 3,
        mitigations: ["Verificação de ownership server-side", "UUIDs v4 aleatórios", "Indirect reference maps", "Logs de acesso"],
        references: ["OWASP A5", "CWE-639"]
      },
      {
        id: "W015",
        name: "Escalada de privilégio",
        subs: ["Vertical (user → admin)", "Horizontal (user A → user B)", "Parameter tampering"],
        desc: "Ganho de permissões além das autorizadas, acessando funcionalidades administrativas ou dados de outros usuários via manipulação de parâmetros ou bypass de verificações client-side.",
        severity: 4,
        mitigations: ["RBAC rigoroso server-side", "Nunca confiar em claims client-side", "Middleware de autorização centralizado"],
        references: ["OWASP A5", "CWE-269"]
      },
      {
        id: "W016",
        name: "Path traversal",
        subs: ["../", "URL encoding bypass (%2e%2e)", "Null byte injection", "Double encoding"],
        desc: "Acesso a arquivos arbitrários fora do diretório raiz da aplicação via manipulação de parâmetros de path, contornando validações ingênuas com encodings alternativos.",
        severity: 3,
        mitigations: ["Canonicalização de paths antes de validar", "Chroot/jail", "Allowlist de diretórios permitidos"],
        references: ["CWE-22", "OWASP Path Traversal"]
      }
    ]
  },
  {
    id: "TA-W06",
    name: "Exfiltração",
    color: "#f472b6",
    techniques: [
      {
        id: "W017",
        name: "API data scraping",
        subs: ["Mass assignment", "GraphQL introspection", "Pagination abuse", "Field exposure"],
        desc: "Extração massiva de dados sensíveis através de endpoints de API excessivamente permissivos, falta de paginação adequada ou exposição de campos que não deveriam ser públicos.",
        severity: 3,
        mitigations: ["Rate limiting por usuário", "Field-level authorization", "Desabilitar introspection em prod", "Depth limiting em GraphQL"],
        references: ["OWASP API3", "OWASP API3:2023"]
      },
      {
        id: "W018",
        name: "SSRF",
        subs: ["Internal network scanning", "Cloud metadata (169.254.169.254)", "Blind SSRF", "Protocol smuggling"],
        desc: "Forçar o servidor a realizar requisições HTTP para recursos internos, metadata de cloud ou serviços não expostos publicamente, potencialmente acessando credenciais e segredos.",
        severity: 4,
        mitigations: ["Allowlist de destinos externos", "Bloquear IPs de metadata (169.254.x.x)", "Network segmentation", "Desabilitar redirects"],
        references: ["CWE-918", "OWASP A10", "SSRF Prevention Cheat Sheet"]
      },
      {
        id: "W019",
        name: "Exposição de dados sensíveis",
        subs: ["Stack traces em produção", "Arquivos de backup (.bak, .sql)", "Debug endpoints", ".git exposto"],
        desc: "Acesso a informações sensíveis expostas inadvertidamente: stack traces com detalhes internos, arquivos de backup acessíveis, endpoints de debug ativos em produção ou diretório .git público.",
        severity: 2,
        mitigations: ["Desabilitar debug em produção", "Bloquear acesso a /.git", "Remover arquivos de backup do webroot", "Error handling genérico"],
        references: ["OWASP A2", "CWE-200"]
      }
    ]
  },
  {
    id: "TA-W07",
    name: "Impacto",
    color: "#f87171",
    techniques: [
      {
        id: "W020",
        name: "Defacement",
        subs: ["Via XSS stored", "Via file upload abuse", "Via RCE"],
        desc: "Modificação visual não autorizada da aplicação para danos à reputação, propaganda ou demonstração de comprometimento.",
        severity: 2,
        mitigations: ["Validação rigorosa de uploads", "CSP", "File integrity monitoring", "Read-only filesystem"],
        references: ["OWASP A3"]
      },
      {
        id: "W021",
        name: "Denial of Service aplicacional",
        subs: ["ReDoS (regex)", "Billion laughs (XML)", "Resource exhaustion", "Algorithmic complexity"],
        desc: "Tornar a aplicação indisponível explorando payloads que consomem CPU, memória ou conexões de forma desproporcional, como expressões regulares catastroficamente backtracking.",
        severity: 3,
        mitigations: ["Timeouts por request", "Rate limiting", "Limitar tamanho de input", "Evitar regex vulnerável"],
        references: ["CWE-400", "OWASP DoS Cheat Sheet"]
      },
      {
        id: "W022",
        name: "Remote Code Execution",
        subs: ["Via desserialização insegura", "Via file upload", "Via SSTI", "Via dependency vulnerability"],
        desc: "Execução de código arbitrário no servidor web via exploração de desserialização insegura, upload de arquivos maliciosos ou vulnerabilidades em dependências, podendo levar a controle total do servidor.",
        severity: 4,
        mitigations: ["Nunca deserializar dados não confiáveis", "Validar e sanitizar uploads", "Atualizar dependências", "Princípio do menor privilégio"],
        references: ["CWE-502", "CWE-434", "OWASP A8"]
      }
    ]
  }
];
