# Contribuindo com o Arachne

Obrigado por querer contribuir! O Arachne é um projeto colaborativo e toda contribuição é bem-vinda.

## Como contribuir

### Adicionando ou melhorando técnicas

Edite o arquivo `data/techniques.js`. Cada técnica segue este formato:

```js
{
  id: "W0XX",           // ID único sequencial
  name: "Nome da técnica",
  subs: [               // Sub-técnicas (opcional)
    "Variante 1",
    "Variante 2"
  ],
  desc: "Descrição detalhada explicando o ataque, como funciona e seu impacto.",
  severity: 3,          // 1=Baixa, 2=Média, 3=Alta, 4=Crítica
  mitigations: [        // Lista de mitigações recomendadas
    "Mitigação 1",
    "Mitigação 2"
  ],
  references: [         // CWEs, OWASP, CVEs, writeups
    "CWE-XXX",
    "OWASP AXX"
  ]
}
```

### Processo

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b feat/nova-tecnica`
3. Faça suas alterações
4. Abra um Pull Request descrevendo o que foi adicionado/alterado

### Diretrizes de qualidade

- Descrições devem ser claras e técnicas, mas acessíveis
- Toda técnica deve ter ao menos uma mitigação
- Prefira referências a fontes reconhecidas (OWASP, CWE, CVE, PortSwigger)
- Severidade deve ser justificável pelo impacto real

### Reportando problemas

Abra uma [Issue](../../issues) descrevendo o problema ou sugestão.

## Licença do conteúdo contribuído

Ao contribuir, você concorda que seu conteúdo será licenciado sob [CC BY 4.0](LICENSE-CONTENT).
