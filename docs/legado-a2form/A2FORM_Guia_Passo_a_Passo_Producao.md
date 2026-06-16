# 🚀 A2 FORM Controller — Guia Passo a Passo: Do Mockup à Produção

**Versão:** 1.0 | **Data:** 27/04/2026 | **Para estudo pré-aprovação**

---

## 📌 Situação Atual (AS IS)

O que você já tem pronto:

| Item | Status | Observação |
|---|---|---|
| Mockup funcional (React/Vite/Tailwind) | ✅ Pronto | 19 páginas, 5 perfis, dados mock |
| Proposta Comercial | ✅ Pronto | `A2FORM_Proposta_Comercial.md` |
| Regras de Negócio | ✅ Pronto | `A2FORM_Regras_de_Negocio.md` |
| Apresentação | ✅ Pronto | Apresentada à cliente |
| Autenticação | ❌ Mockada | Login compara strings locais (`mockUsers`) |
| Banco de dados | ❌ Inexistente | Tudo roda com `mockData.ts` em memória |
| Supabase | ❌ Não criado | Sem conta, sem projeto |
| GitHub | ✅ Repositório existe | `a2formcontroller` |
| Vercel | ❌ Não vinculado | Sem deploy de produção |
| `.env` | ❌ Não existe | Sem variáveis de ambiente |

---

## 📋 ETAPA 0 — Perguntas para a Cliente (Karol e Mikaela)

> **OBJETIVO:** Coletar TODAS as informações que a IA precisa para popular o banco de dados real e configurar o sistema. Sem essas respostas, o desenvolvimento fica travado.

### 0.1 🏥 Estrutura Física da ILPI

```
□ Quantas alas existem? (Ex: Ala A, Ala B, Ala C)
□ Qual a nomenclatura de cada ala? (Ex: Masculina A, Masculina B, Feminina C)
□ Quantos leitos em cada ala? (Ex: Ala A = 15 leitos, Ala B = 12 leitos)
□ Existe numeração dos leitos? Se sim, qual o padrão? (Ex: A-01, A-02... ou 101, 102...)
□ Alguma ala é mista (homens e mulheres)?
```

### 0.2 👴 Residentes (Pacientes)

```
□ Lista completa dos residentes ativos com:
  - Nome completo
  - Data de nascimento (ou idade)
  - Sexo (M/F)
  - Ala e Leito atual
  - Doenças crônicas conhecidas (Diabetes, Hipertensão, Demência, etc.)
  - Grau de Dependência ANVISA (I, II ou III) — perguntar à Mikaela
  - Status: Ativo ou Temporada (ortoprazo)?
  - Alguma alergia relevante?
```

### 0.3 👩‍⚕️ Funcionários

```
□ Lista completa dos funcionários com:
  - Nome completo
  - CPF
  - Função/Cargo (Enfermeira Chefe, Enfermeiro, Técnico de Enfermagem, ASG, etc.)
  - Perfil no sistema: Administrador, Enfermeira Chefe, Enfermeiro, ASG
  - Escala de trabalho atual (Semanal seg-sex, 12x36, 24x72?)
  - Horário do turno (Ex: 07:00-19:00, 19:00-07:00, 08:00-17:00)
  - Telefone/WhatsApp (para emergências e acesso)

□ Quem será o Administrador do sistema?
  → É a Karol? Preciso do e-mail dela para criar o login principal.

□ Quem será a Enfermeira Chefe no sistema?
  → É a Mikaela? Preciso do e-mail dela.

□ Existe médico vinculado à ILPI? Se sim:
  - Nome, CRM
  - Ele terá acesso ao sistema?
  - Em quais horários ele atende?
```

### 0.4 📅 Escalas de Trabalho

```
□ Quantas escalas diferentes existem na ILPI?
□ Detalhe cada escala:
  - Nome (Ex: "Diurno 12x36", "Semanal Adm")
  - Tipo: Semanal (seg-sex/seg-sab) | 12x36 | 24x72
  - Horário de entrada e saída
  - Tempo de intervalo (Ex: 1h almoço)
  - Quais funcionários pertencem a cada escala?
```

