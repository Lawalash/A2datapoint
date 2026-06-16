# 📋 A2 FORM Controller — Proposta Comercial
### Sistema Integrado de Gestão para ILPI | Aconchego dos Avós
**Versão:** 1.0 | **Data:** 27/04/2026 | **Confidencial**

---

## 📑 Sumário

1. [Estimativa de Valor de Mercado](#1--estimativa-de-valor-de-mercado)
2. [Plano de Implantação — Até R$ 500](#2--plano-de-implantação--até-r-500)
3. [Catálogo de Funcionalidades por Perfil](#3--catálogo-de-funcionalidades-por-perfil)
4. [Plano de Mensalidade Escalável](#4--plano-de-mensalidade-escalável)
5. [Plano de Implantação DevSecOps](#5--plano-de-implantação-devsecops)

---

## 1. 💰 Estimativa de Valor de Mercado

### 1.1 Panorama do Mercado

| Indicador | Valor |
|---|---|
| ILPIs registradas no Brasil | ~6.200 |
| Residentes em ILPIs | ~160.000 |
| Perfil predominante | 65% filantrópicas, 35% privadas |
| Crescimento anual do setor | 8–12% |

**TAM (mercado endereçável):** ~2.170 ILPIs privadas/mistas com capacidade de investimento.

### 1.2 Análise Competitiva

| Solução | Público | Ticket Médio/mês | Obs. |
|---|---|---|---|
| MV Saúde / Tasy | Hospitais médio/grande | R$ 5.000–50.000+ | Não atende ILPI |
| Gero360 | ILPIs médio/grande | R$ 500–2.000 (est.) | Sem RH integrado |
| SILPI | ILPIs pequeno/médio | R$ 200–600 (est.) | Funcionalidades limitadas |
| Medlogic | Clínicas e ILPIs | R$ 300–800 (est.) | Foco prontuário |
| **A2 FORM** | **ILPIs pequeno/médio** | **R$ 120–200** | **PEP+RH+Totem+Médico** |

### 1.3 Diferenciais Competitivos

- ✅ **PEP + RH integrados** em plataforma única (único no segmento de baixo custo)
- ✅ **Totem de ponto com captura fotográfica** — substitui relógio de ponto
- ✅ **Módulo médico com alertas sonoros em tempo real**
- ✅ **PIA digital** conforme ANVISA RDC 283/2005
- ✅ **Módulo de atestados** com abono automático e advertências
- ✅ **Stack moderna** (React+Supabase+Vercel) = custo operacional ~R$ 150–230/mês
- ✅ **Segurança DevSecOps** (RLS, JWT, RBAC, MFA, XSS/CSRF/IDOR)

### 1.4 Faixa de Valuation

| Cenário | Valuation | Premissa |
|---|---|---|
| 🔻 Conservador | R$ 80.000–120.000 | 1 cliente, sem escala |
| ⚖️ Médio | R$ 250.000–400.000 | 10–20 clientes, MRR R$ 2–4k |
| 🚀 Otimista | R$ 800.000–1.500.000 | 50+ clientes, 5–8x ARR |

**Justificativa:** Múltiplo SaaS B2B no Brasil: 3–8x ARR. Com 20 clientes a R$ 120/mês → ARR R$ 28.800 → valuation médio ~R$ 230k (5x). Vantagem: módulos clínico+RH a preço disruptivo.

---

## 2. 🔧 Plano de Implantação — Até R$ 500

### 2.1 Incluído

| Item | Descrição | Horas |
|---|---|---|
| 🏗️ Provisionamento | Config. Supabase + deploy Vercel | 2h |
| 🗄️ Banco de dados | Migrations, RLS, seeds | 2h |
| 👥 Cadastro inicial | Até 10 funcionários + 40 residentes | 3h |
| 📐 Escalas | Até 3 escalas (Semanal, 12x36, 24x72) | 1h |
| 🏥 Alas e leitos | Mapeamento Ala A, B, C + leitos | 0.5h |
| 📱 Totem | Config. tablet ponto eletrônico | 1h |
| 🎓 Treinamento | 2h remoto via Google Meet | 2h |
| 📞 Suporte | 15 dias pós-go-live (WhatsApp) | — |
| **Total** | | **~11.5h** |

**Valor: R$ 500,00 (único)** | Custo-hora: ~R$ 43/h

### 2.2 Não Incluído

- ❌ Customizações de layout exclusivas
- ❌ Migração de dados de sistemas legados
- ❌ Treinamentos adicionais
- ❌ Suporte presencial (R$ 150/visita)
- ❌ Integrações com terceiros

### 2.3 Cronograma

| Fase | Prazo | Responsável |
|---|---|---|
| Provisionamento técnico | D+1 a D+2 | Equipe A2 |
| Cadastro de dados | D+3 a D+5 | A2 + Cliente |
| Treinamento | D+6 | Remoto |
| Go-live | D+7 | Equipe A2 |
| Suporte pós-implantação | D+7 a D+22 | A2 (WhatsApp) |

---

## 3. 👤 Catálogo de Funcionalidades por Perfil

### 3.1 Administrador (`/admin`)

| # | Funcionalidade | Status |
|---|---|---|
| 1 | Dashboard operacional com métricas realtime | ✅ Implementado |
| 2 | Gestão de pacientes (CRUD + PIA) | ✅ Implementado |
| 3 | Distribuição por Ala (Masc. A/B, Fem. C) e Leito | ✅ Implementado |
| 4 | Grau de dependência ANVISA (I, II, III) | ✅ Implementado |
| 5 | Status residência (Ativo / Ortoprazo-Temporada) | ✅ Implementado |
| 6 | Gestão de funcionários (CRUD + perfil + matrícula) | ✅ Implementado |
| 7 | Gestão de escalas (Semanal, 12x36, 24x72) | ✅ Implementado |
| 8 | Vinculação funcionários a escalas em lote | ✅ Implementado |
| 9 | Aprovação/reprovação de horas extras | ✅ Implementado |
| 10 | Banco de horas com saldo realtime | ✅ Implementado |
| 11 | Regra 105min (HE comum vs. plantão extra) | ✅ Implementado |
| 12 | Regra 48h aprovação retroativa | ✅ Implementado |
| 13 | Flags irregularidade (atraso, saída antecipada) | ✅ Implementado |
| 14 | Relatórios PDF | ✅ Implementado |
| 15 | Alertas de risco no dashboard | ✅ Implementado |
| 16 | Visualização PIA completo | ✅ Implementado |
| 17 | Módulo Atestados (anexar, digitalizar, filtrar) | 🔧 Em desenvolvimento |
| 18 | Integração atestado ↔ escala (abono automático) | 🔧 Em desenvolvimento |
| 19 | Contador advertências por funcionário | 🔧 Em desenvolvimento |
| 20 | Relatórios gerenciais avançados (BI) | 🗺️ Roadmap |
| 21 | Portal comunicação com familiares | 🗺️ Roadmap |

### 3.2 Enfermeira Chefe (`/enfermeira-chefe`)

| # | Funcionalidade | Status |
|---|---|---|
| 1 | Dashboard clínico — todos os pacientes | ✅ Implementado |
| 2 | Histórico aferições (filtro paciente/período) | ✅ Implementado |
| 3 | Alertas de risco (Urgente/Muito Urgente/Emergência) | ✅ Implementado |
| 4 | Contagem diária de aferições | ✅ Implementado |
| 5 | Timeline "Ver Aferições do Dia" | ✅ Implementado |
| 6 | Relatórios PDF de enfermagem | ✅ Implementado |
| 7 | Visualização PIA completo | ✅ Implementado |
| 8 | Supervisão de evoluções diárias | ✅ Implementado |
| 9 | Painel indicadores clínicos consolidados | 🗺️ Roadmap |

### 3.3 Enfermeiro / Técnico (`/enfermeiro`)

| # | Funcionalidade | Status |
|---|---|---|
| 1 | Aferição SSVV — Bloco 1 (PA, HGT, FC, FR, SpO2, Temp) | ✅ Implementado |
| 2 | Evolução diária — Bloco 2 (sintomas, dor, estado geral) | ✅ Implementado |
| 3 | Classificação de risco (5 níveis coloridos) | ✅ Implementado |
| 4 | Registro sintomas (15 opções) + intensidade dor | ✅ Implementado |
| 5 | Estado geral, alimentação, higiene, eliminações, pele | ✅ Implementado |
| 6 | Assinatura digital por turno | ✅ Implementado |
| 7 | Observações finais do cuidador | ✅ Implementado |

### 3.4 Médico (`/medico`) — Novo Perfil

| # | Funcionalidade | Status |
|---|---|---|
| 1 | Dashboard com residentes ativos | 🔧 Em desenvolvimento |
| 2 | Alertas sonoros realtime para agravos | 🔧 Em desenvolvimento |
| 3 | Persistência sonora até abertura do registro | 🔧 Em desenvolvimento |
| 4 | Ficha residente (nome, sexo, idade, crônicas, grau) | 🔧 Em desenvolvimento |
| 5 | Última observação do cuidador | 🔧 Em desenvolvimento |
| 6 | Prescrição digital vinculada ao paciente | 🔧 Em desenvolvimento |
| 7 | Histórico de prescrições | 🗺️ Roadmap |
| 8 | Integração farmácia/estoque | 🗺️ Roadmap |

### 3.5 ASG (`/ponto-tablet`)

| # | Funcionalidade | Status |
|---|---|---|
| 1 | Registro ponto com captura fotográfica | ✅ Implementado |
| 2 | 4 eventos (entrada, saída, início/fim intervalo) | ✅ Implementado |
| 3 | Matrícula mascarada (`[mat]@dominio.internal`) | ✅ Implementado |
| 4 | Visualização banco de horas | ✅ Implementado |
| 5 | Solicitação compensação e hora extra | ✅ Implementado |
| 6 | Upload atestado médico | 🔧 Em desenvolvimento |

### 3.6 Resumo

| Status | Qtd |
|---|---|
| ✅ Implementado | 34 |
| 🔧 Em desenvolvimento | 10 |
| 🗺️ Roadmap | 5 |
| **Total** | **49** |

---

## 4. 💳 Plano de Mensalidade Escalável

### 4.1 Custos de Infraestrutura

| Componente | USD/mês | BRL/mês (~5.5) |
|---|---|---|
| Supabase Pro | $25 | ~R$ 137 |
| Vercel | $0–20 | R$ 0–110 |
| Domínio | ~$1 | ~R$ 5 |
| **Total** | **$26–46** | **R$ 142–252** |

### 4.2 Planos

| | 🟢 Essencial | 🔵 Profissional | 🟣 Completo |
|---|---|---|---|
| **Preço/mês** | **R$ 120** | **R$ 160** | **R$ 200** |
| Módulo Clínico (PEP) | ✅ | ✅ | ✅ |
| Módulo RH / Ponto | ❌ | ✅ | ✅ |
| Módulo Médico | ❌ | ❌ | ✅ |
| Módulo Atestados | ❌ | ❌ | ✅ |
| Residentes | Até 30 | Até 50 | Ilimitado |
| Funcionários | Até 5 | Até 15 | Ilimitado |
| Totem tablet | ❌ | ✅ (1) | ✅ (até 3) |
| PIA digital | ❌ | ✅ | ✅ |
| Suporte | E-mail 48h | WhatsApp 24h | WhatsApp 12h |
| SLA uptime | 95% | 99% | 99.5% |

### 4.3 Margem por Plano

| Plano | Receita | Custo Infra* | Margem | % |
|---|---|---|---|---|
| Essencial (1 cliente) | R$ 120 | R$ 142 | -R$ 22 | -18% |
| Profissional (1 cliente) | R$ 160 | R$ 160 | R$ 0 | 0% |
| Completo (1 cliente) | R$ 200 | R$ 175 | R$ 25 | 12% |
| **3 clientes (bundle)** | **R$ 480–600** | **~R$ 200** | **R$ 280–400** | **58–67%** |

*\*Infra compartilhada multi-tenant.*

> 💡 **Break-even:** 2 clientes no plano Profissional. A partir do 3º cliente, margem sobe exponencialmente (custo fixo).

### 4.4 Recomendação — Aconchego dos Avós

| Item | Valor |
|---|---|
| Plano recomendado | 🟣 **Completo** |
| Mensalidade | **R$ 200/mês** |
| Implantação | **R$ 500 (único)** |
| 1º ano | **R$ 2.900** |
| Custo diário | **~R$ 7,95/dia** |

---

## 5. 🛡️ Plano de Implantação DevSecOps

**Legenda:** 👔 Gestor do Projeto | 🤖 Sistema/IA

### FASE 1 — Provisionamento (D+1)

| # | Ação | Resp. | Detalhes |
|---|---|---|---|
| 1.1 | Criar conta Supabase Pro | 👔 | Cartão necessário, ~$25/mês |
| 1.2 | Fornecer chaves (API URL, anon key, service role) | 👔 | Settings > API |
| 1.3 | Configurar projeto Supabase (sa-east-1) | 🤖 | Região São Paulo |
| 1.4 | Criar conta Vercel + vincular GitHub | 👔 | Autorizar repo |
| 1.5 | Configurar env vars na Vercel | 🤖 | VITE_SUPABASE_URL, ANON_KEY |
| 1.6 | Domínio personalizado (opcional) | 👔🤖 | DNS CNAME → Vercel |

### FASE 2 — Banco de Dados e Segurança (D+1–D+2)

| # | Ação | Resp. | Detalhes |
|---|---|---|---|
| 2.1 | Executar migrations SQL | 🤖 | Via Supabase CLI |
| 2.2 | Configurar RLS por tabela/perfil | 🤖 | 5 perfis granulares |
| 2.3 | Funções SQL (banco horas, regra 105min, flags) | 🤖 | Regras de negócio |
| 2.4 | Storage buckets (fotos ponto) | 🤖 | INSERT auth, SELECT por role |
| 2.5 | Habilitar Realtime | 🤖 | Channels: aferições, alertas |
| 2.6 | Auth (MFA, JWT claims) | 🤖 | Claims: role, matricula, nome |
| 2.7 | Seed dados iniciais | 🤖 | Alas, leitos, escalas padrão |
| 2.8 | Validar isolamento (teste IDOR) | 🤖 | Segurança horizontal |

### FASE 3 — Deploy e Testes (D+2–D+3)

| # | Ação | Resp. | Detalhes |
|---|---|---|---|
| 3.1 | Deploy Vercel (branch main) | 🤖 | Build: npm run build |
| 3.2 | Preview deployments (branch dev) | 🤖 | PRs automáticos |
| 3.3 | Teste login (5 perfis) | 🤖 | Validar acesso/restrição |
| 3.4 | Teste fluxo aferição completo | 🤖 | Registro→Risco→Assinatura |
| 3.5 | Teste ponto totem (4 eventos) | 🤖 | Entrada→Intervalo→Saída |
| 3.6 | Teste geração PDF | 🤖 | Por paciente e período |
| 3.7 | Validar alertas realtime | 🤖 | Simular aferição crítica |
| 3.8 | Teste segurança (XSS, CSRF, SQLi) | 🤖 | Payloads automatizados |

### FASE 4 — Cadastro de Dados (D+3–D+5)

| # | Ação | Resp. | Detalhes |
|---|---|---|---|
| 4.1 | Fornecer lista funcionários | 👔 | Nome, CPF, função, escala |
| 4.2 | Fornecer lista residentes | 👔 | Nome, idade, crônicas, grau |
| 4.3 | Cadastrar funcionários | 🤖 | Matrícula auto, perfil vinculado |
| 4.4 | Cadastrar residentes (ala/leito) | 🤖 | Dados clínicos + PIA base |
| 4.5 | Configurar escalas + vincular | 🤖 | Conforme planilha |
| 4.6 | Aprovar e validar dados | 👔 | Checklist no sistema |

### FASE 5 — Treinamento (D+6)

| # | Ação | Resp. | Detalhes |
|---|---|---|---|
| 5.1 | Agendar sessão (2h, Google Meet) | 👔🤖 | Horário a combinar |
| 5.2 | Treinar Admin (30min) | 🤖 | Dashboard, RH, escalas |
| 5.3 | Treinar Enf. Chefe (20min) | 🤖 | Clínico, relatórios |
| 5.4 | Treinar Enfermeiro (20min) | 🤖 | Aferição, evolução, risco |
| 5.5 | Treinar ASG — Totem (15min) | 🤖 | Ponto, banco horas |
| 5.6 | Treinar Médico (15min) | 🤖 | Alertas, prescrições |
| 5.7 | Enviar gravação + guia PDF | 🤖 | Material de referência |

### FASE 6 — Go-Live (D+7–D+22)

| # | Ação | Resp. | Detalhes |
|---|---|---|---|
| 6.1 | Ativar produção | 🤖 | Remover flag staging |
| 6.2 | Monitorar logs (48h) | 🤖 | Vercel + Supabase |
| 6.3 | Suporte WhatsApp (15 dias) | 🤖 | Resposta em até 4h |
| 6.4 | Coletar feedback (3d, 7d, 15d) | 👔🤖 | Formulário satisfação |
| 6.5 | Ajustes finos (até 4h inclusas) | 🤖 | Pós-feedback |
| 6.6 | Confirmar 1ª mensalidade | 👔 | Após validação go-live |
| 6.7 | Encerramento formal | 👔🤖 | Termo de aceite |

---

## 📎 Termos Comerciais

| Item | Valor |
|---|---|
| Implantação | R$ 500 (único) |
| Mensalidade Completo | R$ 200/mês |
| Reajuste anual | IPCA |
| Fidelidade mínima | 6 meses |
| Cancelamento | 30 dias aviso prévio |
| 1ª mensalidade | Após go-live confirmado |

**Pagamento implantação:** PIX/boleto em 2x (R$ 250 assinatura + R$ 250 go-live)

---

> **A2 FORM Controller** — Tecnologia acessível para o cuidado que importa.
>
> *Preparado para Aconchego dos Avós ILPI — Abril/2026*
