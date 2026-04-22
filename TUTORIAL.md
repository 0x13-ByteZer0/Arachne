# Tutorial: Subindo o Arachne no GitHub Pages

## Pré-requisitos
- Conta no GitHub
- Git instalado na máquina

---

## Passo 1 — Crie o repositório no GitHub

1. Acesse github.com e clique em **New repository**
2. Nome: `arachne`
3. Visibilidade: **Public** (obrigatório para GitHub Pages gratuito)
4. **Não** marque "Initialize this repository" (vamos fazer isso localmente)
5. Clique em **Create repository**

---

## Passo 2 — Suba os arquivos

Abra o terminal na pasta do projeto e rode:

```bash
git init
git add .
git commit -m "feat: initial release — Arachne v0.1.0"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/arachne.git
git push -u origin main
```

> Substitua `SEU_USUARIO` pelo seu usuário do GitHub.

---

## Passo 3 — Ative o GitHub Pages

1. No repositório, clique em **Settings**
2. No menu lateral, clique em **Pages**
3. Em **Source**, selecione **GitHub Actions**
4. Pronto! O workflow `.github/workflows/pages.yml` faz o deploy automaticamente

---

## Passo 4 — Acesse o site

Após o primeiro push, aguarde ~1 minuto e acesse:

```
https://SEU_USUARIO.github.io/arachne
```

Você pode ver o progresso do deploy em **Actions** no repositório.

---

## Atualizando o conteúdo

Qualquer push para a branch `main` dispara um novo deploy automaticamente:

```bash
# Após editar data/techniques.js ou index.html
git add .
git commit -m "feat: adiciona técnica W023 - XXE Injection"
git push
```

---

## Domínio customizado (opcional)

Se você tiver um domínio próprio (ex: `arachne.sec`):

1. Em **Settings > Pages**, adicione seu domínio em **Custom domain**
2. No seu provedor DNS, adicione um registro CNAME:
   ```
   www  →  SEU_USUARIO.github.io
   ```
3. Marque **Enforce HTTPS**

---

## Estrutura final do repositório

```
arachne/
├── index.html              ← aplicação principal
├── data/
│   └── techniques.js       ← base de dados (edite aqui para adicionar técnicas)
├── .github/
│   └── workflows/
│       └── pages.yml       ← deploy automático
├── CONTRIBUTING.md
├── LICENSE-CODE            ← MIT
├── LICENSE-CONTENT         ← CC BY 4.0
├── .gitignore
└── README.md
```

---

## Problemas comuns

**Deploy falhou?**
- Verifique em **Actions** qual step falhou
- Certifique-se que o repositório é **Public**

**Site mostrando 404?**
- Aguarde 2-3 minutos após o primeiro deploy
- Confirme que o arquivo `index.html` está na raiz do repositório

**Técnicas não aparecem?**
- Verifique se `data/techniques.js` está correto (abra o console do navegador)
- O arquivo deve exportar a variável `tactics` sem erros de sintaxe
