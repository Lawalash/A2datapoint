# 📋 Documento de Regras de Negócio — A2 FORM Controller

**Versão:** 1.0 | **Data:** 27/04/2026 | **Projeto:** A2 FORM Controller (ILPI Aconchego dos Avós)

---

## 1. 🎯 Objetivo
Este documento visa descrever de forma detalhada as regras de negócio do sistema **A2 FORM Controller**, especificando todos os perfis de acesso, as funcionalidades atreladas a cada um e suas características operacionais. O sistema atende aos módulos Clínico, RH, Médico e Administrativo.

---

## 2. 👥 Perfis de Usuário e Funcionalidades

O sistema utiliza o modelo de Controle de Acesso Baseado em Papéis (RBAC). Cada perfil possui permissões específicas e acesso a dashboards dedicados, garantindo a segurança da informação (RLS).

### 2.1 Administrador (`/admin`)
- **Característica Principal:** Gestão global e operacional da instituição. Possui total visibilidade sobre o RH, as escalas de trabalho e os cadastros gerais, sem realizar apontamentos clínicos diretos (mas com acesso à visualização).
- **Funcionalidades e Regras de Negócio:**
  - **Dashboard Operacional:** Visão em tempo real de métricas críticas da operação. Exibe alertas de risco referentes aos pacientes e indicadores gerais.
  - **Gestão de Pacientes (Residentes):**
    - Cadastro e manutenção (CRUD) dos residentes.
    - Elaboração e visualização do **PIA (Plano Individual de Atendimento)**, em conformidade com as exigências da ANVISA (RDC 283/2005).
    - Definição do **Grau de Dependência ANVISA** (Grau I, II ou III).
    - Classificação do **Status de Residência** (Ativo ou Ortoprazo/Temporada).
    - **Logística de Quartos:** Mapeamento e distribuição de pacientes por Alas (ex: Masc. A/B, Fem. C) e leitos específicos.
  - **Gestão de RH e Escalas:**
    - Cadastro de funcionários (com definição de perfil e geração de matrícula).
    - Configuração de múltiplas **escalas de trabalho** (Semanal, 12x36, 24x72) e alocação de funcionários em lote (batch assignment).
    - **Gestão de Ponto e Banco de Horas:** Visualização do saldo em tempo real, aprovação e reprovação de horas extras.
    - **Regra de 105 minutos:** Regra de negócio específica para cálculo de horas que distingue o que é "hora extra comum" do que é considerado "plantão extra" quando o colaborador excede 105 minutos além do horário.
    - **Regra de 48 horas:** O sistema permite a aprovação de marcações ou correções retroativas limitadas ao teto de 48 horas da ocorrência.
    - **Alertas de Irregularidade:** O sistema levanta "flags" automáticas no painel em caso de atrasos e saídas antecipadas sem justificativa prévia.
  - **Módulo de Atestados e Advertências:**
    - Upload, anexação e digitalização de atestados médicos.
    - **Abono Automático:** Integração do atestado aprovado com a escala do funcionário para abonar as faltas automaticamente no banco de horas.
    - Contador de advertências comportamentais atrelado ao perfil do colaborador.
  - **Relatórios:** Emissão de relatórios gerenciais e de performance em formato PDF.

### 2.2 Enfermeira Chefe (`/enfermeira-chefe`)
- **Característica Principal:** Supervisão técnica da enfermagem. Gerencia a consistência das evoluções clínicas, coordena os cuidadores e responde a eventos de emergência e riscos.
- **Funcionalidades e Regras de Negócio:**
  - **Dashboard Clínico:** Visão panorâmica de todos os pacientes ativos na instituição.
  - **Gestão de Alertas:** Recebimento e monitoramento de alertas de risco classificados por nível de gravidade (Urgente, Muito Urgente, Emergência).
  - **Supervisão Diária:**
    - Visualização consolidada com a **Contagem Diária de Aferições** de cada paciente.
    - **Timeline "Ver Aferições do Dia":** Funcionalidade para conferir de forma cronológica tudo o que foi registrado no dia corrente, garantindo que nenhum residente ficou sem acompanhamento.
    - Supervisão e leitura das evoluções diárias lançadas pela equipe técnica.
  - **Prontuário Eletrônico:** Visualização completa do PIA (Plano Individual de Atendimento) do paciente. Histórico de aferições filtrável por paciente e período de tempo.
  - **Documentação:** Geração de relatórios em PDF específicos para documentação de enfermagem.

