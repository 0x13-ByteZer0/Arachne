# Arachne Web Application Attack Matrix - Coverage Report

## Overview
**Total Techniques:** 88  
**Total Tactics:** 19  
**Focus:** Web Applications + WAF Evasion + Practical Testing

---

## Tactics Breakdown

| # | Tactic | Techniques | Color |
|---|--------|-----------|-------|
| 1 | Reconhecimento | W001-W003, W023-W025 (6) | Purple |
| 2 | Acesso Inicial | W004-W006, W026-W027 (5) | Red |
| 3 | Injeção | W007-W031 (25) | Orange |
| 4 | Autenticação | W011-W013, W032-W033 (5) | Blue |
| 5 | Autorização | W014-W016, W037-W038 (5) | Green |
| 6 | Exfiltração | W017-W019, W034-W036, W060-W062 (9) | Pink |
| 7 | Impacto | W020-W022, W039-W042 (7) | Red |
| 8 | Defense Evasion | W043-W049 (7) | Pink |
| 9 | Persistence | W050-W054 (5) | Amber |
| 10 | Lateral Movement | W055-W059 (5) | Green |
| 11 | Command & Control | W063-W065 (3) | Purple |
| 12 | Security Misconfiguration | W066-W069 (4) | Amber |
| 13 | Cryptographic & Weak Crypto | W070-W073 (4) | Purple |
| 14 | CSRF & State-Changing Attacks | W074-W076 (3) | Pink |
| 15 | Protocol & Transport Attacks | W077-W079 (3) | Cyan |
| 16 | Type & Language Specific | W080-W082 (3) | Purple |
| 17 | AI & Emerging Threats | W083-W086 (4) | Red |
| 18 | Logging & Monitoring Bypass | W087-W088 (2) | Green |

---

## OWASP Top 10 2023 Mapping

### ✅ A1: Broken Access Control
- **W014:** IDOR (Insecure Direct Object Reference)
- **W015:** Privilege Escalation (Vertical/Horizontal)
- **W016:** Path Traversal
- **W037:** Business Logic Bypass
- **W055-W059:** Lateral Movement Techniques

### ✅ A2: Cryptographic Failures
- **W070:** Weak Cryptographic Algorithm Usage (MD5, SHA-1, DES)
- **W071:** Weak Random Number Generation
- **W072:** Insufficient Key Length
- **W073:** Hardcoded Encryption Keys

### ✅ A3: Injection
- **W007:** SQL Injection (In-band, Blind, Out-of-band)
- **W008:** Cross-Site Scripting (Reflected, Stored, DOM-based)
- **W009:** Command Injection (OS, LDAP, XPath)
- **W010:** Server-Side Template Injection (Jinja2, Twig, Freemarker)
- **W028:** XML External Entity Injection (XXE)
- **W029:** Insecure Deserialization
- **W030:** NoSQL Injection
- **W031:** Expression Language Injection (Spring EL, OGNL)

### ✅ A4: Insecure Design
- **W021:** Denial of Service (ReDoS, Billion Laughs, Resource Exhaustion)
- **W037:** Business Logic Bypass
- **W074:** Cross-Site Request Forgery (CSRF)
- **W075:** Open Redirect
- **W076:** Cache Poisoning

### ✅ A5: Security Misconfiguration
- **W066:** CORS Misconfiguration
- **W067:** Default Credentials
- **W068:** Directory Listing
- **W069:** HTTP Methods Misconfiguration (TRACE, DEBUG, PUT/DELETE)

### ✅ A6: Vulnerable and Outdated Components
- **W006:** Supply Chain Attacks
- **W051:** Backdoored Dependency Injection

### ✅ A7: Identification and Authentication Failures
- **W004:** Phishing (Targeted)
- **W005:** Authentication Exploitation (Credential Stuffing, Brute Force)
- **W011:** Session Hijacking
- **W012:** JWT Attacks
- **W013:** OAuth Abuse
- **W032:** Brute Force de 2FA
- **W033:** Password Reset Attacks

### ✅ A8: Software and Data Integrity Failures
- **W006:** Supply Chain
- **W051:** Backdoored Dependencies
- **W052:** Hardcoded Secrets in Code
- **W077:** HTTP Request Smuggling
- **W078:** WebSocket Abuse