### 0.5 📋 PIA (Plano Individual de Atendimento)

```
□ A ILPI já utiliza PIA hoje? (mesmo que em papel)
□ Quais campos são obrigatórios no PIA de vocês?
  Sugestões padrão ANVISA RDC 283:
  - Avaliação nutricional
  - Avaliação social
  - Avaliação médica
  - Avaliação funcional (Katz, Barthel ou outro?)
  - Plano de cuidados
  - Metas terapêuticas
□ Quem preenche o PIA? (Enfermeira Chefe? Médico? Equipe multidisciplinar?)
□ Qual a periodicidade de revisão? (mensal, trimestral, semestral?)
```

### 0.6 🎨 Identidade Visual

```
□ A ILPI tem logotipo? Se sim, enviar arquivo (PNG/SVG de boa resolução)
□ Cores da marca? (Ex: azul marinho, dourado, branco)
□ Nome completo da razão social para exibir no sistema
□ CNPJ (para eventual emissão de relatórios)
```

### 0.7 📊 Regras Operacionais Específicas

```
□ Quantos sinais vitais (aferições) são feitos por dia por residente?
  (Ex: 2x/dia - manhã e noite? 3x/dia?)
□ Existem turnos de enfermagem definidos? (manhã, tarde, noite?)
□ Qual o horário de troca de turno?
□ Existe alguma regra específica para hora extra diferente da regra dos 105min?
□ Intervalo é sempre 1h ou varia?
□ Atestados: quem aprova? (Karol? Enfermeira Chefe?)
```

### 0.8 🔐 Credenciais e Acessos (CUIDADO — Tratar com Sigilo)

```
□ E-mail e senha que a Karol quer usar para criar a conta do Supabase
  → (Pode ser o e-mail pessoal dela ou um e-mail institucional)
  → DICA: recomende criar um e-mail institucional tipo admin@aconchegodosavos.com

□ A ILPI possui domínio próprio? (Ex: aconchegodosavos.com.br)
  → Se não, vamos usar o subdomínio gratuito da Vercel (Ex: a2form-aconchego.vercel.app)

□ A ILPI tem Wi-Fi estável? (necessário para o Totem de ponto e acesso ao sistema)
□ Possuem tablet disponível para o Totem? Qual modelo? (Android/iPad?)
```

---

## 🔧 ETAPA 1 — Preparação do Ambiente (Antes de Codar)

> **QUANDO:** Logo após a aprovação da proposta.
> **QUEM FAZ:** Você (gestor).

### Passo 1.1 — Criar o projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Clique em **"Start your project"** → faça login com GitHub ou e-mail
3. Clique em **"New Project"**
4. Configure:
   - **Organization:** Crie uma (ex: "A2 Solutions")
   - **Project name:** `a2form-aconchego`
   - **Database Password:** anote em local seguro (gerenciador de senhas)
   - **Region:** `South America (São Paulo) — sa-east-1`
   - **Pricing Plan:** `Free` para início (migrar para Pro depois)
5. Aguarde o provisionamento (~2 minutos)
6. Vá em **Settings → API** e copie:
   - ✅ `Project URL` (ex: `https://xyzxyz.supabase.co`)
   - ✅ `anon public key` (ex: `eyJhbG...`)
   - ⚠️ `service_role key` → **NÃO compartilhe**, será usada apenas nas variáveis da Vercel

### Passo 1.2 — Criar o arquivo `.env.local`

Cole no chat para a IA as chaves **URL** e **ANON KEY**. A IA criará o arquivo:

