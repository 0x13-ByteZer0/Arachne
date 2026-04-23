# Attack Chains — Cadeias de Ataque Completas

## Visão Geral

O Arachne agora inclui **10 cadeias de ataque pré-mapeadas** que mostram o caminho completo desde o **reconhecimento até a exploração final**, incluindo:

- **Sequência de técnicas** necessárias
- **Duração de cada etapa**
- **Dificuldade geral**
- **Impacto final** esperado
- **Requisitos prévios** entre técnicas

---

## Cadeias Disponíveis

### 1. **Phishing → Credential Theft → Account Takeover**
- **Dificuldade:** Fácil
- **Timeframe:** 1-2 semanas
- **Impacto:** Account Takeover - Acesso total à conta
- **Técnicas:** W004 → W005 → W040
- **Fluxo:**
  - Criar página de phishing (1-2 dias)
  - Capturar credenciais da vítima (instantâneo)
  - Fazer login com credenciais roubadas (instantâneo)

---

### 2. **Recon → SQLi → Data Exfiltration → RCE** ⭐ TOP
- **Dificuldade:** Intermediário
- **Timeframe:** 2-4 semanas
- **Impacto:** RCE - Controle total do servidor
- **Técnicas:** W001 → W002 → W007 → W062 → W022
- **Fluxo:**
  - Fingerprinting (1-3 dias) — Identificar stack técnico
  - Mapeamento de endpoints (2-5 dias) — Descobrir formulários vulneráveis
  - SQL Injection (1-3 dias) — Injetar em search/login
  - Extração blind de dados (1-2 dias) — Time-based SQLi para admin creds
  - RCE via SQLi (1 dia) — into outfile ou stored procedures

---

### 3. **OSINT → Subdomain Discovery → Admin Panel Access**
- **Dificuldade:** Fácil
- **Timeframe:** 1-3 semanas
- **Impacto:** Admin Access - Acesso a painel administrativo
- **Técnicas:** W003 → W023 → W024 → W058
- **Fluxo:**
  - Google dorks + GitHub search (2-5 dias)
  - DNS enumeration / bruteforce (1-3 dias)
  - Certificate Transparency analysis (1 dia)
  - Testar admin panels com default credentials (1-2 dias)

---

### 4. **XSS Stored → Session Hijacking → Data Theft** 🔥
- **Dificuldade:** Intermediário
- **Timeframe:** 1-2 semanas
- **Impacto:** Account Takeover - Roubo de sessão de múltiplos usuários
- **Técnicas:** W008 → W011 → W040
- **Fluxo:**
  - Injetar XSS em campo persistido (1-3 dias)
  - Script rouba cookies de sessão de todos os visitantes (contínuo)
  - Usar cookies para fazer login como outras contas (instantâneo por cookie)

---

### 5. **CORS Misconfiguration → Data Exfiltration**
- **Dificuldade:** Fácil
- **Timeframe:** 1-2 semanas
- **Impacto:** Data Exfiltration - Roubo de dados de usuários
- **Técnicas:** W066 → W017
- **Fluxo:**
  - Identificar wildcard CORS (*) ou validação fraca (1-3 dias)
  - Fazer requisições cross-origin sem restrição (1 dia)

---

### 6. **File Upload → Webshell → C2 Communication** 💻
- **Dificuldade:** Intermediário
- **Timeframe:** 1-3 semanas
- **Impacto:** Persistent Access - Acesso contínuo ao servidor
- **Técnicas:** W038 → W050 → W063
- **Fluxo:**
  - Contornar validação de upload (2-5 dias) — Double extension, polyglot, MIME bypass
  - Upload webshell PHP/Aspx (1 dia)
  - Estabelecer C2 remoto via HTTP (contínuo)

---

### 7. **IDOR → Lateral Movement → Multi-Tenant Data Breach** 💾
- **Dificuldade:** Intermediário
- **Timeframe:** 2-4 semanas
- **Impacto:** Data Breach - Acesso a dados de múltiplos usuários/tenants
- **Técnicas:** W014 → W055 → W059
- **Fluxo:**
  - Manipular user ID em URL para IDOR (1-3 dias)
  - Usar tokens de serviço para API-to-API abuse (2-5 dias)
  - Manipular tenant ID para acesso multi-tenant (1-2 dias)

---