### ✅ A9: Logging and Monitoring Failures
- **W049:** Log Evasion
- **W087:** Blind Injection Without Visible Feedback
- **W088:** Security Event Obfuscation

### ✅ A10: Server-Side Request Forgery (SSRF)
- **W018:** SSRF (Internal Network Scanning, Cloud Metadata)

---

## Critical CVE/CWE Coverage

| CWE | Description | Technique |
|-----|-------------|-----------|
| CWE-79 | Cross-site Scripting | W008 |
| CWE-89 | SQL Injection | W007 |
| CWE-352 | CSRF | W074 |
| CWE-434 | Unrestricted File Upload | W038, W050 |
| CWE-22 | Path Traversal | W016 |
| CWE-327 | Weak Cryptography | W070 |
| CWE-502 | Insecure Deserialization | W029 |
| CWE-639 | Authorization Bypass | W014, W015 |
| CWE-918 | SSRF | W018 |
| CWE-601 | Open Redirect | W075 |
| CWE-444 | HTTP Request Smuggling | W077 |
| CWE-347 | Cryptographic Signature Verification Failure | W012 |
| CWE-338 | Weak RNG | W071 |
| CWE-1321 | Prototype Pollution | W081 |
| CWE-843 | Type Confusion | W080 |
| CWE-942 | CORS Misconfiguration | W066 |

---

## Modern & Emerging Threats (2024-2026)

### AI/ML Threats
- **W083:** GenAI Prompt Injection (GPT, Claude, LLaMA exploits)
- **W084:** Container/Sandbox Escape (Docker, Kubernetes, WASM)
- **W085:** ML Model Poisoning (Training Data Injection)

### Advanced Techniques
- **W043-W049:** WAF Evasion (7 techniques)
- **W077-W079:** Protocol Attacks (HTTP/2 HPACK, Request Smuggling)
- **W080-W082:** Type-Based Attacks (Prototype Pollution, Type Juggling)
- **W086:** API Rate Limit Bypass Sophistication

---

## WAF Evasion Coverage

| Technique | Methods |
|-----------|---------|
| **Encoding** | URL, Double, UTF-8, Hex, Unicode |
| **Case Variation** | Mixed case, UPPERCASE, lowercase |
| **Whitespace** | Newlines, tabs, null bytes, comments |
| **Polyglots** | Multi-context valid payloads |
| **Semantic Equivalence** | Alternative syntax with same logic |
| **Fragmentation** | Payload split across requests |
| **Log Evasion** | CRLF injection, log truncation |

---

## Practical Examples Included

- SQL Injection with payloads (W007)
- XSS with DOMPurify examples (W008)
- JWT algorithm confusion (W012)
- IDOR with code samples (W014)
- XXE with DTD payloads (W028)
- Webshell PHP/Polyglot (W050)
- CSRF with code examples (W074)
- HTTP Request Smuggling diagrams (W077)
- Type juggling in PHP/JS (W080)
- Prototype pollution patterns (W081)
- GenAI jailbreak examples (W083)

---

## Key Features

✅ **Web-focused:** No systemics attacks, pure web app vulnerabilities  
✅ **Functional:** Every technique is testable and applicable  
✅ **Complete:** All OWASP Top 10 2023 covered  
✅ **Modern:** Includes 2024-2026 threats (AI, containers, advanced exploits)  
✅ **WAF-aware:** 23 techniques specifically for WAF evasion  
✅ **Well-referenced:** CWE, CVE, OWASP mappings  
✅ **Code examples:** SQL injection, XSS, CSRF, etc.  

---

## How to Use

1. **Open index.html** - Interactive matrix interface
2. **Filter by severity** - 1 (Info) to 4 (Critical)
3. **Search techniques** - Find by name or keyword
4. **Click technique** - View details, sub-techniques, mitigations
5. **Cross-reference** - CWE/CVE in each technique

---

## Updates & Contributions

Matrix is maintained for:
- Latest OWASP Top 10 versions
- New CVEs/CWEs (quarterly reviews)
- Emerging threats (AI, cloud-native, zero-days)
- WAF bypass techniques (community-driven)

Generated: April 2026  
Version: 2.0