```env
# ==========================================
# A2 FORM Controller — Variáveis de Ambiente
# ⚠️  NUNCA suba este arquivo no GitHub!
# ==========================================
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

> O `.gitignore` já possui a regra `*.local` que protege o `.env.local` automaticamente.

### Passo 1.3 — Verificar o `.gitignore`

O `.gitignore` atual já contém `*.local`. A IA adicionará uma linha explícita `.env*` para segurança extra.

---

## 🗄️ ETAPA 2 — Banco de Dados (Supabase SQL)

> **QUEM FAZ:** A IA, 100%.
> **O QUE VOCÊ ENTREGA:** As respostas da ETAPA 0 (listas de residentes, funcionários, escalas).

### Passo 2.1 — A IA cria os scripts SQL de migração

A IA gerará os arquivos SQL na pasta `supabase/migrations/` com:

| Tabela | Descrição |
|---|---|
| `profiles` | Perfis de usuário (id, nome, role, matricula, escala_id) |
| `patients` | Residentes (nome, idade, sexo, ala, leito, grau_dependencia, status) |
| `patient_chronic_diseases` | Doenças crônicas por paciente (N:N) |
| `wards` | Alas (nome, tipo: masc/fem/misto, capacidade) |
| `beds` | Leitos (numero, ala_id, ocupado, patient_id) |
| `schedules` | Escalas de trabalho (nome, tipo, hora_entrada, hora_saida, intervalo) |
| `schedule_assignments` | Vínculo funcionário ↔ escala |
| `attendance_records` | Registros de ponto (4 eventos + foto_url) |
| `overtime_requests` | Solicitações de HE/compensação |
| `clinical_records` | Aferições SSVV (Bloco 1) |
| `daily_evolutions` | Evoluções diárias (Bloco 2) |
| `pia_records` | Plano Individual de Atendimento |
| `medical_certificates` | Atestados médicos |
| `prescriptions` | Prescrições médicas |
| `warnings` | Advertências comportamentais |

### Passo 2.2 — A IA configura o RLS (Row Level Security)

Políticas granulares por perfil:

| Perfil | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| Administrador | Tudo | Tudo | Tudo | Soft delete |
| Enfermeira Chefe | Pacientes + clínico | Não | Não | Não |
| Enfermeiro | Seus registros + pacientes | Aferições + evoluções | Seus registros (24h) | Não |
| Médico | Pacientes + alertas | Prescrições | Prescrições (próprias) | Não |
| ASG | Seu ponto | Seu ponto | Não | Não |

### Passo 2.3 — A IA cria as funções SQL

- `fn_calcular_banco_horas(employee_id)` — saldo em tempo real
- `fn_verificar_regra_105min(attendance_id)` — classificação HE vs plantão extra
- `fn_verificar_irregularidades(employee_id, date)` — flags de atraso/saída antecipada
- `fn_abonar_atestado(certificate_id)` — integração atestado ↔ escala
- `fn_classificar_risco(clinical_record)` — algoritmo de 5 níveis

### Passo 2.4 — A IA configura o Storage

- Bucket `attendance-photos` — fotos do ponto (RLS: INSERT próprio, SELECT admin)
- Bucket `certificates` — atestados médicos (RLS: INSERT próprio, SELECT admin+enf.chefe)

### Passo 2.5 — A IA configura o Realtime

- Channel `clinical_alerts` — alertas de risco para médico/enf. chefe
- Channel `attendance_updates` — atualizações de ponto para admin

### Passo 2.6 — A IA executa o seed (dados iniciais)

Com base nas suas respostas da ETAPA 0, a IA criará scripts de seed para popular:
- Alas e leitos
- Funcionários (com matrículas auto-geradas)
- Residentes (com doenças crônicas e grau de dependência)
- Escalas (com vínculos)

---

## ⚛️ ETAPA 3 — Refatoração do Código (Mockup → Produção)

> **QUEM FAZ:** A IA, 100%.
> **O QUE VOCÊ ENTREGA:** Apenas as chaves do Supabase (ETAPA 1).

### Passo 3.1 — Criar o cliente Supabase

A IA cria `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Passo 3.2 — Substituir o AuthContext (mock → Supabase Auth)

| Antes (mock) | Depois (produção) |
|---|---|
| `mockUsers.find(u => u.username === ...)` | `supabase.auth.signInWithPassword(...)` |
| `useState<User>` | `supabase.auth.getSession()` + listener |
| Sem persistência | JWT com sessão persistente |
| Sem proteção de rota | Guard com redirect para `/login` |

### Passo 3.3 — Criar os hooks de dados

A IA substituirá cada importação de `mockData` por hooks que consultam o Supabase:

