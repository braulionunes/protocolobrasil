# ProtocoloBrasil — Guia de Deploy em Produção

## Stack
- **Frontend**: HTML + CSS + JS puro (sem framework)
- **Edge Functions**: Vercel (Node.js serverless)
- **Banco de dados**: Supabase (PostgreSQL)
- **IA**: Anthropic Claude (via Edge Function segura)
- **Hospedagem**: Vercel (CDN global)

---

## Passo a Passo: Do zero ao ar em ~30 minutos

### 1. Criar conta Supabase (gratuito)

1. Acesse https://supabase.com e crie uma conta
2. Clique em **"New Project"**
3. Nome: `protocolobrasil` · Senha forte · Região: `South America (São Paulo)`
4. Aguarde o projeto inicializar (~2 min)
5. Vá em **SQL Editor** e execute o conteúdo de `supabase_schema.sql`
6. Anote as credenciais em **Settings → API**:
   - `Project URL` → será sua `SUPABASE_URL`
   - `service_role` key → será sua `SUPABASE_SERVICE_KEY` (⚠️ nunca exponha no frontend)

### 2. Criar conta Vercel (gratuito)

1. Acesse https://vercel.com e crie uma conta (login com GitHub recomendado)
2. Instale o CLI: `npm i -g vercel`

### 3. Configurar variáveis de ambiente

```bash
cd protocolobrasil
vercel env add ANTHROPIC_API_KEY
# Cole sua chave da Anthropic (https://console.anthropic.com)

vercel env add SUPABASE_URL
# Cole a URL do Supabase (ex: https://xyzxyz.supabase.co)

vercel env add SUPABASE_SERVICE_KEY
# Cole a service_role key do Supabase
```

### 4. Deploy

```bash
npm install
vercel --prod
```

O Vercel vai perguntar:
- **Set up and deploy?** → Y
- **Which scope?** → sua conta
- **Link to existing project?** → N
- **Project name** → `protocolobrasil`
- **Directory** → `.` (raiz)

Após o deploy você receberá uma URL como `https://protocolobrasil.vercel.app`

### 5. Domínio personalizado (protocolobrasil.com.br)

1. Registre o domínio em https://registro.br (~R$40/ano — **domínio disponível** ✅)
2. No painel Vercel → seu projeto → **Settings → Domains**
3. Adicione `protocolobrasil.com.br` e `www.protocolobrasil.com.br`
4. No Registro.br, configure os DNS apontando para os servidores do Vercel:
   ```
   Tipo A     @    76.76.21.21
   Tipo CNAME www  cname.vercel-dns.com
   ```
5. Aguarde propagação DNS (5-30 minutos)

---

## Estrutura do projeto

```
protocolobrasil/
├── api/
│   ├── chat.js          # Edge Function: proxy seguro Anthropic
│   ├── log.js           # Edge Function: salva consulta no Supabase
│   └── analytics.js     # Edge Function: busca dados do Supabase
├── public/
│   ├── index.html       # Frontend principal
│   ├── style.css        # Estilos (gerar com script abaixo)
│   ├── app.js           # Lógica frontend
│   └── pcdt-data.js     # Base de 112 PCDTs (atualizar quando sair portaria)
├── supabase_schema.sql  # Schema do banco (executar no Supabase)
├── vercel.json          # Configuração Vercel
├── package.json
└── README.md
```

---

## Atualizar um PCDT

Edite o arquivo `public/pcdt-data.js` e faça redeploy:

```bash
vercel --prod
```

---

## Monitoramento

- **Logs**: Vercel Dashboard → Functions → Logs
- **Banco**: Supabase Dashboard → Table Editor → consultas
- **Analytics**: Na plataforma, aba "Analytics" (carrega direto do Supabase)
- **Erros API**: Vercel Dashboard → your project → Deployments

---

## Estimativa de custos mensais (em escala)

| Serviço | Plano gratuito | Quando pagar |
|---------|---------------|--------------|
| Vercel | 100GB bandwidth/mês | >100GB ou equipe |
| Supabase | 500MB banco, 2GB bandwidth | >500MB dados |
| Anthropic | Pago por uso | ~$0.003 por consulta (Sonnet) |

Para os primeiros **1.000 médicos** fazendo **5 consultas/mês** = ~R$75/mês só na API da Anthropic.

---

## LGPD — Dados coletados

A plataforma coleta e armazena:
- CRM (identificador profissional — não é dado pessoal direto)
- UF e Especialidade
- Texto da consulta (sem dados de pacientes)
- Timestamp

**Não coleta**: nome completo, CPF, e-mail, dados de pacientes.

Recomenda-se adicionar uma Política de Privacidade em `/politica-privacidade` antes do lançamento público.

---

## Próximas funcionalidades sugeridas

- [ ] Autenticação com e-mail (Supabase Auth)
- [ ] Plano premium com histórico ilimitado e relatórios customizados
- [ ] Integração com CFM API para validação de CRM
- [ ] Notificações push quando sair novo PCDT
- [ ] App mobile (PWA já funciona — adicionar manifest.json)
- [ ] Webhook para atualização automática de PCDTs via CONITEC RSS
