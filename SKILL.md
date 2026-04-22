# Skill: Analyze Code Against Arachne Attack Matrix

## Purpose
Systematically analyze a codebase or specific code sections to identify potential vulnerabilities and attack vectors covered by the Arachne Web Application Attack Matrix.

## Scope
Workspace-scoped for the Arachne project and web applications using the Arachne framework.

## Workflow

### 1. **Scope Definition**
   - Identify what part of the code to analyze (entire app, specific module, authentication layer, etc.)
   - Clarify the analysis goal (security audit, threat modeling, validation, etc.)

### 2. **Code Review Against Arachne Tactics**
   Review code for each Arachne tactic in order:
   - **Reconnaissance**: Check for exposed endpoints, debug info, sensitive data in responses
   - **Initial Access**: Look for weak authentication entry points, default credentials, unpatched endpoints
   - **Injection**: Scan for SQLi, XSS, SSTI, command injection, XXE vulnerabilities
   - **Authentication**: Review session handling, JWT validation, password storage, MFA
   - **Authorization**: Check for IDOR, privilege escalation paths, path traversal, role-based access control
   - **Exfiltration**: Identify potential data leak vectors (SSRF, uncontrolled API access, logging)
   - **Impact**: Assess RCE risks, DoS vectors, defacement possibilities

### 3. **Identify Vulnerable Patterns**
   For each tactic, note:
   - Specific code locations (file, line number)
   - Which Arachne technique(s) apply
   - Risk level (critical/high/medium/low)
   - Brief description of the vulnerability

### 4. **Assess and Prioritize**
   - Categorize findings by severity and exploitability
   - Flag issues that require immediate remediation
   - Suggest proof-of-concept or validation approach

### 5. **Output/Report**
   Generate a structured assessment with:
   - Tactic → Technique → Code Location mapping
   - Risk rating per finding
   - Recommendations for remediation
   - Reference to relevant Arachne documentation

## Example Prompts
- "Analyze this authentication code against Arachne. Which tactics are most at risk?"
- "Map potential vulnerabilities in this API endpoint to Arachne techniques. What should we test?"
- "Review this form handler for Arachne injection vectors. Flag critical issues."
- "Generate a threat model for the user registration flow using Arachne tactics."

## Related Skills/Next Steps
- Create a **Remediation Checklist Skill**: Map each Arachne finding to defensive practices
- Create a **Test Case Generation Skill**: Auto-generate security tests for each Arachne technique
- Create a **Code Review Checklist Skill**: Systematic security review template using Arachne