| Hook | Substitui | Fonte |
|---|---|---|
| `usePatients()` | `mockPatients` | `supabase.from('patients')` |
| `useClinicalRecords(patientId)` | `mockClinicalRecords` | `supabase.from('clinical_records')` |
| `useAttendance(employeeId)` | `mockAttendanceRecords` | `supabase.from('attendance_records')` |
| `useOvertime()` | `mockOvertimeRequests` | `supabase.from('overtime_requests')` |
| `useSchedules()` | Inline arrays | `supabase.from('schedules')` |
| `useEmployees()` | `mockUsers` filtrado | `supabase.from('profiles')` |

### Passo 3.4 — Adaptar cada página

As 19 páginas serão refatoradas para usar os hooks acima. A IA fará isso página por página, mantendo 100% do layout visual do mockup.

### Passo 3.5 — Implementar módulos pendentes

| Módulo | Status Atual | Ação |
|---|---|---|
| Médico (`/medico`) | Não existe no código | Criar dashboard + alertas sonoros + prescrições |
| Atestados | Não existe | Criar upload, listagem, abono automático |
| Advertências | Não existe | Criar contador e gestão por funcionário |

### Passo 3.6 — Proteção de rotas

A IA criará um componente `<ProtectedRoute>` que:
- Verifica se o usuário está autenticado
- Verifica se o `role` do JWT bate com a rota
- Redireciona para `/login` se não autorizado

---

## 🌐 ETAPA 4 — Deploy (GitHub → Vercel)

> **QUEM FAZ:** Você (passos manuais) + IA (configuração).

### Passo 4.1 — Garantir que o código está no GitHub

```bash
git add .
git commit -m "feat: integração Supabase completa"
git push origin main
```

### Passo 4.2 — Vincular com a Vercel