### 2.3 Enfermeiro / Técnico (`/enfermeiro`)
- **Característica Principal:** Atuação operacional na ponta (beira-leito). Responsável por coletar dados fisiológicos e registrar a condição do paciente em cada turno.
- **Funcionalidades e Regras de Negócio:**
  - **Aferição de Sinais Vitais (Bloco 1):** Coleta e registro obrigatório de parâmetros vitais, incluindo PA (Pressão Arterial), HGT (Glicemia Capilar), FC (Frequência Cardíaca), FR (Frequência Respiratória), SpO2 (Saturação) e Temperatura.
  - **Evolução Diária (Bloco 2):** Lançamento de dados sobre o Estado Geral, Alimentação, Higiene, Eliminações (diurese/evacuação) e Integridade da Pele.
  - **Classificação de Risco:** Algoritmo que atribui um dos 5 níveis coloridos de risco ao paciente baseado nos sinais apresentados, permitindo intervenção rápida.
  - **Sintomatologia e Dor:** O sistema apresenta um catálogo de 15 opções de sintomas mais comuns em idosos para seleção rápida e escala de mensuração de intensidade de dor.
  - **Segurança da Informação:**
    - Assinatura digital vinculada ao login para garantir autoria do turno.
    - Espaço para observações finais e subjetivas do cuidador sobre aquele paciente.

### 2.4 Médico (`/medico`)
- **Característica Principal:** Perfil voltado para a assistência de alta complexidade. Recebe demandas de risco escaladas da enfermagem e cuida das prescrições.
- **Funcionalidades e Regras de Negócio:**
  - **Dashboard Especializado:** Foco nos residentes que demandam atenção, com acesso a uma "Ficha Resumo" contendo: nome, sexo, idade, doenças crônicas e Grau de Dependência.
  - **Sistema de Alertas Sonoros Realtime:** Alertas imediatos (via WebSocket/Realtime) sobre agravos de pacientes.
    - **Regra de Persistência:** O alerta sonoro toca continuamente e persiste de forma obrigatória até que o médico efetivamente abra o registro do paciente no sistema.
  - **Análise do Cuidado:** Acesso privilegiado à última observação registrada pelo cuidador (Enfermeiro/Técnico).
  - **Prescrição Eletrônica:** Módulo para emissão de prescrição digital que é automaticamente atrelada à ficha e ao histórico do residente.

### 2.5 Auxiliar de Serviços Gerais (ASG) / Ponto Eletrônico (`/ponto-tablet`)
- **Característica Principal:** Interface de uso restrito, desenhada para ser operada via Totem (Tablet) fixado na instituição. Substitui o relógio de ponto tradicional.
- **Funcionalidades e Regras de Negócio:**
  - **Ponto Fotográfico (Anti-fraude):** Para registrar o ponto, é obrigatória a captura fotográfica do funcionário no momento do clique, utilizando a câmera frontal do Totem.
  - **Segurança de Acesso:** O login não é feito com senha comum, mas com uma Matrícula Mascarada padronizada (ex: `[mat]@dominio.internal`).
  - **Ciclo de 4 Eventos:** A jornada diária exige o batimento de 4 marcações obrigatórias: Entrada, Início do Intervalo, Fim do Intervalo e Saída.
  - **Transparência Laboral:** O funcionário consegue consultar, na própria tela do tablet, a parcial do seu banco de horas.
  - **Solicitações:** O colaborador pode, pelo Totem, abrir pedidos formais para compensação de horas, aprovação de hora extra e fazer upload do próprio atestado médico diretamente pelo sistema.

---

## 3. ⚙️ Premissas Técnicas e Integrações de Negócio

1. **Acesso Único:** Um funcionário, por CPF, pode ter um único perfil. O sistema emite claims JWT que bloqueiam o acesso entre módulos indevidos.
2. **Alta Disponibilidade e Cloud:** Toda inserção de dado de ponto e dado clínico é sincronizada para a nuvem de forma imediata. Para que a Enfermeira Chefe acompanhe as informações no Dashboard, o Totem/Tablet e o dispositivo dos enfermeiros precisam estar operando sob conexão à internet.
3. **Imutabilidade de Dados Clínicos:** Evoluções clínicas salvas e assinadas não podem ser adulteradas; eventuais erros devem gerar uma retificação/novo registro na timeline, mantendo o histórico legal para a ANVISA.