### 8. **SSRF → Internal Network Scanning → RCE** 🌐
- **Dificuldade:** Intermediário
- **Timeframe:** 2-3 semanas
- **Impacto:** RCE - Acesso a infraestrutura interna
- **Técnicas:** W002 → W018 → W022
- **Fluxo:**
  - Descobrir endpoints que aceitam URLs (1-3 dias)
  - Forçar requisições internas (localhost, 10.0.0.x, metadata 169.254) (2-5 dias)
  - Acessar admin panels ou services vulneráveis (Redis, Memcached) (1-2 dias)

---

### 9. **JWT Algorithm Confusion → Privilege Escalation**
- **Dificuldade:** Intermediário
- **Timeframe:** 1-3 semanas
- **Impacto:** Privilege Escalation - Acesso com permissões de admin
- **Técnicas:** W012 → W015
- **Fluxo:**
  - Capturar JWT e tentar RS256 → HS256 confusion (1-3 dias)
  - Modificar payload (role: admin) e assinar com chave pública como HMAC (1 dia)

---

### 10. **WAF Bypass → SQLi → RCE (Advanced)** 🚀
- **Dificuldade:** Avançado
- **Timeframe:** 3-6 semanas
- **Impacto:** RCE - Controle total com evasão de detecção
- **Técnicas:** W043 → W044 → W045 → W007 → W022
- **Fluxo:**
  - Codificação bypass (double encoding, UTF-8) (2-5 dias)
  - Case variation bypass (UNION/union, SELECT/select) (1-2 dias)
  - Whitespace/null byte bypass (%0a, %00) (1-2 dias)
  - Executar SQLi que passou pelo WAF (1-3 dias)
  - RCE via into outfile (1 dia)

---

## Como Usar as Attack Chains

### 1. **Via Interface Web**
- Clique no botão **"🔗 Attack Chains"** na navbar
- Selecione uma cadeia para ver a sequência completa
- Clique em cada técnica para visualizar detalhes

### 2. **Via Documentação**
- Cada cadeia está documentada aqui com passos detalhados
- Timeframes são baseados em dificuldade e assume adversário com skills intermediários

### 3. **Planejamento de Defesa**
- Use cadeias para entender **pontos de falha críticos**
- Implemente mitigações em cada etapa
- Priorize detecção e response em etapas intermediárias

---

## Pré-requisitos por Cadeia

| Cadeia | Pré-requisitos |
|--------|---|
| Phishing | Email list, hosting para página falsa |
| Recon → SQLi → RCE | Aplicação web vulnerável, SQL injectable |
| OSINT → Admin | Padrões enumeration conhecidos |
| XSS → Hijacking | Campo user-input com persistência |
| CORS | Wildcard CORS ou validação fraca |
| File Upload | Validação fraca de tipo/conteúdo |
| IDOR → Multi-tenant | Aplicação com modelo de dados previsível |
| SSRF → RCE | Service vulnerável (Redis, etc) ou admin panel |
| JWT Confusion | JWT token capturado + RS256 → HS256 |
| WAF Bypass | WAF rule-based + SQLi injection point |

---

## Estratégias de Mitigação em Cadeia

Para cada cadeia, bloquear em **múltiplos pontos**:

### Cadeia 2 (Recon → SQLi → RCE)
1. ❌ **Fingerprinting:** Headers genéricos, error handling
2. ❌ **Endpoint Discovery:** Rate limiting, WAF
3. ❌ **SQLi:** Prepared statements, input validation
4. ❌ **Data Exfiltration:** IDS/behavioral detection
5. ❌ **RCE:** Least privilege database user

---

## Dificuldade vs Timeframe

- **Fácil + 1-2 semanas:** OSINT + Admin access
- **Intermediário + 1-3 semanas:** XSS + hijacking, CORS
- **Intermediário + 2-4 semanas:** SQLi completa, IDOR
- **Avançado + 3-6 semanas:** WAF bypass + RCE

---

## Próximas Atualizações

- [ ] API abuse chains
- [ ] Container/cloud escape chains
- [ ] Post-exploitation chains
- [ ] Lateral movement chains
- [ ] Data exfiltration techniques
- [ ] Persistence chains

---

## Referencias

Cadeias baseadas em:
- MITRE ATT&CK Frameworks
- OWASP Top 10
- Real-world penetration tests
- CVE analysis