1. Acesse [https://vercel.com](https://vercel.com)
2. Faça login com GitHub
3. Clique em **"Add New → Project"**
4. Selecione o repositório `a2formcontroller`
5. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Passo 4.3 — Configurar as variáveis de ambiente na Vercel

Na tela de deploy (ou em **Settings → Environment Variables**), adicione:

| Key | Value | Environment |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | Production, Preview, Development |

### Passo 4.4 — Deploy

- Clique em **"Deploy"**
- A Vercel fará o build automaticamente
- Em ~60 segundos, o sistema estará online em `a2formcontroller.vercel.app`

### Passo 4.5 — Domínio personalizado (opcional)

Se a ILPI tiver domínio próprio:
1. Na Vercel: **Settings → Domains → Add**
2. Digite: `sistema.aconchegodosavos.com.br`
3. Configure o DNS no provedor com o CNAME que a Vercel indicar

---

## ✅ ETAPA 5 — Testes e Validação

> **QUEM FAZ:** A IA (automatizados) + Você (manuais).

### 5.1 — Testes que a IA executará

```
□ Login com cada perfil (Administrador, Enf. Chefe, Enfermeiro, ASG, Médico)
□ Tentar acessar rota de outro perfil → deve redirecionar
□ Criar aferição completa → verificar se salvou no Supabase
□ Bater ponto no Totem (4 eventos) → verificar foto no Storage
□ Solicitar hora extra → verificar se aparece no painel Admin
□ Gerar relatório PDF → verificar conteúdo
□ Simular alerta crítico → verificar notificação no perfil Médico
□ Teste IDOR: Enfermeiro tenta acessar dados de outro enfermeiro → deve ser bloqueado
□ Teste XSS: injetar <script> nas observações → deve ser sanitizado
```

### 5.2 — Testes que VOCÊ fará (com a cliente)

```
□ Pedir para Karol fazer login como Admin e navegar
□ Pedir para Mikaela fazer login como Enf. Chefe e validar os dados clínicos
□ Testar o Totem no tablet da ILPI
□ Validar se os nomes dos residentes e leitos estão corretos
□ Verificar se as escalas batem com a realidade
```

---

## 🗓️ ETAPA 6 — Treinamento e Go-Live

### 6.1 — Treinamento (Google Meet, 2h)

| Bloco | Perfil | Duração | Conteúdo |
|---|---|---|---|
| 1 | Administrador (Karol) | 30min | Dashboard, RH, escalas, relatórios |
| 2 | Enf. Chefe (Mikaela) | 20min | Dashboard clínico, alertas, PIA |
| 3 | Enfermeiros | 20min | Aferição, evolução, classificação de risco |
| 4 | ASG (ponto) | 15min | Totem, banco de horas, atestados |
| 5 | Médico | 15min | Alertas sonoros, prescrições |
| - | Dúvidas | 20min | Q&A aberto |

### 6.2 — Go-Live

- Ativar ambiente de produção
- Remover dados de teste
- Primeiro dia com acompanhamento remoto (WhatsApp)
- Suporte 15 dias pós-go-live

---

## 📐 Ordem de Execução Resumida (Checklist Master)

> Este é o caminho exato, na ordem correta.

### FASE PRÉ-APROVAÇÃO (agora)
```
[x] Mockup completo
[x] Proposta comercial
[x] Regras de negócio
[x] Apresentação feita
[ ] Estudar este documento ← VOCÊ ESTÁ AQUI
[ ] Preparar as perguntas da ETAPA 0
```

### FASE PÓS-APROVAÇÃO (após cliente dizer "sim")
```
[ ] ETAPA 0 — Fazer as perguntas e coletar dados da cliente
[ ] ETAPA 1.1 — Criar projeto no Supabase
[ ] ETAPA 1.2 — Colar chaves no chat → IA cria .env.local
[ ] ETAPA 2 — Colar dados dos residentes/funcionários → IA cria SQL + migrations
        ↳ Rodar migrations no Supabase SQL Editor
        ↳ IA configura RLS, functions, storage, realtime
        ↳ IA executa seed com dados reais
[ ] ETAPA 3 — IA refatora código (mock → Supabase)
        ↳ AuthContext real
        ↳ Hooks de dados
        ↳ Proteção de rotas
        ↳ Módulos novos (Médico, Atestados, Advertências)
        ↳ Testar local com `npm run dev`
[ ] ETAPA 4 — Push GitHub → Vincular Vercel → Deploy
        ↳ Configurar env vars na Vercel
        ↳ Verificar se está online
[ ] ETAPA 5 — Testes (IA + Você)
[ ] ETAPA 6 — Treinamento + Go-Live
[ ] 🎉 ENTREGA — Sistema em produção!
```

---

## 💡 O Que Entregar Para a IA em Cada Etapa

| Etapa | O que você cola no chat | O que a IA faz |
|---|---|---|
| 1 | URL do Supabase + ANON KEY | Cria `.env.local`, configura `supabase.ts` |
| 2 | Lista de residentes (nome, idade, ala, leito, doenças, grau) | Gera SQL de migrations + seed |
| 2 | Lista de funcionários (nome, CPF, cargo, escala, turno) | Gera tabela profiles + schedule_assignments |
| 2 | Escalas detalhadas | Gera tabela schedules |
| 2 | Campos do PIA | Gera tabela pia_records |
| 3 | Nenhuma ação — apenas aprovar | IA refatora todo o código front-end |
| 4 | Confirmar que vinculou Vercel + env vars | IA verifica build e deploy |
| 5 | Feedback dos testes | IA corrige bugs |
| 6 | Agendar treinamento | IA prepara material |

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Cliente demora para enviar dados | Atraso na ETAPA 2 | Enviar formulário pronto (ETAPA 0) no dia da aprovação |
| Wi-Fi da ILPI instável | Totem falha | Orientar upgrade ou roteador dedicado |
| Tablet incompatível | Ponto não funciona | Testar antes do go-live com modelo específico |
| Free tier Supabase insuficiente | Limite de requests | Migrar para Pro ($25/mês) — já previsto na proposta |
| Funcionários com dificuldade | Baixa adoção | Material em vídeo + acompanhamento extra |

---

> **📖 Estude este documento antes da aprovação. Quando a cliente disser "sim", você já saberá exatamente o que perguntar, o que fazer e em que ordem.**
>
> **Próximo passo imediato:** Imprima ou envie as perguntas da **ETAPA 0** para a Karol e a Mikaela via WhatsApp para que elas já comecem a reunir os dados enquanto espera a aprovação formal.
