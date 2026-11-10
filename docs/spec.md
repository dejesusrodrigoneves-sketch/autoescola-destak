# SPEC — Site da Autoescola Destak

**Versão 0.3.4 · 2026-11-10**

---

## 1. Controle do documento

| Campo | Valor |
|---|---|
| Projeto | Site e painel da Autoescola Destak |
| Versão | 0.3.4 |
| Data | 2026-11-10 |
| Status | Aprovada para planejamento; restam Q-17 e Q-25 |
| Autor | [A DEFINIR] |
| Aprovador | dono da Autoescola Destak (2026-11-10) |
| Ambiente de execução | Node.js 22 LTS, versão exata fixada no repositório; navegadores suportados em NFR-007 |
| Substitui | 0.2.1 |

### 1.1 Stack obrigatória

| Camada | Tecnologia | Versão | Para que serve | Onde roda |
|---|---|---|---|---|
| Frontend | React + TypeScript | React 19, TS 5 | interface pública, aluno, instrutor e admin | Cloudflare Workers (static assets) |
| Build do frontend | Vite | 6 | desenvolvimento e build | máquina local e Cloudflare Workers |
| Estilo | Tailwind CSS | 4 | tokens e utilitários | build do frontend |
| Componentes | shadcn/ui | conforme CLI | base de UI acessível | build do frontend |
| Rotas | React Router | 7 | navegação e pré-renderização | build do frontend |
| Ícones | Lucide | 1 | ícones de interface | build do frontend |
| API | Node.js + TypeScript + NestJS | Node 22, Nest 11 | regras de negócio e integrações | **Railway** (D-01, Q-13) |
| ORM | Prisma | 6 | acesso ao banco e migrations | dentro da API |
| Banco | PostgreSQL no Supabase | 15 ou superior | dados | Supabase |
| Cache e filas | Redis | 7 | filas, limite de requisições, cache opcional | **Railway** (Q-13) |
| Notificações | Evolution API | versão fixada no repositório | envio de WhatsApp | **Railway, em container próprio, modo QR Code** (Q-12, Q-13) |
| Pagamentos | Asaas | API v3 | cobrança, Pix, boleto, cartão | nuvem do Asaas |
| Hospedagem do site | Cloudflare Workers com static assets | — | servir o bundle estático do site | Cloudflare |

**Ambiente local de desenvolvimento.** A expressão "vite e backend (para localhost)" da versão anterior significava: o frontend roda com o servidor de desenvolvimento do Vite e a API roda localmente, ambos apontando para serviços locais ou de homologação. O detalhamento está na seção 16.

**Conferência obrigatória.** Fatos técnicos e regulatórios deste documento foram conferidos em novembro de 2026. Antes de integrar, a implementação deve conferir a documentação oficial vigente de Asaas, Evolution API, Supabase, Cloudflare e dos órgãos de trânsito.

---

## 2. Instruções para a LLM

Estas regras valem para toda a implementação. Em conflito com qualquer outra seção, vale a ordem da 4.2.

| ID | Regra |
|---|---|
| I-01 | Ler integralmente `design.md` antes de escrever código. |
| I-02 | Usar `design.md` como fonte única para decisões visuais. |
| I-03 | Não implementar funcionalidade que não esteja descrita nesta spec; ideias novas vão para "Futuro / a avaliar" (6.3). |
| I-04 | Não alterar a stack sem registrar decisão pendente (D-xx) com motivo e alternativa. |
| I-05 | Não substituir funcionalidade real por mock permanente. Dado de exemplo é permitido apenas nas condições de G13 e I-16. |
| I-06 | Implementar em etapas pequenas e verificáveis, conforme as fases da seção 18. |
| I-07 | Antes de programar: apresentar entendimento, dúvidas bloqueadoras, premissas, plano e arquivos que serão criados ou alterados. |
| I-08 | Ambiguidade não bloqueadora vira premissa em `decisions.md`, citando a pergunta de origem. |
| I-09 | Ambiguidade que muda o comportamento do produto: parar e perguntar antes de implementar. |
| I-10 | Ao concluir cada etapa, executar lint, typecheck, testes e build quando existirem. |
| I-11 | Nunca considerar pronto sem validar os critérios de aceite do requisito. |
| I-12 | Toda mudança visual exige mockup e aprovação, no processo da seção 11.6 (G13). |
| I-13 | Segredos nunca entram no repositório; manter `.env.example` atualizado com todas as variáveis e nenhum valor. |
| I-14 | Desenvolvimento e testes usam o sandbox do Asaas e não enviam mensagens reais de WhatsApp. |
| I-15 | Migration já aplicada não é editada. Nenhum comando destrutivo no banco (drop, truncate, delete em massa) sem confirmação explícita. |
| I-16 | Dados de exemplo (depoimentos, valores, fotos) ficam visivelmente marcados como exemplo e nunca chegam à produção. |
| I-17 | Ao mudar comportamento, atualizar a spec e o `decisions.md` na mesma etapa. |
| I-18 | Textos de interface em pt-BR; código, nomes de variáveis, tabelas e rotas em inglês. |

---

## 3. Contexto do produto

### 3.1 Problema

A Autoescola Destak vende por atendimento direto e não tem presença digital operacional. O futuro aluno não consegue ver preço, não consegue pagar pelo site e não tem onde acompanhar aulas e pagamentos. A autoescola não tem onde registrar matrícula, emitir cobrança e acompanhar o progresso de cada aluno.

### 3.2 Objetivo

Publicar o site que apresenta a autoescola e vende planos, dar ao aluno uma área autenticada com aulas e pagamentos, e dar à equipe um painel para administrar valores, alunos, aulas, cobranças, conteúdo e progresso — com notificações por WhatsApp.

### 3.3 Públicos

| Público | Onde está | O que sabe | O que precisa |
|---|---|---|---|
| Visitante (futuro aluno) | celular, vindo de busca, rede social ou link de WhatsApp | nenhum conhecimento técnico | entender preço, confiar na escola e falar ou comprar em poucos toques |
| Aluno | celular | nenhum conhecimento técnico | ver a próxima aula, o que falta pagar e o próprio progresso |
| Instrutor | celular ou computador da autoescola | conhece a rotina de aula, não conhece tecnologia | ver as próprias aulas e registrar a análise de cada aula de cada aluno |
| Administrador (equipe da autoescola) | computador | nenhum conhecimento técnico | cadastrar aluno, agendar aula, emitir cobrança e alterar preço sem depender de programador |

Contexto de uso adotado por premissa (Q-21, P-15).

### 3.4 Resultado esperado

| Perfil | Ao final, consegue |
|---|---|
| Visitante | ver planos com valores reais, conhecer a prova social e iniciar a compra ou o contato no WhatsApp |
| Visitante comprador | pagar um plano por Pix, boleto ou cartão e receber confirmação na tela |
| Aluno | entrar, ver próximas aulas, aulas realizadas, cobranças pendentes e pagas, e o próprio progresso |
| Instrutor | entrar, ver a própria agenda e deixar a análise de cada aula de cada aluno |
| Administrador | cadastrar aluno e matrícula, agendar aula e registrar presença, emitir boleto, cancelar e estornar cobrança, alterar plano com histórico, editar o conteúdo do site, acompanhar o estudo por dia da semana e redefinir a senha de qualquer usuário |

---

## 4. Referências e fontes da verdade

| Assunto | Fonte |
|---|---|
| Visual | `docs/DESIGN.md` |
| Regras de negócio | esta spec, seção 8 |
| Contrato de API | esta spec, seção 13 e OpenAPI gerado pelo NestJS |
| Decisões e premissas | `docs/decisions.md` |
| Fatia 1 já desenhada | `docs/superpowers/specs/2026-11-10-autoescola-destak-design.md` — recorte derivado; em divergência, prevalece este documento |
| Regulatório | seção 19.2 |

### 4.1 Conteúdo mínimo do `design.md`

O arquivo precisa ter, no mínimo:

| Item | Conteúdo |
|---|---|
| Paleta | cada cor com papel e contraste medido contra o fundo em que é usada |
| Tipografia | famílias, pesos, escala, altura de linha, espaçamento entre letras |
| Espaçamento | escala usada no layout |
| Raios e sombras | valores e onde se aplicam |
| Componentes | botão, campo, card, tabela, modal, badge — cada um com estados normal, hover, foco, ativo, desabilitado, erro |
| Ícones | estilo, espessura, tamanho |
| Fotografia | enquadramento, proporção, tratamento |
| Movimento | durações e o que pode animar |
| Tom de voz | o que a marca fala e o que não fala |

Tokens do `design.md` viram tema do Tailwind e variáveis do shadcn/ui. Cor escrita direto em componente é proibida (11.2).

### 4.2 Ordem de prioridade em conflito

1. Critérios de aceite explícitos;
2. Regras de negócio (seção 8);
3. Requisitos funcionais (seção 10);
4. Especificações visuais do `design.md`;
5. Convenções técnicas desta spec;
6. Premissas registradas em `decisions.md`.

Conflito que altere regra de negócio ou experiência importante: parar e confirmar.

### 4.3 Arquivo de referência ausente ou incompleto

Se `design.md` não existir, estiver incompleto ou não cobrir o item de 4.1:

1. parar a implementação da tela afetada;
2. propor o conteúdo que falta;
3. pedir aprovação e registrar em `decisions.md`;
4. só então implementar.

Identidade visual nunca é improvisada. O mesmo vale para `decisions.md` ausente: criar a partir do modelo desta spec antes de codar.

---

## 5. Glossário

| Termo | Definição |
|---|---|
| CFC | Centro de Formação de Condutores; a autoescola propriamente dita |
| CNH | Carteira Nacional de Habilitação |
| Categoria | tipo de habilitação (A moto, B carro, AB ambas, entre outras) |
| Matrícula | vínculo entre aluno e plano contratado, com valor e condições congelados na contratação |
| Plano | pacote vendido: categoria, quantidade de aulas, itens inclusos e valor |
| Cobrança | valor a receber do aluno, com vencimento e situação (boleto, Pix, parcela, avulsa) |
| Parcela | divisão de uma cobrança em mais de um vencimento |
| Aula prática | aula de direção com veículo e instrutor |
| Aula teórica | conteúdo teórico obrigatório ou complementar |
| Prova social | depoimentos e fotos reais de alunos, exibidos em carrossel |
| Baixa manual | marcação de pagamento feita pelo admin quando o dinheiro não passa pelo gateway |
| Estorno | devolução de valor já pago |
| Premissa | regra adotada por recomendação, pendente de confirmação; sempre amarrada a uma pergunta Q-xx |
| D-xx | decisão técnica pendente de aprovação |

---

## 6. Escopo

### 6.1 Incluído

| Item | Funcionalidade | Requisitos |
|---|---|---|
| 1 | Landing pública com planos, valores e botão flutuante de WhatsApp | FR-001 a FR-004 |
| 2 | Carrosséis de prova social cadastrados pelo admin | FR-002 |
| 3 | Compra e pagamento de plano pelo site (Pix, boleto, cartão) | FR-005, FR-006 |
| 4 | Entrar, sair, primeiro acesso e redefinição de senha pelo admin | FR-007 a FR-009 |
| 5 | Área do aluno: resumo, aulas, pagamentos, dados | FR-010 a FR-013 |
| 6 | Admin: alunos, matrículas e instrutores | FR-015 |
| 7 | Admin: planos e valores com histórico | FR-016 |
| 8 | Admin: aulas, presença e faltas | FR-017 |
| 9 | Admin: emissão, cancelamento e estorno de cobranças | FR-018, FR-019 |
| 10 | Admin: progresso e estudo por dia da semana | FR-020 |
| 11 | Admin: conteúdo e configurações do site | FR-021, FR-022 |
| 12 | Registro de notificações e reenvio | FR-023 |
| 13 | Webhook do Asaas e conciliação | FR-024 |
| 14 | Envio de WhatsApp pela Evolution API | FR-025 |
| 15 | Publicação com pré-renderização, metadados e compartilhamento | FR-026 |
| 16 | Área do instrutor: agenda própria e análise por aula | FR-027 |

### 6.2 Fora do escopo

- Aplicativo nativo (iOS/Android).
- Módulo de estudo online com conteúdo e simulados (alternativa b de Q-05).

### 6.3 Futuro / a avaliar

| Ideia | Origem | Por que não agora |
|---|---|---|
| App nativo ou PWA instalável | dono | fora de escopo declarado |
| Estudo online com simulados e videoaulas | alternativa b de Q-05 | exige módulo novo de conteúdo |
| Instrutor criar ou reagendar aula sozinho | Q-04 | nesta versão o instrutor só registra análise; a agenda é do admin |
| Integração direta com DETRAN | avaliação | não há API pública garantida |
| Cupom de desconto e programa de indicação | avaliação | fora do escopo declarado |
| Recorrência automática de mensalidade | avaliação | não pedido |
| Multi-unidade | avaliação | modelo atual é uma unidade |
| Relatórios financeiros e exportação | avaliação | não pedido (Q-23) |
| Atendimento automático por IA no WhatsApp | avaliação | não pedido |
| Google Analytics ou Meta Pixel | Q-16 | depende de resposta |

---

## 7. Usuários e permissões

### 7.1 Perfis

| Perfil | Descrição |
|---|---|
| Visitante | não autenticado; vê o site, os planos e inicia a compra |
| Aluno | autenticado, perfil `STUDENT`; vê apenas os próprios dados |
| Instrutor | autenticado, perfil `INSTRUCTOR`; vê as aulas que ministra e registra a análise de cada uma |
| Administrador | autenticado, perfil `ADMIN`; opera a autoescola |

### 7.2 Matriz de permissões

| Ação | Visitante | Aluno | Instrutor | Admin |
|---|---:|---:|---:|---:|
| Ver a landing e os planos | Sim | Sim | Sim | Sim |
| Iniciar a compra de um plano | Sim | Sim | Não | Não |
| Entrar na área restrita | Não | Sim | Sim | Sim |
| Ver as próprias aulas | Não | Sim | Sim | Sim |
| Ver as aulas de qualquer aluno | Não | Não | Só as que ministra | Sim |
| Ver e pagar as próprias cobranças | Não | Sim | Não | Sim |
| Ver as cobranças de qualquer aluno | Não | Não | Não | Sim |
| Registrar análise de uma aula | Não | Não | Sim, nas que ministra | Só leitura |
| Cadastrar e editar alunos e matrículas | Não | Não | Não | Sim |
| Agendar aulas e registrar presença | Não | Não | Não | Sim |
| Emitir, cancelar e estornar cobranças | Não | Não | Não | Sim |
| Alterar planos e valores | Não | Não | Não | Sim |
| Editar o conteúdo do site | Não | Não | Não | Sim |
| Ver o progresso dos alunos | Não | Só o próprio | Não | Sim |
| Ver o registro de notificações | Não | Não | Não | Sim |
| Redefinir a senha de um usuário | Não | Não | Não | Sim |

### 7.3 Regra de acesso a recurso

O servidor verifica, em toda rota, o perfil **e** o dono do recurso. Filtrar no frontend não é controle de acesso. O detalhamento está em BR-007 e no requisito NFR-021. Para o instrutor, "dono" significa a aula que ele ministra (BR-026).

---

## 8. Regras de negócio

| ID | Regra | Origem |
|---|---|---|
| BR-001 | O valor exibido na landing vem sempre do backend; nenhum preço é escrito no código do frontend. | E5 |
| BR-002 | Alterar o valor de um plano não altera matrículas nem cobranças já criadas; a matrícula guarda o valor contratado. | E5 |
| BR-003 | Toda alteração de valor de plano gera registro em histórico, com autor, data, valor anterior e novo. | E5 |
| BR-004 | Só o admin emite boleto avulso ou parcelamento, cancela e estorna cobrança. | Q-02 |
| BR-005 | Uma cobrança só é dada como paga por confirmação do Asaas ou por baixa manual do admin — nunca pelo retorno do navegador. | E5 |
| BR-006 | A compra de um plano pelo site gera a cobrança automaticamente. | Q-02 |
| BR-007 | O aluno só enxerga os próprios dados; o servidor valida o dono do recurso em toda rota. | E2 |
| BR-008 | Situações de uma aula: `SCHEDULED`, `DONE`, `ABSENT`, `CANCELED`, `RESCHEDULED`; transições e autoria em 8.1. | E5 |
| BR-009 | Cancelamento e reembolso: até 7 dias corridos da compra, reembolso **integral**; depois de 7 dias, retenção de **10%** sobre o valor pago. A retenção não se aplica a cobrança não paga. | Q-10 |
| BR-010 | O progresso do aluno é medido contra o que ele contratou, não contra carga horária legal fixa. | F14 |
| BR-011 | Notificação automática exige consentimento registrado do aluno e respeita a solicitação de parar de receber. | F7 |
| BR-012 | Foto ou depoimento de aluno só é publicado com autorização de uso de imagem registrada. | LGPD |
| BR-013 | Conteúdo do site é texto puro; HTML é escapado na renderização. | F10 |
| BR-014 | Dinheiro é armazenado em centavos (inteiro) e exibido no formato `R$ 1.234,56`. | E6 |
| BR-015 | Datas são armazenadas em UTC e exibidas no fuso `America/Sao_Paulo`. | F5 |
| BR-016 | Registro com histórico financeiro não é apagado: é inativado. | E6 |
| BR-017 | Uma cobrança não pode ser paga duas vezes; tentativa repetida é registrada e ignorada. | F6 |
| BR-018 | Webhook do Asaas é idempotente por `eventId` e tolera evento fora de ordem. | F6 |
| BR-019 | Criar cliente no Asaas exige CPF do pagador. | F6, Q-11 |
| BR-020 | Login tem limite de tentativas e bloqueio temporário. Valores em NFR-017. | F4 |
| BR-021 | Matrícula só é criada para aluno ativo e plano ativo. | E5 |
| BR-022 | Aula não pode ser agendada em horário já ocupado pelo mesmo instrutor. | E4 |
| BR-023 | Aula só pode ter presença registrada depois do horário agendado. | E4 |
| BR-024 | Cobrança vencida não muda sozinha para paga; depende de confirmação do gateway ou baixa manual. | E5 |
| BR-025 | Um aluno pode ter mais de uma matrícula ao longo do tempo, mas apenas uma ativa por categoria. | Q-22, P-16 |
| BR-026 | O instrutor acessa apenas as aulas que ministra e só pode escrever a análise daquelas aulas; não vê cobranças, matrículas de terceiros nem conteúdo do site. | Q-04 |
| BR-027 | Redefinição de senha é exclusiva do admin. Não existe autoatendimento de "esqueci minha senha" nem envio de e-mail de recuperação. | Q-14 |
| BR-028 | O preço cadastrado no plano é o valor **líquido** que a autoescola recebe. As taxas do meio de pagamento são absorvidas pela escola e **não** são somadas ao cliente, que paga exatamente o preço do plano. | Q-03 |
| BR-029 | Toda cobrança paga registra valor bruto, taxa do gateway e valor líquido; o admin vê os três no painel. | Q-03 |
| BR-030 | Cartão em até a quantidade máxima de parcelas definida no plano; juros do parcelamento são por conta da escola, dentro da mesma regra de absorção de BR-028. | Q-03 |
| BR-031 | A Evolution API usa um **número exclusivo** para notificações, nunca o número principal da autoescola, e a conexão é monitorada com alerta no painel quando cai. | Q-12 |

### 8.1 Transições de aula

| De | Para | Quem | Condição |
|---|---|---|---|
| — | `SCHEDULED` | admin | horário livre, matrícula ativa |
| `SCHEDULED` | `DONE` | admin | depois do início agendado, com presença |
| `SCHEDULED` | `ABSENT` | admin | depois do início agendado, sem presença |
| `SCHEDULED` | `CANCELED` | admin | antes do início; registra motivo |
| `SCHEDULED` | `RESCHEDULED` | admin | antes do início; gera nova aula `SCHEDULED` |
| `DONE`, `ABSENT`, `CANCELED` | — | — | estado final, sem transição |

### 8.2 Transições de cobrança

| De | Para | Quem | Condição |
|---|---|---|---|
| — | `PENDING` | sistema ou admin | criação por compra ou emissão |
| `PENDING` | `PAID` | sistema | evento de pagamento confirmado do Asaas |
| `PENDING` | `PAID` | admin | baixa manual, com motivo |
| `PENDING` | `OVERDUE` | sistema | vencimento ultrapassado |
| `PENDING`/`OVERDUE` | `CANCELED` | admin | antes do pagamento |
| `PAID` | `REFUNDED` | admin | estorno confirmado pelo Asaas |
| `PAID` | `CANCELED` | — | proibido: pago não é cancelado, é estornado |

---

## 9. Fluxos principais

Cada fluxo lista caminho principal e alternativos. Estados de tela estão em 11.3.

### FL-01 — Visitante conhece a escola e chama no WhatsApp
1. Visitante abre a landing (`/`).
2. Percorre topo, faixa de confiança, serviços, como funciona, planos, prova social, dúvidas e contato.
3. Aciona o botão flutuante ou um CTA de WhatsApp.
4. Sistema abre `https://wa.me/<número>?text=<mensagem>` em nova aba, com mensagem pré-preenchida.

| Alternativo | Comportamento |
|---|---|
| Número de WhatsApp não configurado | botão fica oculto e a seção de contato mostra apenas telefone e endereço |
| Conteúdo da seção vazio | seção não é renderizada, sem espaço reservado |
| Falha ao carregar planos | seção mostra erro com "tentar de novo" e o WhatsApp continua disponível |

### FL-02 — Visitante escolhe um plano e paga
1. Visitante escolhe o plano e aciona "quero este plano".
2. Sistema abre `/comprar/:slug` com resumo do plano.
3. Visitante informa nome, CPF, celular e e-mail e escolhe a forma de pagamento.
4. Sistema cria cliente e cobrança no Asaas e exibe Pix, boleto ou formulário de cartão.
5. Visitante paga.
6. Asaas confirma por webhook; sistema atualiza a cobrança e mostra confirmação.
7. Se o comprador não tem conta, o sistema oferece criar a conta do aluno (Q-01).

| Alternativo | Comportamento |
|---|---|
| Pagamento pendente | tela de acompanhamento com atualização automática e prazo de validade |
| Pagamento recusado | mensagem do motivo, opção de tentar outra forma |
| Pix ou boleto expirado | tela de expirado com opção de gerar nova cobrança |
| Compra abandonada | cobrança fica pendente; rotina diária de conciliação trata o vencimento |
| Plano inativado durante a compra | compra é recusada com mensagem e retorno aos planos |

### FL-03 — Criação da conta do aluno e primeiro acesso
1. Ao final da compra, o sistema cria usuário `STUDENT` com status pendente e envia o link de primeiro acesso.
2. Aluno abre o link, define a senha e entra.
3. Sistema ativa a conta e redireciona para o painel do aluno (Q-01).

| Alternativo | Comportamento |
|---|---|
| Admin cadastra o aluno no balcão | mesmo fluxo, com link gerado pelo admin |
| Link expirado | tela de link expirado com opção de solicitar novo |
| E-mail já cadastrado | sistema avisa e oferece recuperação de senha |

### FL-04 — Entrar, sair, sessão expirada e recuperação de senha
1. Aluno informa e-mail e senha em `/entrar`.
2. Sistema valida, cria sessão em cookie e redireciona para o destino original ou para o painel.
3. "Sair" encerra a sessão e apaga o cookie.

| Alternativo | Comportamento |
|---|---|
| Senha incorreta | mensagem única "e-mail ou senha inválidos", sem indicar o campo |
| Muitas tentativas | 429 e bloqueio temporário (NFR-017) |
| Sessão expirada | redireciona para `/entrar?next=<rota>` e volta ao destino após entrar |
| Esqueceu a senha | a tela informa que a redefinição é feita pela autoescola, com botão de WhatsApp; não há autoatendimento (BR-027) |
| Admin redefine a senha | sistema gera link de primeiro acesso de uso único, válido por 24 h, e o admin entrega ao usuário |

### FL-15 — Instrutor consulta a agenda e registra a análise da aula
1. Instrutor entra e cai em `/instrutor`.
2. Vê as aulas de hoje e da semana que ele ministra.
3. Abre uma aula já realizada.
4. Escreve a análise da aula daquele aluno (até 2.000 caracteres) e salva.
5. Sistema grava autor e data; o admin e o aluno passam a ver a análise.

| Alternativo | Comportamento |
|---|---|
| Aula ainda não realizada | campo de análise bloqueado com explicação |
| Aula de outro instrutor | 403 |
| Análise editada depois | permitido; registra data da última alteração |
| Erro ao salvar | texto preservado no formulário e mensagem de erro |

### FL-16 — Admin cancela cobrança e estorna
1. Admin abre a cobrança em `/admin/cobrancas`.
2. Cobrança pendente: `CANCELAR`, com motivo obrigatório; nada é cobrado do gateway.
3. Cobrança paga: `ESTORNAR`; o sistema calcula o valor — até 7 dias da compra, 100%; depois, 90% do valor pago (retenção de 10%, BR-009).
4. O sistema exibe valor pago, retenção e valor a devolver antes de confirmar.
5. Confirmado, o Asaas processa o estorno; a cobrança vai para `REFUNDED` e um aviso é registrado.
6. Aluno vê "estornado" com o valor devolvido.

| Alternativo | Comportamento |
|---|---|
| Cancelar cobrança já paga | bloqueado com 409; a ação correta é estornar |
| Estornar cobrança não paga | bloqueado com 409; a ação correta é cancelar |
| Falha no gateway | cobrança permanece `PAID`, estorno fica `FAILED` e o admin vê alerta |
| Segunda tentativa de estorno | 409 |

### FL-05 — Aluno consulta as aulas
1. Aluno abre `/aluno/aulas`.
2. Vê abas "a fazer" e "realizadas", com data, horário, instrutor e situação.
3. Abre o detalhe de uma aula, quando existir observação.

| Alternativo | Comportamento |
|---|---|
| Nenhuma aula | estado vazio explicando que a autoescola agenda as aulas |
| Erro de carregamento | erro com "tentar de novo" |

### FL-06 — Aluno consulta e paga cobranças
1. Aluno abre `/aluno/pagamentos`.
2. Vê pendentes e pagas, com situação em cor, ícone e texto.
3. Aciona "pagar" ou "segunda via".
4. Sistema abre a cobrança no Asaas (Pix, boleto ou link) e acompanha a confirmação.

| Alternativo | Comportamento |
|---|---|
| Cobrança vencida | botão "segunda via" e orientação para falar com a autoescola |
| Pagamento recém-confirmado | atualiza a lista sem recarregar |
| Sem cobranças | estado vazio informando que não há nada em aberto |

### FL-07 — Admin cadastra aluno e matrícula
1. Admin abre `/admin/alunos` e aciona "novo aluno".
2. Informa nome, CPF, celular, e-mail e dados opcionais.
3. Sistema valida CPF e duplicidade.
4. Admin escolhe plano e forma de pagamento da matrícula.
5. Sistema cria aluno, matrícula com valor contratado e, se aplicável, a cobrança.
6. Sistema gera link de primeiro acesso.

| Alternativo | Comportamento |
|---|---|
| CPF já cadastrado | sistema mostra o aluno existente e impede duplicidade |
| Plano inativo | não aparece para seleção |
| Sem e-mail | sistema exige e-mail para gerar acesso ou permite criar depois, com aviso |

### FL-08 — Admin emite boleto ou parcelamento
1. Admin abre a ficha do aluno e aciona "nova cobrança".
2. Escolhe valor, vencimento, quantidade de parcelas (quando houver) e descrição.
3. Sistema valida e cria a cobrança no Asaas.
4. Sistema exibe linha digitável, link do PDF e situação.

| Alternativo | Comportamento |
|---|---|
| Vencimento no passado | 422 com mensagem |
| Valor zero ou negativo | 422 |
| Falha no Asaas | cobrança não é criada localmente; erro exibido e ação registrada |
| Cobrança duplicada no mesmo dia | aviso de confirmação antes de emitir |

### FL-09 — Admin agenda aula e registra presença
1. Admin abre `/admin/aulas`, escolhe aluno e data.
2. Sistema verifica matrícula ativa, saldo de aulas e agenda do instrutor.
3. Admin confirma; aula nasce `SCHEDULED` e gera notificação de aula agendada (Q-08).
4. Depois do horário, admin registra presença ou falta.

| Alternativo | Comportamento |
|---|---|
| Horário ocupado | conflito 409 com o horário livre sugerido |
| Saldo de aulas esgotado | aviso; admin pode agendar mesmo assim, registrando observação |
| Presença antes do horário | 422 |
| Cancelamento | aula vai para `CANCELED`, com motivo e notificação |

### FL-10 — Admin altera plano ou valor, e a landing reflete
1. Admin abre `/admin/planos` e edita o valor.
2. Sistema pede confirmação, mostrando que matrículas existentes não mudam.
3. Sistema grava o novo valor e o histórico.
4. Landing passa a exibir o novo valor na próxima carga, sem deploy.

| Alternativo | Comportamento |
|---|---|
| Valor inválido | 422 e nada é gravado |
| Plano com matrícula ativa | permitido alterar valor; aviso explícito de que não retroage |
| Inativar plano | some da landing e do checkout; histórico preservado |

### FL-11 — Admin edita o conteúdo do site
1. Admin abre `/admin/conteudo`.
2. Escolhe a seção e o bloco.
3. Edita o texto e vê a pré-visualização.
4. Publica; a landing reflete na próxima carga.

| Alternativo | Comportamento |
|---|---|
| Texto acima do limite | bloqueio com contador e limite visível |
| Bloco obrigatório vazio | bloqueio com mensagem |
| Falha ao salvar | mantém o conteúdo anterior e exibe erro |

### FL-12 — Admin acompanha progresso e estudo por dia da semana
1. Admin abre a ficha do aluno, aba "progresso".
2. Escolhe o período (7, 30 ou 90 dias).
3. Vê aulas contratadas, realizadas, faltas e o gráfico de horas por dia da semana.
4. Exporta ou imprime, se necessário [A DEFINIR] (Q-23).

| Alternativo | Comportamento |
|---|---|
| Sem aulas registradas | gráfico vazio com explicação |
| Período sem dados | mensagem "sem registros no período" |

### FL-13 — Sistema recebe a confirmação de pagamento do Asaas
1. Asaas envia `POST /api/v1/webhooks/asaas` com token no header.
2. API valida o token, grava o evento bruto e responde 200.
3. Fila processa o evento: localiza a cobrança por `externalReference`, atualiza a situação e registra auditoria.
4. Sistema dispara notificação de pagamento confirmado (Q-08).

| Alternativo | Comportamento |
|---|---|
| Token inválido | 401, nada é gravado |
| Evento repetido | 200 sem reprocessar |
| Cobrança desconhecida | evento gravado como não conciliado e alerta no admin |
| Evento fora de ordem | transição inválida é ignorada e registrada |
| Fila indisponível | resposta 200 é mantida e o processamento é refeito pela fila |

### FL-14 — Sistema envia notificações por WhatsApp
1. Evento de negócio enfileira a notificação.
2. Worker compõe a mensagem a partir do modelo e dos dados.
3. Worker respeita horário permitido, limite de envios e consentimento.
4. Worker envia pela Evolution API e registra situação e tentativas.

| Alternativo | Comportamento |
|---|---|
| Sem consentimento | não envia e registra o motivo |
| Fora do horário permitido | reagenda para a próxima janela |
| Falha no envio | nova tentativa com intervalo crescente até o limite |
| Limite de tentativas atingido | marca falha e alerta no admin |

---

## 10. Requisitos funcionais

Cada requisito tem identificador estável, telas e endpoints associados. Endpoints estão na seção 13.

### 10.1 Público

#### FR-001 — Landing pública
**Descrição.** Página inicial com as seções da 11.1, alimentada pelo backend.
**Entradas e validações.** Nenhuma entrada do usuário.
**Regras.** BR-001, BR-013; conteúdo vem de FR-021; planos de FR-003; carrosséis de FR-002.
**Resultado.** Página renderizada com conteúdo publicado, planos ativos e carrosséis publicados.
**Telas.** UI-001, UI-023, UI-024, UI-025.
**Endpoints.** EP-09, EP-10, EP-11, EP-12.
**Critérios de aceite.**
- [ ] Todas as seções com conteúdo publicado aparecem na ordem da 11.1.
- [ ] Seção sem conteúdo não é renderizada, sem espaço reservado.
- [ ] Falha em uma seção não impede as demais de renderizar.
- [ ] Nenhum texto de marketing está escrito no código do frontend.
- [ ] A página entrega HTML com o conteúdo principal no build (FR-026).

#### FR-002 — Carrosséis de prova social
**Descrição.** Carrossel de depoimentos e carrossel de fotos de aprovados, cadastrados pelo admin.
**Entradas e validações.** Conteúdo vem de FR-021.
**Regras.** BR-012; sem item publicado, a seção não aparece; itens ordenados por campo `order`.
**Resultado.** Carrosséis navegáveis com itens publicados.
**Telas.** UI-001, UI-026.
**Endpoints.** EP-11.
**Critérios de aceite.**
- [ ] Dois carrosséis configuráveis: depoimentos e fotos de aprovados (Q-07).
- [ ] Item despublicado não aparece.
- [ ] Arrasto no celular, setas, indicadores e navegação por teclado funcionam.
- [ ] Autoplay, quando ligado, pausa em `hover`, em foco e com `prefers-reduced-motion`.
- [ ] Imagens têm espaço reservado, sem salto de layout, e carregam tardiamente fora da tela.
- [ ] Item sem autorização de uso de imagem não pode ser publicado (BR-012).

#### FR-003 — Planos e valores na landing
**Descrição.** Lista de planos ativos com nome, categoria, itens inclusos, valor à vista e valor parcelado.
**Entradas e validações.** Nenhuma; dados de FR-016.
**Regras.** BR-001, BR-002, BR-014; plano inativo não aparece.
**Resultado.** Cards de plano com ação de compra.
**Telas.** UI-001, UI-027.
**Endpoints.** EP-09.
**Critérios de aceite.**
- [ ] Apenas planos ativos aparecem, na ordem definida pelo admin.
- [ ] Valor exibido é exatamente o valor vigente no backend.
- [ ] Alterar o valor no admin reflete no próximo carregamento, sem deploy.
- [ ] Plano sem valor configurado não é exibido.
- [ ] Card mostra o que está incluso e a ação "quero este plano".

#### FR-004 — Botão flutuante de WhatsApp
**Descrição.** Botão fixo que abre conversa com mensagem pré-preenchida.
**Entradas e validações.** Número e mensagem vêm de FR-022.
**Regras.** Aparece nas páginas públicas; oculto no checkout e nas áreas autenticadas; não cobre ações, aviso de cookies nem rodapé.
**Resultado.** Nova aba com `https://wa.me/<número>?text=<mensagem>`.
**Telas.** UI-025.
**Endpoints.** EP-12.
**Critérios de aceite.**
- [ ] Botão de 56 px no canto inferior direito, respeitando a área segura do celular.
- [ ] Não sobrepõe botão de ação nem o rodapé em 360 px.
- [ ] `aria-label` descritivo presente.
- [ ] Número não configurado oculta o botão.
- [ ] Mensagem muda conforme a página ou o plano visualizado.
- [ ] Ícone do WhatsApp é SVG oficial, exceção documentada à regra de ícones Lucide.

#### FR-005 — Compra e pagamento de plano
**Descrição.** Fluxo de checkout com escolha de forma de pagamento e criação de cobrança no Asaas.
**Entradas e validações.** Nome completo (3–80), CPF válido, celular com DDD, e-mail válido, forma de pagamento (`PIX`, `BOLETO`, `CREDIT`, `DEBIT`), parcelas quando cartão de crédito.
**Regras.** BR-005, BR-006, BR-019, BR-021, BR-028, BR-030; valor sempre recalculado no servidor; o cliente paga exatamente o preço do plano, com as taxas absorvidas pela escola.
**Resultado.** Cobrança criada e tela de pagamento com instruções.
**Telas.** UI-002, UI-003.
**Endpoints.** EP-13, EP-14.
**Critérios de aceite.**
- [ ] Pedido com CPF inválido retorna 422 e não cria cobrança.
- [ ] Plano inativo retorna 422.
- [ ] Valor e quantidade de parcelas enviados pelo cliente são ignorados; prevalece o cálculo do servidor.
- [ ] O total exibido ao cliente é igual ao preço do plano, sem acréscimo de taxa.
- [ ] Cartão é tokenizado no navegador; nenhum dado de cartão trafega para a API.
- [ ] Pix exibe QR e código copia e cola com prazo de validade.
- [ ] Boleto exibe linha digitável e link do PDF.
- [ ] Pagamento pendente, confirmado, recusado e expirado têm telas distintas com próximo passo.
- [ ] Nenhuma cobrança é marcada como paga por retorno do navegador.

#### FR-006 — Acompanhamento do pagamento
**Descrição.** Tela de resultado que acompanha a situação da cobrança.
**Entradas e validações.** `publicToken` de 32 caracteres.
**Regras.** BR-005; atualização automática enquanto pendente; para ao chegar em situação final.
**Resultado.** Situação atualizada com próximo passo.
**Telas.** UI-003.
**Endpoints.** EP-14.
**Critérios de aceite.**
- [ ] Situação muda de pendente para paga sem recarregar a página.
- [ ] Atualização automática para após situação final.
- [ ] Token inválido exibe "cobrança não encontrada" e contato.
- [ ] A tela nunca afirma pagamento sem confirmação do servidor.

### 10.2 Acesso

#### FR-007 — Entrar e sair
**Descrição.** Autenticação por e-mail e senha, com sessão em cookie.
**Entradas e validações.** E-mail válido, senha de 8 a 72 caracteres.
**Regras.** BR-020, BR-007; resposta idêntica para e-mail inexistente e senha errada; perfil decide o destino.
**Resultado.** Sessão criada e redirecionamento por perfil.
**Telas.** UI-004.
**Endpoints.** EP-01, EP-02, EP-03, EP-04.
**Critérios de aceite.**
- [ ] Login válido cria cookie `httpOnly`, `Secure`, `SameSite` e retorna o perfil.
- [ ] Credencial inválida retorna a mesma mensagem e o mesmo status nos dois casos.
- [ ] Acima do limite de tentativas retorna 429 com orientação.
- [ ] Usuário inativo ou bloqueado recebe 403.
- [ ] Sair encerra a sessão no servidor e apaga o cookie.
- [ ] Rota restrita sem sessão redireciona para `/entrar` e volta ao destino depois.

#### FR-008 — Primeiro acesso
**Descrição.** Definição de senha por link de uso único.
**Entradas e validações.** Token de 32 bytes, senha com 8 a 72 caracteres, contendo letra e número.
**Regras.** Token de uso único com validade curta (NFR-023); uso repetido retorna 410.
**Resultado.** Conta ativa e sessão iniciada.
**Telas.** UI-006.
**Endpoints.** EP-07.
**Critérios de aceite.**
- [ ] Link válido permite definir senha e entrar.
- [ ] Segundo uso retorna 410 com opção de solicitar novo.
- [ ] Senha fraca retorna 422 com a regra visível.
- [ ] Definir a senha invalida sessões anteriores do usuário.

#### FR-009 — Redefinição de senha pelo admin
**Descrição.** O admin redefine a senha de qualquer usuário; o usuário entra por link de primeiro acesso.
**Entradas e validações.** `userId`, confirmação da ação.
**Regras.** BR-027; link de uso único válido por 24 h (NFR-023); não existe autoatendimento nem e-mail de recuperação.
**Resultado.** Link gerado e exibido ao admin, com opção de copiar; sessões antigas do usuário revogadas.
**Telas.** UI-005 (aviso ao usuário), UI-015 (ação do admin).
**Endpoints.** EP-07, EP-58.
**Critérios de aceite.**
- [ ] Aluno e instrutor não conseguem redefinir a senha de ninguém (403).
- [ ] Admin gera link e o link abre a tela de definição de senha.
- [ ] Link usado ou vencido retorna 410.
- [ ] Definir a nova senha revoga as sessões anteriores do usuário.
- [ ] A tela pública informa que a redefinição é feita pela autoescola, com contato.

### 10.3 Aluno

#### FR-010 — Painel resumo
**Descrição.** Tela inicial do aluno com três blocos: próxima aula, cobranças pendentes e progresso.
**Entradas e validações.** Sessão de aluno.
**Regras.** BR-007, BR-010.
**Resultado.** Resumo com atalhos.
**Telas.** UI-010.
**Endpoints.** EP-21.
**Critérios de aceite.**
- [ ] Mostra a próxima aula com data, hora e instrutor, ou estado vazio explicativo.
- [ ] Mostra o total em aberto e o próximo vencimento.
- [ ] Mostra progresso contratado versus realizado.
- [ ] Nenhum dado de outro aluno aparece na resposta.

#### FR-011 — Minhas aulas
**Descrição.** Lista de aulas do aluno, separada em a fazer e realizadas.
**Entradas e validações.** Filtro por período (opcional).
**Regras.** BR-007, BR-008.
**Resultado.** Lista com situação, data, horário e instrutor.
**Telas.** UI-011.
**Endpoints.** EP-22.
**Critérios de aceite.**
- [ ] Abas "a fazer" e "realizadas" com contagem.
- [ ] Situação exibida com cor, ícone e texto, nunca só cor.
- [ ] Estado vazio explica que o agendamento é feito pela autoescola.
- [ ] Aulas canceladas aparecem identificadas.

#### FR-012 — Meus pagamentos
**Descrição.** Lista de cobranças do aluno, pendentes e pagas, com ação de pagar ou segunda via.
**Entradas e validações.** Filtro por situação (opcional).
**Regras.** BR-005, BR-007, BR-014.
**Resultado.** Lista com valor, vencimento e situação.
**Telas.** UI-012.
**Endpoints.** EP-23, EP-38.
**Critérios de aceite.**
- [ ] Pendentes e pagas separadas visualmente.
- [ ] Ação "pagar" abre a cobrança correta do próprio aluno.
- [ ] Cobrança vencida oferece segunda via e orientação.
- [ ] Tentar abrir cobrança de outro aluno retorna 403.
- [ ] Confirmação de pagamento atualiza a lista sem recarregar.

#### FR-013 — Meus dados
**Descrição.** Consulta e edição dos próprios dados de contato.
**Entradas e validações.** Nome, celular, e-mail; CPF não editável pelo aluno.
**Regras.** BR-007; alterar e-mail exige confirmação.
**Resultado.** Dados salvos com aviso.
**Telas.** UI-013.
**Endpoints.** EP-24.
**Critérios de aceite.**
- [ ] Aluno edita apenas os próprios dados.
- [ ] CPF aparece mascarado e sem edição.
- [ ] E-mail duplicado retorna 409.
- [ ] Alteração gera registro de auditoria.

### 10.4 Administração

#### FR-014 — Painel administrativo
**Descrição.** Tela inicial com indicadores operacionais.
**Entradas e validações.** Sessão de admin.
**Regras.** BR-007.
**Resultado.** Contadores: alunos ativos, aulas da semana, cobranças em aberto, notificações com falha.
**Telas.** UI-014.
**Endpoints.** EP-16, EP-28, EP-33, EP-54.
**Critérios de aceite.**
- [ ] Indicadores conferem com as listas correspondentes.
- [ ] Cada indicador leva à tela filtrada.
- [ ] Estados de carregando, vazio e erro presentes.

#### FR-015 — Alunos e matrículas
**Descrição.** Cadastro, edição, inativação de alunos e gestão de matrículas.
**Entradas e validações.** Nome (3–80), CPF válido e único, celular, e-mail válido e único, plano ativo, data de início.
**Regras.** BR-021, BR-025, BR-016.
**Resultado.** Aluno e matrícula criados, com link de primeiro acesso.
**Telas.** UI-015, UI-016.
**Endpoints.** EP-16 a EP-20, EP-25 a EP-27.
**Critérios de aceite.**
- [ ] CPF inválido ou duplicado retorna 422/409.
- [ ] Matrícula grava o valor contratado e não muda quando o plano muda (BR-002).
- [ ] Inativar aluno não apaga histórico; impede novo acesso.
- [ ] Lista tem busca, filtro por situação e paginação.
- [ ] Link de primeiro acesso é exibido uma única vez.

#### FR-016 — Planos e valores com histórico
**Descrição.** CRUD de planos e alteração de valor com histórico.
**Entradas e validações.** Nome (3–60), categoria, itens inclusos (até 10), valor em centavos (> 0), quantidade máxima de parcelas (1–12), situação, ordem.
**Regras.** BR-001, BR-002, BR-003, BR-016.
**Resultado.** Plano salvo e landing atualizada.
**Telas.** UI-019.
**Endpoints.** EP-39 a EP-43.
**Critérios de aceite.**
- [ ] Alterar valor exige confirmação com aviso de que não retroage.
- [ ] Toda alteração gera linha no histórico com autor, data e valores.
- [ ] Valor zero ou negativo retorna 422.
- [ ] Plano com matrícula ativa não pode ser excluído, apenas inativado.
- [ ] Histórico é consultável na tela do plano.

#### FR-017 — Aulas e presença
**Descrição.** Agendamento, reagendamento, cancelamento e registro de presença.
**Entradas e validações.** Aluno, instrutor, data e hora, duração, tipo (`PRACTICAL`, `THEORETICAL`), situação.
**Regras.** BR-008, BR-022, BR-023; transições da 8.1.
**Resultado.** Aula registrada e notificações disparadas (Q-08).
**Telas.** UI-017.
**Endpoints.** EP-28 a EP-32.
**Critérios de aceite.**
- [ ] Conflito de horário do instrutor retorna 409 com sugestão.
- [ ] Presença antes do horário retorna 422.
- [ ] Cancelamento exige motivo e mantém a aula no histórico.
- [ ] Reagendar cria nova aula e marca a anterior como `RESCHEDULED`.
- [ ] Agenda mostra a semana e permite filtro por instrutor e situação.

#### FR-018 — Emissão de cobranças
**Descrição.** Emissão de boleto avulso e parcelamento pelo admin.
**Entradas e validações.** Aluno, descrição (3–120), valor em centavos (> 0), vencimento (hoje ou futuro), parcelas (1–12).
**Regras.** BR-004, BR-006, BR-017.
**Resultado.** Cobrança criada no Asaas e exibida com linha digitável.
**Telas.** UI-018.
**Endpoints.** EP-34.
**Critérios de aceite.**
- [ ] Vencimento no passado retorna 422.
- [ ] Valor zero ou negativo retorna 422.
- [ ] Falha no Asaas não cria cobrança local órfã.
- [ ] Parcelamento gera N cobranças vinculadas à mesma origem.
- [ ] Aluno não acessa este endpoint (403).

#### FR-019 — Cancelamento e estorno
**Descrição.** Cancelar cobrança pendente e estornar cobrança paga, com a regra de retenção.
**Entradas e validações.** Motivo (10–300), confirmação do valor calculado.
**Regras.** BR-004, BR-009, BR-017: até 7 dias corridos da compra o estorno é integral; depois, retenção de 10% sobre o valor pago.
**Resultado.** Cobrança `CANCELED` ou `REFUNDED`, com valor devolvido e auditoria.
**Telas.** UI-018.
**Endpoints.** EP-35, EP-36.
**Critérios de aceite.**
- [ ] Cancelar cobrança paga é bloqueado com 409.
- [ ] Estornar cobrança não paga é bloqueado com 409.
- [ ] Estorno dentro de 7 dias devolve 100% do valor pago.
- [ ] Estorno após 7 dias devolve 90% e registra a retenção de 10%.
- [ ] A tela mostra valor pago, retenção e valor a devolver antes da confirmação.
- [ ] Estorno só é dado como concluído após confirmação do Asaas.
- [ ] Falha no estorno mantém a cobrança como paga e gera alerta.
- [ ] Ação exige motivo e gera auditoria com autor e data.

#### FR-020 — Progresso e estudo por dia da semana
**Descrição.** Relatório por aluno com aulas contratadas, realizadas, faltas e horas por dia da semana.
**Entradas e validações.** Aluno, período (7, 30 ou 90 dias).
**Regras.** BR-010; base de cálculo: aulas com presença registrada (Q-05).
**Resultado.** Números e gráfico de barras.
**Telas.** UI-016, UI-028.
**Endpoints.** EP-52, EP-53.
**Critérios de aceite.**
- [ ] Total contratado vem da matrícula; realizado vem das aulas `DONE`.
- [ ] Gráfico mostra horas por dia da semana no período escolhido.
- [ ] Período sem dados exibe mensagem própria.
- [ ] Números batem com a lista de aulas do mesmo período.

#### FR-021 — Conteúdo do site
**Descrição.** Edição dos blocos de texto, das dúvidas frequentes e dos itens dos carrosséis.
**Entradas e validações.** Texto puro com limite por bloco; pergunta e resposta com limites; imagem com tipo e tamanho validados.
**Regras.** BR-013, BR-012; lista fechada de blocos (Q-06).
**Resultado.** Conteúdo publicado refletido na landing.
**Telas.** UI-020.
**Endpoints.** EP-44 a EP-50.
**Critérios de aceite.**
- [ ] Bloco obrigatório vazio é bloqueado.
- [ ] Texto acima do limite é bloqueado com contador visível.
- [ ] `<script>` é exibido como texto e não executa.
- [ ] Pré-visualização antes de publicar.
- [ ] Publicar reflete na landing sem deploy.
- [ ] Item de carrossel sem autorização de imagem não é publicado.

#### FR-022 — Configurações do site
**Descrição.** Edição de WhatsApp, telefone, endereço, horário, redes sociais e textos legais.
**Entradas e validações.** Telefone com 10 ou 11 dígitos, e-mail válido, CEP válido, URL de rede social válida.
**Regras.** Alteração vale sem deploy; campo vazio remove a informação do site.
**Resultado.** Rodapé, contato e botão flutuante atualizados.
**Telas.** UI-022, UI-024.
**Endpoints.** EP-51.
**Critérios de aceite.**
- [ ] WhatsApp inválido retorna 422.
- [ ] Alterar endereço reflete no rodapé.
- [ ] Campo vazio remove a linha em vez de exibir vazio.
- [ ] Dados estruturados LocalBusiness refletem nome, endereço, telefone e horário.

#### FR-023 — Registro de notificações
**Descrição.** Lista das notificações enviadas, com situação e reenvio.
**Entradas e validações.** Filtro por situação e período.
**Regras.** BR-011; toda tentativa é registrada.
**Resultado.** Lista com destinatário, modelo, situação, tentativas e erro.
**Telas.** UI-021.
**Endpoints.** EP-54, EP-55.
**Critérios de aceite.**
- [ ] Cada envio gera um registro com situação.
- [ ] Reenvio cria novo registro sem apagar o anterior.
- [ ] Notificação sem consentimento aparece com motivo.
- [ ] Logs não exibem conteúdo sensível de terceiros.

### 10.5 Integrações

#### FR-024 — Webhook do Asaas e conciliação
**Descrição.** Recebimento de eventos e rotina de conciliação.
**Entradas e validações.** Header `asaas-access-token`, corpo do evento.
**Regras.** BR-005, BR-017, BR-018; mapeamento de evento para situação em 13.9.
**Resultado.** Cobrança atualizada e auditoria registrada.
**Telas.** UI-018.
**Endpoints.** EP-56.
**Critérios de aceite.**
- [ ] Token inválido retorna 401 sem gravar.
- [ ] Evento repetido não duplica efeito.
- [ ] Evento fora de ordem não corrompe a situação.
- [ ] Cobrança desconhecida gera registro não conciliado e alerta.
- [ ] Rotina diária consulta cobranças em aberto e corrige divergência.
- [ ] Alerta existe para falha de webhook e para fila pausada.

#### FR-025 — Envio de WhatsApp
**Descrição.** Notificações automáticas pela Evolution API.
**Entradas e validações.** Evento, destinatário com consentimento, modelo aprovado.
**Regras.** BR-011, BR-031; lista fechada de eventos (Q-08, premissa da 13.10); horário permitido; limite de envios; nova tentativa com intervalo crescente; conexão por QR Code, com situação da conexão visível no painel.
**Resultado.** Mensagem enviada e registrada.
**Telas.** UI-021.
**Endpoints.** EP-54, EP-55, EP-61.
**Critérios de aceite.**
- [ ] Sem consentimento, nada é enviado e o motivo é registrado.
- [ ] Envio fora do horário é reagendado.
- [ ] Falha não bloqueia a operação principal.
- [ ] Em desenvolvimento e teste, o envio é simulado.
- [ ] A tela de notificações mostra se a conexão está ativa ou caiu, com data da última verificação.
- [ ] Conexão caída gera alerta no painel e o pagamento continua sendo registrado normalmente.
- [ ] O número configurado é diferente do número principal da autoescola; número igual é recusado com 422.

#### FR-026 — Publicação e compartilhamento
**Descrição.** Pré-renderização das rotas públicas, metadados e arquivos de indexação.
**Entradas e validações.** Conteúdo publicado.
**Regras.** Rotas privadas com `noindex`; fallback de SPA configurado na hospedagem.
**Resultado.** HTML com conteúdo, título, descrição, Open Graph, sitemap e robots.
**Telas.** UI-001, UI-007, UI-008.
**Endpoints.** EP-09, EP-10, EP-12, EP-15.
**Critérios de aceite.**
- [ ] HTML entregue contém o conteúdo principal das rotas públicas.
- [ ] Cada rota pública tem título e descrição únicos.
- [ ] Link compartilhado no WhatsApp exibe prévia.
- [ ] `sitemap.xml` e `robots.txt` respondem corretamente.
- [ ] Rotas privadas têm `noindex`.

#### FR-027 — Área do instrutor e análise da aula
**Descrição.** O instrutor entra, vê a própria agenda e registra a análise de cada aula de cada aluno.
**Entradas e validações.** `lessonId`; texto da análise com até 2.000 caracteres.
**Regras.** BR-026; o instrutor só enxerga e escreve nas aulas que ministra; a análise só é liberada depois da aula realizada.
**Resultado.** Análise salva e visível para admin e aluno.
**Telas.** UI-029.
**Endpoints.** EP-59, EP-60.
**Critérios de aceite.**
- [ ] Instrutor vê somente as próprias aulas.
- [ ] Escrever em aula de outro instrutor retorna 403.
- [ ] Análise em aula não realizada retorna 422.
- [ ] Texto acima de 2.000 caracteres retorna 422.
- [ ] O aluno vê a análise da própria aula; o instrutor não vê cobranças nem matrículas de terceiros.
- [ ] Análise editada registra a data da última alteração.

---

## 11. Requisitos de interface

### 11.1 Seções da landing

Ordem recomendada, a confirmar (Q-24).

| # | Seção | Objetivo | Conteúdo | Origem | Ação principal | Requisito |
|---|---|---|---|---|---|---|
| 1 | Cabeçalho fixo | orientar e converter | logo, âncoras, "Área do aluno", botão principal; menu lateral no celular | logo [A DEFINIR] (Q-17); rótulos fixos | ver planos | UI-023 |
| 2 | Topo | dizer o que é e para quem | frase de proposta de valor, subtítulo, botão principal, botão WhatsApp, foto real | admin (texto) e foto [A DEFINIR] (Q-17) | ver planos | UI-001 |
| 3 | Faixa de confiança | reduzir risco | números e selos reais, digitados pelo admin | admin | — | UI-001 |
| 4 | Serviços e categorias | mostrar o que vende | categorias e serviços | admin | ver planos | FR-003 |
| 5 | Como funciona | reduzir dúvida | passos do processo | admin | ver planos | UI-001 |
| 6 | Planos e valores | vender | cards com valor e inclusos | backend | comprar | FR-003 |
| 7 | Prova social | dar credibilidade | carrossel de depoimentos e de fotos | admin | — | FR-002 |
| 8 | Diferenciais, frota e instrutores | diferenciar | conteúdo real, se existir | admin | WhatsApp | UI-001 |
| 9 | Perguntas frequentes | derrubar objeção | acordeão | admin | WhatsApp | UI-001 |
| 10 | Localização, horário e contato | orientar | endereço, mapa, horário, telefone | admin | abrir mapa | UI-001 |
| 11 | Chamada final | converter | CTA repetido | admin | comprar ou WhatsApp | UI-001 |
| 12 | Rodapé | informar e dar segurança | razão social, CNPJ, credenciamento, privacidade, termos, redes | admin (campos de texto) | — | UI-024 |

Depoimentos, fotos e números são sempre reais. Enquanto o dono não fornecer, usar marcador visível de "exemplo" e nunca publicar como real (I-16).

### 11.2 Regras gerais de interface

- Componentes do shadcn/ui antes de criar novos: Carousel, Accordion, Sheet, Dialog, Form, Table, Sonner, Skeleton, Badge, Chart.
- Tokens do `design.md` viram tema do Tailwind e variáveis do shadcn/ui; cor literal em componente é proibida.
- Nenhum texto de interface genérico ou "lorem ipsum"; textos em pt-BR definidos na spec ou em arquivo de conteúdo.
- Formatos: moeda `R$ 1.234,56`; data `dd/mm/aaaa`; hora em 24 h; telefone `(21) 91234-5678`; CPF `000.000.000-00`.
- Todo campo de senha tem botão de mostrar/ocultar com `aria-label` e `aria-pressed` (G10).
- Formulários: rótulo sempre visível, validação ao sair do campo e ao enviar, mensagem que diz como corrigir, dados preservados após erro, botão desabilitado com indicador durante o envio.
- Teclado adequado ao campo: numérico em valor, CPF e telefone; e-mail em e-mail.
- Máscaras de CPF, telefone e CEP.
- Animações curtas, apenas em `transform` e `opacity`, desligadas com `prefers-reduced-motion`.
- Nada de rolagem horizontal em nenhuma largura.

### 11.3 Mapa de telas e rotas

| ID | Tela | Rota | Perfil | Requisitos | Estados |
|---|---|---|---|---|---|
| UI-001 | Landing | `/` | público | FR-001, FR-002, FR-003, FR-026 | carregando (skeleton), parcial (seção com erro), sucesso, conteúdo de exemplo |
| UI-002 | Compra | `/comprar/:slug` | público | FR-005 | carregando, erro por campo, erro geral, enviando, desabilitado |
| UI-003 | Resultado do pagamento | `/pagamento/:token` | público | FR-005, FR-006 | pendente, pago, recusado, expirado, não encontrado |
| UI-004 | Entrar | `/entrar` | público | FR-007 | carregando, erro, bloqueado, enviando |
| UI-005 | Aviso de senha | `/senha` | público | FR-009 | informativo: redefinição feita pela autoescola, com contato |
| UI-006 | Primeiro acesso | `/primeiro-acesso/:token` | público | FR-008 | válido, expirado, usado, erro de senha |
| UI-007 | Política de privacidade | `/privacidade` | público | FR-026 | carregando, sucesso, erro |
| UI-008 | Termos de uso | `/termos` | público | FR-026 | carregando, sucesso, erro |
| UI-009 | Não encontrada | `*` | público | FR-026 | sucesso |
| UI-010 | Painel do aluno | `/aluno` | aluno | FR-010 | carregando, vazio, erro |
| UI-011 | Minhas aulas | `/aluno/aulas` | aluno | FR-011 | carregando, vazio, erro, sucesso |
| UI-012 | Meus pagamentos | `/aluno/pagamentos` | aluno | FR-012 | carregando, vazio, erro, sucesso |
| UI-013 | Meus dados | `/aluno/dados` | aluno | FR-013 | carregando, erro por campo, sucesso |
| UI-014 | Painel admin | `/admin` | admin | FR-014 | carregando, vazio, erro |
| UI-015 | Alunos | `/admin/alunos` | admin | FR-015 | carregando, vazio, erro, sem resultado de busca |
| UI-016 | Ficha do aluno | `/admin/alunos/:id` | admin | FR-015, FR-020 | carregando, erro, abas |
| UI-017 | Aulas | `/admin/aulas` | admin | FR-017 | carregando, vazio, erro, conflito |
| UI-018 | Cobranças | `/admin/cobrancas` | admin | FR-018, FR-019 | carregando, vazio, erro, processando |
| UI-019 | Planos | `/admin/planos` | admin | FR-016 | carregando, vazio, erro, confirmação |
| UI-020 | Conteúdo do site | `/admin/conteudo` | admin | FR-021 | carregando, vazio, erro, pré-visualização, publicado |
| UI-021 | Notificações | `/admin/notificacoes` | admin | FR-023, FR-025 | carregando, vazio, erro, reenviando |
| UI-022 | Configurações | `/admin/configuracoes` | admin | FR-022 | carregando, erro por campo, sucesso |
| UI-023 | Cabeçalho | componente global | público | FR-001 | aberto, fechado, menu móvel |
| UI-024 | Rodapé | componente global | público | FR-022 | completo, reduzido (campo vazio) |
| UI-025 | WhatsApp flutuante | componente global | público | FR-004 | visível, oculto |
| UI-026 | Carrossel | componente | público | FR-002 | com itens, sem itens, arrastando, pausado |
| UI-027 | Card de plano | componente | público | FR-003 | destaque, indisponível, promoção |
| UI-028 | Gráfico de estudo | componente | admin | FR-020 | com dados, vazio, período sem dados |
| UI-029 | Área do instrutor | `/instrutor` | instrutor | FR-027 | carregando, vazio (sem aulas), erro, análise salva, análise bloqueada |

Rota restrita sem sessão leva a `/entrar` e retorna ao destino.

### 11.4 Acessibilidade

Metas obrigatórias, verificáveis:

- WCAG 2.2 nível AA.
- Contraste mínimo 4,5:1 em texto e 3:1 em texto grande e componentes.
- Foco sempre visível, com indicador que não depende só de cor.
- Link "pular para o conteúdo" na primeira posição de tabulação.
- Um único `h1` por página e hierarquia de títulos sem saltos.
- `lang="pt-BR"` no documento.
- Erro de campo ligado ao campo por `aria-describedby` e `aria-invalid`.
- Avisos dinâmicos com `aria-live`.
- Modal prende o foco, fecha com `Esc` e devolve o foco ao elemento que o abriu.
- Toda ação por teclado, inclusive carrossel, acordeão e menu.
- Imagem com texto alternativo; imagem decorativa com `alt=""`.
- Alvos de toque de pelo menos 44 × 44 px.
- Nenhum conteúdo essencial depende de movimento ou de cor isolada.

### 11.5 Responsividade

- Projeto pensado primeiro para celular, largura base de 360 px.
- Até 767 px: uma coluna, menu lateral, navegação inferior na área do aluno.
- 768 a 1023 px: duas colunas em listas e cards.
- 1024 px ou mais: navegação lateral, tabelas completas, largura máxima de conteúdo definida no `design.md`.
- Larguras de verificação: 360, 390, 768, 1024, 1280 e 1440 px.
- Nenhuma rolagem horizontal em nenhuma das larguras.

### 11.6 Mockup e aprovação (regra 12)

| Item | Regra |
|---|---|
| Exige mockup | tela nova, seção nova, ou mudança de layout, cor ou tipografia em algo já aprovado |
| Não exige | correção de defeito visual e ajuste para cumprir o `design.md` |
| Formato | a própria tela em rota de pré-visualização com dados de exemplo, mais capturas em 360 px e 1280 px |
| Granularidade | um mockup por tela ou seção, nunca por componente isolado |
| Aprovação | registrada em `decisions.md` com data, identificador UI- e quem aprovou (Q-18) |
| Dados de exemplo | não ferem I-05 desde que saiam antes de a funcionalidade ser dada como pronta |

### 11.7 Conteúdo por tela (regras específicas)

**UI-001 Landing.** Cabeçalho fixo; herói com no máximo uma frase de proposta de valor; o herói não pode ocupar a dobra inteira em 1280 px — o primeiro card de plano precisa aparecer com no máximo uma rolagem curta; contato sempre visível no rodapé.

**UI-002 Compra.** Passos visíveis (dados, pagamento, confirmação); resumo do plano sempre à vista; valor e parcelamento explícitos; nenhum dado de cartão trafega pela API.

**UI-003 Resultado.** Cada situação tem próximo passo: pendente (aguardar e atualizar), pago (instruções de acesso), recusado (tentar outra forma), expirado (gerar nova cobrança).

**UI-010 a UI-013 Área do aluno.** Planejada para celular; navegação inferior no celular e lateral no desktop; situação sempre em cor, ícone e texto.

**UI-014 a UI-022 Admin.** Rótulos em linguagem do dia a dia, sem jargão técnico; tabelas com busca, filtro, ordenação e paginação; no celular, tabela vira lista de cards; toda ação destrutiva ou financeira pede confirmação.

---

## 12. Modelo de dados

Regras gerais: dinheiro em centavos (`Int`); datas em UTC; `createdAt` e `updatedAt` em toda tabela; registros com histórico financeiro nunca são apagados (BR-016); `deletedAt` só para registros sem histórico.

### 12.1 Entidades

**User**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| name | string | sim | 3–80 |
| email | string | sim | único, minúsculo |
| passwordHash | string | sim | Argon2id |
| role | enum | sim | `ADMIN`, `INSTRUCTOR`, `STUDENT` |
| status | enum | sim | `PENDING`, `ACTIVE`, `BLOCKED`, `INACTIVE` |
| mustChangePassword | bool | sim | padrão `true` para conta criada por admin |
| lastLoginAt | datetime | não | servidor |
| failedAttempts | int | sim | padrão 0 |
| lockedUntil | datetime | não | bloqueio temporário |

**Student**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| userId | uuid | sim | único, FK `User` |
| cpf | string | sim | único, 11 dígitos, validado |
| phone | string | sim | 10–11 dígitos |
| birthDate | date | não | [A DEFINIR] (Q-11) |
| address | json | não | [A DEFINIR] (Q-11) |
| consentWhatsapp | bool | sim | padrão `false` |
| consentImage | bool | sim | padrão `false` |
| notes | text | não | até 1000 |

Índice: `(cpf)` único; `(userId)` único.

**Plan**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| name | string | sim | 3–60 |
| category | string | sim | [A DEFINIR] (Q-09) |
| description | text | não | até 300 |
| priceCents | int | sim | > 0; valor **líquido** que a autoescola recebe (BR-028) |
| maxInstallments | int | sim | 1–12 |
| includes | string[] | não | até 10 itens |
| active | bool | sim | padrão `true` |
| order | int | sim | inteiro |

**PlanPriceHistory**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| planId | uuid | sim | FK `Plan` |
| oldPriceCents | int | sim | ≥ 0 |
| newPriceCents | int | sim | ≥ 0 |
| changedByUserId | uuid | sim | FK `User` |
| createdAt | datetime | sim | servidor |

**FeeRule**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| method | enum | sim | `PIX`, `BOLETO`, `CREDIT`, `DEBIT` |
| percentBps | int | sim | 0–10000 (base para calcular a taxa) |
| fixedCents | int | sim | ≥ 0 |
| active | bool | sim | padrão `true` |

Serve para **calcular** a taxa que a escola absorve (BR-028) e para mostrar o líquido no painel (BR-029). Não altera o preço cobrado do cliente. Valores vigentes na conta Asaas são conferidos pela implementação antes de configurar.

**FeePolicy** (singleton via `SiteSetting`)

| Chave | Valores | Situação |
|---|---|---|
| `fees.bearer` | `SCHOOL` (fixo) | Q-03: a escola absorve a taxa. A alternativa `CUSTOMER` está descartada |
| `fees.enabledMethods` | lista de métodos | todos por padrão |

A taxa é calculada para o painel (BR-029) e para o repasse da escola; nunca é somada ao preço mostrado ao cliente.

**Enrollment**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| studentId | uuid | sim | FK `Student` |
| planId | uuid | sim | FK `Plan` |
| contractedPriceCents | int | sim | congelado na criação (BR-002) |
| contractedLessons | int | sim | quantidade de aulas do plano |
| status | enum | sim | `ACTIVE`, `FINISHED`, `CANCELED` |
| startedAt | date | sim | servidor ou informada |
| finishedAt | date | não | — |

Índice: `(studentId, status)`; regra de uma matrícula ativa por categoria (BR-025, Q-22).

**Instructor**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| userId | uuid | sim | único, FK `User`; dá acesso à área do instrutor |
| name | string | sim | 3–80 |
| phone | string | não | 10–11 dígitos |
| active | bool | sim | padrão `true` |

Instrutor sem `userId` não acessa o sistema; o admin cria o acesso ao cadastrar o instrutor. A senha segue BR-027 (só o admin redefine).

**Lesson**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| enrollmentId | uuid | sim | FK `Enrollment` |
| instructorId | uuid | sim | FK `Instructor` |
| type | enum | sim | `PRACTICAL`, `THEORETICAL` |
| scheduledAt | datetime | sim | UTC |
| durationMin | int | sim | 30–240 |
| status | enum | sim | `SCHEDULED`, `DONE`, `ABSENT`, `CANCELED`, `RESCHEDULED` |
| attendanceAt | datetime | não | preenchido no registro |
| attendanceByUserId | uuid | não | FK `User` |
| notes | text | não | até 500 |
| analysis | text | não | até 2.000; análise do instrutor sobre a aula (FR-027) |
| analysisByUserId | uuid | não | FK `User` do instrutor que escreveu |
| analysisAt | datetime | não | última alteração da análise |
| cancelReason | string | não | 3–200 |

Índice: `(instructorId, scheduledAt)` para conflito (BR-022); `(enrollmentId, scheduledAt)`.

**Charge**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| studentId | uuid | sim | FK `Student` |
| enrollmentId | uuid | não | FK `Enrollment` |
| kind | enum | sim | `PLAN`, `INSTALLMENT`, `EXTRA` |
| description | string | sim | 3–120 |
| amountCents | int | sim | > 0 |
| dueDate | date | sim | hoje ou futuro |
| status | enum | sim | `PENDING`, `PAID`, `OVERDUE`, `CANCELED`, `REFUNDED` |
| method | enum | não | `PIX`, `BOLETO`, `CREDIT`, `DEBIT` |
| asaasId | string | não | único |
| externalReference | string | sim | único; liga evento a cobrança |
| invoiceUrl | string | não | — |
| pixPayload | text | não | — |
| publicToken | string | sim | único, 32 caracteres |
| paidAt | datetime | não | — |
| paidByUserId | uuid | não | baixa manual |
| feeCents | int | não | taxa estimada/confirmada do meio de pagamento |
| netCents | int | não | `amountCents − feeCents`, quando a escola absorve (BR-029) |
| canceledAt | datetime | não | — |
| refundedAt | datetime | não | — |
| installments | int | sim | 1–12 |
| groupId | uuid | não | agrupa parcelas da mesma origem |

Índices: `(studentId, status)`, `(status, dueDate)`, `(externalReference)` único, `(asaasId)` único.

**Refund**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| chargeId | uuid | sim | único, FK `Charge` |
| amountCents | int | sim | valor devolvido |
| reason | string | sim | 10–300 |
| status | enum | sim | `REQUESTED`, `PROCESSING`, `DONE`, `FAILED` |
| asaasRefundId | string | não | — |
| requestedByUserId | uuid | sim | FK `User` |
| error | string | não | — |

**WebhookEvent**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| provider | enum | sim | `ASAAS` |
| eventId | string | sim | único |
| payload | json | sim | bruto |
| receivedAt | datetime | sim | servidor |
| processedAt | datetime | não | — |
| status | enum | sim | `RECEIVED`, `PROCESSED`, `IGNORED`, `FAILED` |

**NotificationLog**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| channel | enum | sim | `WHATSAPP` |
| template | string | sim | identificador do modelo (13.10) |
| to | string | sim | E.164 |
| body | text | sim | mensagem renderizada |
| status | enum | sim | `QUEUED`, `SENT`, `FAILED`, `SKIPPED` |
| attempts | int | sim | padrão 0 |
| error | string | não | — |
| relatedType | string | não | `Charge`, `Lesson` |
| relatedId | uuid | não | — |
| sentAt | datetime | não | — |

**CarouselItem**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| carousel | enum | sim | `TESTIMONIALS`, `APPROVED_PHOTOS` (Q-07) |
| studentName | string | não | 2–60 |
| category | string | não | — |
| text | text | não | até 400 |
| imageUrl | string | não | — |
| imageAlt | string | não | obrigatório quando há imagem |
| order | int | sim | inteiro |
| published | bool | sim | padrão `false` |
| consentImage | bool | sim | obrigatório `true` para publicar (BR-012) |

**SiteContent**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| key | string | sim | único, ex. `hero.headline` |
| section | enum | sim | `HEADER`, `HERO`, `TRUST`, `SERVICES`, `HOW`, `PLANS`, `SOCIAL`, `DIFFERENTIALS`, `FAQ`, `CONTACT`, `FINAL`, `FOOTER` |
| type | enum | sim | `TEXT`, `TEXTAREA`, `URL` |
| value | text | não | texto puro; limite por chave |
| maxLength | int | sim | 40–800 |
| required | bool | sim | padrão `false` |

**SiteContentRevision** — `id`, `siteContentId`, `oldValue`, `newValue`, `changedByUserId`, `createdAt`.

**SiteSetting**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| key | string | sim | único, ex. `contact.whatsapp` |
| value | json | sim | validado por chave |
| updatedByUserId | uuid | não | — |
| updatedAt | datetime | sim | — |

Chaves institucionais editáveis como texto livre pelo admin (Q-20): `institution.legalName`, `institution.cnpj`, `institution.accreditation`, `contact.addressLine1`, `contact.addressLine2`, `contact.hours`, `contact.phone`, `contact.whatsapp`, `contact.email`, `social.instagram`. Campo vazio não aparece no rodapé (FR-022).

**AuditLog**

| Campo | Tipo | Obrig. | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| actorUserId | uuid | não | nulo em ação de sistema |
| action | string | sim | ex. `PLAN_PRICE_UPDATED` |
| entity | string | sim | nome da entidade |
| entityId | uuid | não | — |
| before | json | não | — |
| after | json | não | — |
| ip | string | não | — |
| createdAt | datetime | sim | servidor |

**Session** — `id`, `userId`, `familyId`, `tokenHash` (único), `expiresAt`, `revokedAt`, `ip`, `userAgent`, `createdAt`.

**PasswordResetToken** — `id`, `userId`, `tokenHash` (único), `purpose` (`RESET`, `FIRST_ACCESS`), `expiresAt`, `usedAt`.

### 12.2 Relacionamentos

```
User 1—1 Student
User 1—1 Instructor
Student 1—N Enrollment N—1 Plan
Enrollment 1—N Lesson N—1 Instructor
Student 1—N Charge
Enrollment 1—N Charge
Charge 1—0..1 Refund
Charge N—1 WebhookEvent (via externalReference, lógica)
User 1—N AuditLog
Lesson 1—1 User (analysisByUserId, opcional)
```

---

## 13. API e integrações

Prefixo `/api/v1`. Formato único de erro:

```json
{ "statusCode": 422, "code": "VALIDATION_ERROR", "message": "Texto em pt-BR para o usuário", "details": [{ "field": "cpf", "message": "CPF inválido" }], "requestId": "..." }
```

Paginação padronizada: `?page=1&perPage=20` com resposta `{ "items": [], "page": 1, "perPage": 20, "total": 0 }`. `perPage` máximo 100. Documentação OpenAPI gerada pelo NestJS é o contrato vivo.

### 13.1 Acesso

| ID | Método | Rota | Quem | Requisição | Resposta | Erros |
|---|---|---|---|---|---|---|
| EP-01 | POST | `/auth/login` | público | `email`, `password` | `accessToken`, `user` + cookie | 401, 403, 429, 422 |
| EP-02 | POST | `/auth/refresh` | cookie | — | `accessToken` + cookie rotacionado | 401 |
| EP-03 | POST | `/auth/logout` | aluno, instrutor, admin | — | 204 | 401 |
| EP-04 | GET | `/auth/me` | aluno, instrutor, admin | — | `user` | 401 |
| EP-07 | POST | `/auth/first-access` | público | `token`, `password` | 204 + sessão | 410, 422 |

Os endpoints de autoatendimento de senha (`/auth/password/forgot`, `/auth/password/reset` e `/auth/password/change`) foram **removidos na 0.3.0**: a redefinição é exclusiva do admin (BR-027).

### 13.2 Público

| ID | Método | Rota | Quem | Requisição | Resposta | Erros |
|---|---|---|---|---|---|---|
| EP-09 | GET | `/public/plans` | público | — | planos ativos | 500 |
| EP-10 | GET | `/public/content` | público | — | blocos publicados | 500 |
| EP-11 | GET | `/public/carousels` | público | — | itens publicados por carrossel | 500 |
| EP-12 | GET | `/public/settings` | público | — | WhatsApp, telefone, endereço, horário, redes | 500 |
| EP-13 | POST | `/public/checkout` | público | `planId`, `name`, `cpf`, `phone`, `email`, `method`, `installments` | `charge`, `payment` | 404, 409, 422, 429 |
| EP-14 | GET | `/public/charges/:token` | público | — | situação da cobrança | 404 |
| EP-15 | GET | `/public/pages/:slug` | público | — | conteúdo de privacidade ou termos | 404 |

### 13.3 Aluno e instrutor

| ID | Método | Rota | Quem | Requisição | Resposta | Erros |
|---|---|---|---|---|---|---|
| EP-21 | GET | `/me/summary` | aluno | — | próxima aula, em aberto, progresso | 401 |
| EP-22 | GET | `/me/lessons` | aluno | `status`, `page` | aulas do aluno | 401 |
| EP-23 | GET | `/me/charges` | aluno | `status`, `page` | cobranças do aluno | 401 |
| EP-24 | GET/PATCH | `/me/profile` | aluno | dados de contato | perfil | 401, 409, 422 |
| EP-59 | GET | `/instructor/lessons` | instrutor | `from`, `to` | aulas que ele ministra | 401, 403 |
| EP-60 | POST | `/instructor/lessons/:id/analysis` | instrutor | `analysis` (até 2.000) | aula com análise | 401, 403, 404, 409, 422 |

### 13.4 Admin — pessoas e matrículas

| ID | Método | Rota | Quem | Requisição | Resposta | Erros |
|---|---|---|---|---|---|---|
| EP-16 | GET | `/admin/students` | admin | `q`, `status`, `page` | lista paginada | 401, 403 |
| EP-17 | POST | `/admin/students` | admin | dados do aluno + plano | aluno + matrícula + link | 409, 422 |
| EP-18 | GET | `/admin/students/:id` | admin | — | aluno completo | 403, 404 |
| EP-19 | PATCH | `/admin/students/:id` | admin | campos editáveis | aluno | 403, 404, 422 |
| EP-20 | DELETE | `/admin/students/:id` | admin | — | 204 (inativa) | 403, 404, 409 |
| EP-25 | GET | `/admin/enrollments` | admin | `studentId`, `status` | matrículas | 403 |
| EP-26 | POST | `/admin/enrollments` | admin | `studentId`, `planId` | matrícula | 403, 409, 422 |
| EP-27 | PATCH | `/admin/enrollments/:id` | admin | `status` | matrícula | 403, 404, 409 |
| EP-58 | POST | `/admin/users/:id/password-link` | admin | — | link de primeiro acesso (24 h) | 403, 404, 409 |

### 13.5 Admin — aulas

| ID | Método | Rota | Quem | Requisição | Resposta | Erros |
|---|---|---|---|---|---|---|
| EP-28 | GET | `/admin/lessons` | admin | `from`, `to`, `instructorId`, `status` | agenda | 403 |
| EP-29 | POST | `/admin/lessons` | admin | `enrollmentId`, `instructorId`, `type`, `scheduledAt`, `durationMin` | aula | 403, 409, 422 |
| EP-30 | PATCH | `/admin/lessons/:id` | admin | `scheduledAt`, `instructorId` | aula | 403, 404, 409 |
| EP-31 | POST | `/admin/lessons/:id/attendance` | admin | `status` (`DONE`/`ABSENT`) | aula | 403, 404, 409, 422 |
| EP-32 | POST | `/admin/lessons/:id/cancel` | admin | `reason` | aula | 403, 404, 409, 422 |

### 13.6 Admin — cobranças

| ID | Método | Rota | Quem | Requisição | Resposta | Erros |
|---|---|---|---|---|---|---|
| EP-33 | GET | `/admin/charges` | admin | `studentId`, `status`, `from`, `to`, `page` | lista paginada | 403 |
| EP-34 | POST | `/admin/charges` | admin | `studentId`, `description`, `amountCents`, `dueDate`, `installments` | cobranças criadas | 403, 409, 422, 502 |
| EP-35 | POST | `/admin/charges/:id/cancel` | admin | `reason` | cobrança | 403, 404, 409 |
| EP-36 | POST | `/admin/charges/:id/refund` | admin | `reason` | estorno | 403, 404, 409, 502 |
| EP-37 | POST | `/admin/charges/:id/mark-paid` | admin | `reason` | cobrança | 403, 404, 409, 422 |
| EP-38 | GET | `/admin/charges/:id` | admin e aluno dono | — | cobrança | 403, 404 |

### 13.7 Admin — planos, conteúdo, relatórios

| ID | Método | Rota | Quem | Requisição | Resposta | Erros |
|---|---|---|---|---|---|---|
| EP-39 | GET | `/admin/plans` | admin | `active`, `page` | planos | 403 |
| EP-40 | POST | `/admin/plans` | admin | dados do plano | plano | 403, 409, 422 |
| EP-41 | PATCH | `/admin/plans/:id` | admin | dados do plano | plano + histórico | 403, 404, 422 |
| EP-42 | PATCH | `/admin/plans/:id/status` | admin | `active` | plano | 403, 404, 409 |
| EP-43 | GET | `/admin/plans/:id/history` | admin | `page` | histórico | 403, 404 |
| EP-44 | GET | `/admin/content` | admin | `section` | blocos e revisões | 403 |
| EP-45 | PATCH | `/admin/content/:key` | admin | `value` | bloco + revisão | 403, 404, 422 |
| EP-46 | GET | `/admin/carousels` | admin | `carousel` | itens | 403 |
| EP-47 | POST | `/admin/carousels` | admin | item | item | 403, 422 |
| EP-48 | PATCH | `/admin/carousels/:id` | admin | item | item | 403, 404, 422 |
| EP-49 | DELETE | `/admin/carousels/:id` | admin | — | 204 | 403, 404 |
| EP-50 | POST | `/admin/media` | admin | arquivo | `url` | 403, 413, 415, 422 |
| EP-51 | GET/PATCH | `/admin/settings` | admin | chaves | configurações | 403, 422 |
| EP-52 | GET | `/admin/reports/students/:id/progress` | admin | `from`, `to` | totais e progresso | 403, 404 |
| EP-53 | GET | `/admin/reports/weekly-study` | admin | `studentId`, `from`, `to` | horas por dia da semana | 403, 404 |
| EP-54 | GET | `/admin/notifications` | admin | `status`, `page` | registros | 403 |
| EP-55 | POST | `/admin/notifications/:id/retry` | admin | — | novo registro | 403, 404, 409 |
| EP-61 | GET | `/admin/whatsapp/status` | admin | — | `{ connected, lastCheckAt }` | 403 |

### 13.8 Webhooks e saúde

| ID | Método | Rota | Quem | Requisição | Resposta | Erros |
|---|---|---|---|---|---|---|
| EP-56 | POST | `/webhooks/asaas` | Asaas | evento | `{ received: true }` | 401 |
| EP-57 | GET | `/health` | público | — | `{ status, db }` | 503 |

### 13.9 Mapeamento de eventos do Asaas

| Evento | Situação da cobrança | Observação |
|---|---|---|
| `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` | `PAID` | dispara notificação |
| `PAYMENT_OVERDUE` | `OVERDUE` | — |
| `PAYMENT_DELETED`, `PAYMENT_CANCELED` | `CANCELED` | não se aplica a paga |
| `PAYMENT_REFUNDED` | `REFUNDED` | confirma o estorno |
| `PAYMENT_CHARGEBACK_REQUESTED` | `PAID` + alerta | estorno não automático |
| outro | sem mudança | registrar como ignorado |

Fatos operacionais a tratar: entrega "pelo menos uma vez"; a fila do Asaas pausa após 15 falhas seguidas e descarta eventos parados há mais de 14 dias — daí a rotina diária de conciliação (FR-024).

### 13.10 Modelos de mensagem de WhatsApp

Lista fechada, pendente de confirmação (Q-08):

| Código | Quando | Variáveis |
|---|---|---|
| `PAYMENT_CONFIRMED` | pagamento confirmado | `{{nome}}`, `{{valor}}`, `{{plano}}` |
| `CHARGE_DUE_SOON` | 3 dias antes do vencimento | `{{nome}}`, `{{valor}}`, `{{vencimento}}` |
| `CHARGE_OVERDUE` | cobrança vencida | `{{nome}}`, `{{valor}}`, `{{vencimento}}` |
| `LESSON_SCHEDULED` | aula agendada | `{{nome}}`, `{{data}}`, `{{hora}}` |
| `LESSON_REMINDER` | véspera da aula | `{{nome}}`, `{{data}}`, `{{hora}}` |
| `LESSON_CANCELED` | aula cancelada ou remarcada | `{{nome}}`, `{{data}}`, `{{hora}}` |

---

## 14. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| NFR-001 | LCP no celular | até 2,5 s |
| NFR-002 | INP no celular | até 200 ms |
| NFR-003 | CLS | até 0,1 |
| NFR-004 | Lighthouse mobile na landing | ≥ 90 em desempenho, acessibilidade, boas práticas e SEO |
| NFR-005 | Tempo de resposta da API | p95 ≤ 400 ms em leitura e ≤ 800 ms em escrita [A DEFINIR] (Q-26) |
| NFR-006 | Disponibilidade mensal | 99,5% [A DEFINIR] (Q-26) |
| NFR-007 | Navegadores | últimas 2 versões de Chrome, Edge, Firefox e Safari; iOS 16 ou superior |
| NFR-008 | Acessibilidade | WCAG 2.2 AA, conforme 11.4 |
| NFR-009 | `/health` | responde em até 1 s, 200 com banco ok, 503 caso contrário |
| NFR-010 | Backup do banco | diário; RPO 24 h; RTO 4 h [A DEFINIR] (Q-26); restauração testada antes da fase 7 |
| NFR-011 | Logs | JSON estruturado com `requestId`, sem dado pessoal, chave ou token |
| NFR-012 | Monitoramento de erros | ferramenta [A DEFINIR] (Q-26); alerta para erro 5xx e para falha de webhook |
| NFR-013 | Larguras suportadas | 360 a 1440 px, sem rolagem horizontal |
| NFR-014 | Imagens | WebP ou AVIF, versões por largura, `width` e `height` declarados |
| NFR-015 | Fontes | no máximo 2 famílias, hospedadas no próprio site, `font-display: swap` |
| NFR-016 | Divisão de código | área do aluno e admin em pacotes separados da landing |
| NFR-017 | Limite de requisições | login 5/min por IP e por e-mail; compra 10/min; formulários públicos 5/min; API autenticada 120/min |
| NFR-018 | Upload de imagem | até 5 MB, JPEG/PNG/WebP, tipo real validado |
| NFR-019 | Fuso de exibição | `America/Sao_Paulo` |
| NFR-020 | Tamanho do HTML inicial | até 200 KB comprimido [A DEFINIR] (Q-26) |
| NFR-021 | Autorização | toda rota valida perfil e dono do recurso no servidor |
| NFR-022 | Tempo de expiração de sessão | acesso 15 min; refresh 30 dias; inatividade [A DEFINIR] (Q-26) |
| NFR-023 | Validade do link de senha | 24 h para primeiro acesso e para redefinição gerada pelo admin (BR-027) |
| NFR-024 | Idioma | interface em pt-BR; código e identificadores em inglês |

---

## 15. Segurança e LGPD

### 15.1 Autenticação e autorização

- Autenticação no NestJS, com o Supabase apenas como banco (D-02, **aprovada pelo dono em 2026-11-10**). Supabase Auth está descartado como alternativa.
- Sessão em cookie `httpOnly`, `Secure`, `SameSite` com proteção contra CSRF; token de acesso curto com renovação e rotação.
- Senha com Argon2id.
- Limite de tentativas e bloqueio temporário (NFR-017).
- Redefinição de senha exclusivamente pelo admin, por link de uso único de 24 h (BR-027). Não há autoatendimento nem e-mail de recuperação.
- Fluxo de primeiro acesso obrigatório para conta criada por admin.
- Perfis `ADMIN`, `INSTRUCTOR` e `STUDENT`; toda rota valida perfil e dono (NFR-021), e o instrutor só alcança as aulas que ministra (BR-026).
- Primeiro admin criado por comando de seed documentado, com senha definida no primeiro acesso e nunca em texto no repositório.

### 15.2 Dados pessoais

| Dado | Finalidade | Base legal | Guarda |
|---|---|---|---|
| Nome, CPF, e-mail, celular | identificação, contrato e cobrança | execução de contrato | [A DEFINIR] (Q-25) |
| Endereço | emissão de cobrança e contato | execução de contrato | [A DEFINIR] (Q-25) |
| Dados de aulas e presença | prestação do serviço e progresso | execução de contrato | [A DEFINIR] (Q-25) |
| Registro de pagamento | obrigação fiscal e financeira | obrigação legal | [A DEFINIR] (Q-25) |
| IP e user-agent | segurança e prova de consentimento | legítimo interesse | [A DEFINIR] (Q-25) |
| Imagem e depoimento | prova social | consentimento | até revogação |
| Consentimento de WhatsApp | envio de notificações | consentimento | até revogação |

Coletar apenas o necessário (Q-11). Páginas de política de privacidade e termos de uso obrigatórias. Aviso de cookies apenas se houver analytics ou pixel (Q-16). Caminho para o titular pedir cópia ou exclusão: [A DEFINIR] (Q-25). Registro de auditoria das ações do admin, em especial alteração de valor e emissão, cancelamento e estorno de cobrança.

### 15.3 Controles técnicos

- HTTPS obrigatório; cabeçalhos de segurança (`HSTS`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`).
- Validação de toda entrada no servidor.
- RLS ativada em todas as tabelas do Supabase, sem política pública, ou API REST automática desativada (D-07).
- Segredos apenas em variáveis de ambiente; `.env.example` sem valores (I-13).
- Logs sem dado pessoal, chave ou token.
- Upload com validação de tipo real e tamanho (NFR-018).

---

## 16. Infraestrutura e ambientes

### 16.1 Onde cada componente roda

| Componente | Onde roda | Observação |
|---|---|---|
| Frontend (Vite) | **Cloudflare Workers com static assets** | estático, com pré-renderização das rotas públicas; configuração no `wrangler.jsonc` (D-17) |
| API NestJS | **Railway**, como serviço Node/Docker | Cloudflare Pages não executa servidor Node dedicado (D-01 aprovada, Q-13) |
| PostgreSQL | Supabase | pooler para a aplicação, conexão direta para migrations |
| Redis | **Railway** | filas, limite de requisições, cache opcional (D-05, Q-13) |
| Evolution API | **Railway**, em container próprio | modo de conexão em Q-12 (Cloud API) |
| Imagens | Supabase Storage | bucket público para conteúdo do site |

### 16.2 Ambientes

| Item | Local | Homologação | Produção |
|---|---|---|---|
| Frontend | `localhost:5173` | domínio de homologação [A DEFINIR] (Q-27) | domínio oficial [A DEFINIR] (Q-27) |
| API | `localhost:3000` | API de homologação [A DEFINIR] (Q-27) | API de produção [A DEFINIR] (Q-27) |
| Banco | PostgreSQL 16 instalado na máquina (sem Docker) | projeto Supabase de homologação [A DEFINIR] (Q-27) | projeto Supabase de produção [A DEFINIR] (Q-27) |
| Asaas | sandbox | sandbox | produção |
| WhatsApp | envio simulado | envio simulado | Evolution API |
| Dados | exemplo, descartáveis | exemplo controlado | reais |

### 16.3 Variáveis de ambiente

| Nome | Finalidade | Quem usa |
|---|---|---|
| `NODE_ENV` | ambiente de execução | API |
| `PORT` | porta da API | API |
| `DATABASE_URL` | conexão com pooler | API |
| `DIRECT_URL` | conexão direta para migrations | Prisma |
| `REDIS_URL` | conexão com Redis | API e workers |
| `JWT_SECRET` | assinatura de token | API |
| `COOKIE_DOMAIN` | domínio do cookie de sessão | API |
| `CORS_ORIGINS` | origens permitidas | API |
| `APP_PUBLIC_URL` | URL do site | API |
| `ASAAS_BASE_URL` | URL do Asaas por ambiente | API |
| `ASAAS_API_KEY` | chave da API do Asaas | API |
| `ASAAS_WEBHOOK_TOKEN` | validação do webhook | API |
| `EVOLUTION_BASE_URL` | URL da Evolution API | workers |
| `EVOLUTION_API_KEY` | chave da Evolution API | workers |
| `SUPABASE_URL` | URL do projeto | API |
| `SUPABASE_SERVICE_ROLE_KEY` | upload no Storage | API |
| `SUPABASE_BUCKET` | bucket de mídia | API |
| `VITE_API_URL` | URL da API no bundle | frontend |

### 16.4 Deploy e rollback

- Frontend: build `pnpm --filter @destak/web build`; deploy do Worker com static assets a partir de `apps/web/dist`; fallback de SPA pelo `not_found_handling` do `wrangler.jsonc`; rollback por redeploy de versão anterior.
- API: container versionado; migrations em etapa separada, antes da subida; rollback pela versão anterior da imagem.
- Migrations aditivas e compatíveis com a versão anterior, para permitir rollback de código sem rollback de dados.
- Janela de deploy sem derrubar sessão em andamento.
- Checklist de deploy: variáveis conferidas, migration aplicada, `/health` respondendo, smoke test de login e de listagem de planos.

### 16.5 Backup e restauração

Backup diário do banco (NFR-010), retenção [A DEFINIR] (Q-25), restauração testada antes da fase 7. Backup das imagens do Storage conforme política do Supabase. Infraestrutura de API, Redis e Evolution API na Railway (Q-13), com variáveis por ambiente e rollback por versão anterior da imagem.

---

## 17. Testes e definição de pronto

### 17.1 Testes obrigatórios

| Tipo | Ferramenta | Cobre |
|---|---|---|
| Unitário | Vitest (front), Jest (API) | BR-002, BR-008, BR-009, BR-014, BR-019, BR-022, BR-028, BR-029, cálculo de progresso |
| Integração | Supertest + Postgres de teste | todos os endpoints críticos; aluno A não acessa dado do aluno B; instrutor A não acessa aula do instrutor B |
| Componente | Testing Library | carrossel, checkout, formulários, tabelas |
| Ponta a ponta | Playwright | compra no sandbox; login e consulta de aulas e pagamentos; alteração de valor refletida na landing; estorno dentro e fora do prazo de 7 dias |
| Webhook | teste dedicado | evento repetido, token inválido, evento fora de ordem, cobrança desconhecida |
| Acessibilidade | axe automatizado + revisão manual | 11.4 |
| Contraste | verificação de tokens | 11.4 |

### 17.2 Definição de pronto

Um requisito só é considerado pronto quando:

- todos os critérios de aceite do FR- estão validados;
- lint, typecheck, testes e build passam na integração contínua;
- telas conferidas em 360, 768 e 1280 px, sem rolagem horizontal;
- navegação por teclado funciona em todos os controles;
- nenhum segredo no código e `.env.example` atualizado;
- spec e `decisions.md` atualizados;
- dados de exemplo removidos ou marcados.

---

## 18. Fases de entrega

| Fase | Conteúdo | Entregável | Critério de saída | Depende do dono |
|---|---|---|---|---|
| 0 | Fundação | monorepo, lint, typecheck, testes, build, ambiente local, projeto Railway criado, tokens do `design.md` aplicados | pipeline verde e tema aplicado | `design.md` completo (Q-17) |
| 1 | Landing com conteúdo fixo | seções da 11.1, botão de WhatsApp, pré-renderização, metadados | Lighthouse ≥ 90, conteúdo revisado | logo, fotos, textos, valores, telefone, endereço |
| 2 | API, autenticação e conteúdo | login nos três perfis, CRUD de planos, instrutores e conteúdo; landing passa a ler do backend | alterar valor no admin reflete na landing | credenciais de banco e domínio (Q-27) |
| 3 | Alunos, matrículas e aulas | cadastro, matrícula, agenda, presença, área do instrutor com análise; área do aluno | aluno vê aulas; instrutor registra análise | conteúdo real de aulas (Q-05) |
| 4 | Pagamentos | checkout, Asaas, boleto, parcelamento, taxa absorvida, cancelamento e estorno com retenção | compra no sandbox confirmada por webhook; estorno nos dois prazos | conta Asaas (Q-15) |
| 5 | Notificações | Evolution API na Railway, fila, registro e reenvio | mensagem de teste entregue | número no modo Cloud API (Q-12) |
| 6 | Progresso | gráfico e relatório por aluno e por dia da semana | números batem com as aulas | — |
| 7 | Segurança, LGPD, desempenho e produção | revisão de segurança, políticas, backup testado, ponta a ponta, go-live | checklist de deploy completo | textos legais e contato de privacidade (Q-25) |

---

## 19. Riscos

| Risco | Impacto | Medida que reduz |
|---|---|---|
| Banimento do número no modo QR Code (conexão não oficial, que contraria os termos do WhatsApp) | perda do canal de notificação e do número usado | número **exclusivo**, nunca o principal (BR-031); volume baixo, sem disparo em massa; monitorar conexão e alertar no painel; o registro de pagamento continua no painel mesmo sem WhatsApp; plano de migração para Cloud API (D-16) |
| Fila de webhooks do Asaas pausada após 15 falhas | pagamentos sem baixa automática | alerta de falha, resposta rápida 200, processamento em fila e conciliação diária |
| Nova mudança nas regras da CNH | plano e progresso desalinhados | nenhuma carga legal fixa no código; plano e progresso configuráveis (BR-010) |
| Atraso na entrega de conteúdo pelo dono | fase 1 travada | marcadores de exemplo e lista de pendências por fase (18) |
| Custo mensal de hospedagem acima do previsto | inviabilidade | orçamento definido em Q-13 e dimensionamento por ambiente |
| Vazamento de dado pessoal | dano ao titular e sanção | RLS, mínimo de dados, logs sem PII, auditoria, revisão de segurança na fase 7 |
| Fraude ou contestação de pagamento | prejuízo financeiro | confirmação só por webhook, trilha de auditoria, conciliação diária |
| Indisponibilidade do Supabase ou da API | site fora do ar | landing estática em CDN, `/health` monitorado, alerta e rollback rápido |
| Perda de dados sem backup testado | perda de histórico financeiro | backup diário e restauração testada (NFR-010) |
| Documento desatualizado após mudança | implementação divergente | I-17: spec e `decisions.md` na mesma etapa |

### 19.1 Limites conhecidos

- A landing é SPA; sem pré-renderização, buscadores e prévias de link ficam prejudicados — resolvido por FR-026.
- Nenhuma integração com DETRAN; o processo externo é manual.
- Envio de WhatsApp depende de serviço externo e de número ativo.

### 19.2 Contexto regulatório

Desde 09/12/2025 (Resolução Contran nº 1.020/2025), a autoescola deixou de ser obrigatória para obter a CNH: o curso teórico pode ser feito gratuitamente no aplicativo CNH do Brasil, sem carga mínima, e o mínimo de aula prática caiu para 2 horas. Consequências para esta spec:

- nenhuma carga horária legal fixa no código;
- plano é pacote configurável pelo admin (categoria, quantidade de aulas, itens inclusos, valor);
- o progresso do aluno é medido contra o que ele contratou (BR-010);
- quais serviços a autoescola vende hoje depende de Q-09.

A implementação deve conferir a norma vigente antes de exibir qualquer exigência legal no site.

---

## 20. Perguntas em aberto e decisões

### 20.1 Produto — respondidas

| ID | Pergunta | Resposta | Efeito na spec |
|---|---|---|---|
| Q-01 | Quem cria a conta do aluno? | os dois caminhos: o visitante cria ao comprar e o admin cadastra no balcão | FR-005, FR-008, FR-015 |
| Q-02 | O que só o admin faz nas cobranças? | compra gera a cobrança; só o admin emite boleto avulso e parcelamento, cancela e estorna | BR-004, BR-006, FR-018, FR-019 |
| Q-03 | Meios de pagamento, parcelas e juros | Pix, boleto e cartão. Todas as taxas ficam com a autoescola: o preço cadastrado é **líquido** e o cliente paga exatamente esse valor. Parcelamento até o máximo do plano, com juros por conta da escola | BR-028, BR-029, BR-030, FR-005, `Charge.feeCents/netCents` |
| Q-04 | Quem agenda e registra presença; instrutor tem login? | o admin agenda e registra; **o instrutor tem login** e registra a análise de cada aula de cada aluno | FR-017, FR-027, §7.1, §7.2, `Instructor.userId`, `Lesson.analysis` |
| Q-05 | De onde vem "quanto estudou por dia da semana"? | aulas com presença registrada | FR-020, BR-010 |
| Q-06 | O que o admin edita no site? | lista fechada de blocos, carrosséis, perguntas e contato | FR-021, FR-022 |
| Q-07 | Quantos carrosséis | dois: depoimentos e fotos de aprovados | FR-002, `CarouselItem` |
| Q-08 | Mensagens automáticas | as seis da §13.10 | FR-025 |
| Q-09 | Quais serviços e categorias a escola vende | **cadastrados pelo admin**, sem lista fixa | FR-003, FR-016, `Plan.category` livre |
| Q-10 | Política de cancelamento e reembolso | até 7 dias, reembolso integral; depois, retenção de 10% | BR-009, FR-019, FL-16 |
| Q-11 | Dados do cadastro | nome, CPF, celular com WhatsApp e e-mail | FR-005, FR-015 |
| Q-20 | Dados institucionais | **editáveis pelo admin em campo de texto** (razão social, CNPJ, credenciamento, contato) | FR-022, `SiteSetting.contact.*` e `institution.*` |
| Q-22 | Mais de uma matrícula ativa? | uma ativa por categoria | BR-025 |

### 20.2 Técnicas

| ID | Pergunta | Resposta | Situação |
|---|---|---|---|
| Q-12 | Evolution API: modo e número | **modo QR Code** (conexão não oficial), hospedada na Railway, com **número exclusivo** para notificações | Respondida |
| Q-13 | Onde rodam API, Redis e Evolution; orçamento | **Railway** para os três. Orçamento mensal não informado | Respondida |
| Q-14 | Recuperação de senha | **somente o admin troca a senha** dos usuários; não há autoatendimento | Respondida |
| Q-15 | Contas Asaas e notificações dele | as contas existem; **sem notificações do Asaas ligadas** | Respondida |
| Q-21 | Contexto de uso da §3.3 | confirmado | Respondida |
| Q-23 | Exportação de relatório | não nesta versão | Respondida |
| Q-26 | Metas de desempenho e disponibilidade | as da tabela NFR | Respondida |
| Q-27 | Domínios e URLs | domínio oficial em produção e subdomínio em homologação; dois projetos Supabase | Respondida |
| **Q-25** | Prazo de guarda de dados, contato de privacidade e retenção de backup | **sem resposta** | **Aberta e bloqueadora da fase 7** |

### 20.3 Visuais

| ID | Pergunta | Resposta | Situação |
|---|---|---|---|
| Q-18 | Formato do mockup e aprovador | formato da §11.6; aprovação do dono registrada em `decisions.md` | Respondida |
| Q-19 | Tema | só claro | Respondida |
| Q-24 | Ordem das seções da landing | a da §11.1 | Respondida |
| **Q-17** | `design.md` completo, com logo, fotos e textos reais | o `design.md` existe no repositório como referência de estilo; **logo, fotos, textos e aprovação de marca continuam pendentes** | **Aberta e bloqueadora das fases 0 e 1** |

### 20.4 Não bloqueadoras

| ID | Pergunta | Situação |
|---|---|---|
| Q-16 | Google Analytics ou Meta Pixel? | sem resposta; fica em Futuro. Se entrar, exige aviso de cookies e três eventos medidos |

**Resumo:** 24 perguntas respondidas e 2 em aberto (Q-17 e Q-25), mais a não bloqueante Q-16.

### 20.5 Decisões técnicas

`Pendente` = aguarda aprovação do dono; `Aprovada` = regra vigente, registrada em `decisions.md`.

| ID | Decisão | Situação | Motivo | Alternativa | Impacto |
|---|---|---|---|---|---|
| D-01 | API em serviço Node/Docker na Railway, fora do Cloudflare | **Aprovada em 2026-11-10** (Q-13) | o Cloudflare serve estático, não mantém NestJS | Workers com outro framework (muda a stack) | seção 16 |
| D-02 | Autenticação no NestJS; Supabase só como banco | **Aprovada em 2026-11-10** | controle de sessão, autorização e auditoria no mesmo lugar | Supabase Auth (descartada) | seção 15 |
| D-03 | Sessão em cookie + token curto com rotação; Argon2id | Pendente | reduz risco de XSS e de senha vazada | JWT em `localStorage` | FR-007 |
| D-04 | Zod compartilhado, React Hook Form e TanStack Query | **Aprovada em 2026-11-10** | validação única e cache de servidor | formulários manuais | FR-005 |
| D-05 | BullMQ sobre Redis para webhook e notificação | Pendente | desacopla e permite nova tentativa | processamento síncrono | FR-024, FR-025 |
| D-06 | Pré-renderização das rotas públicas no build | Pendente | SPA pura prejudica busca e prévia de link | SSR completo | FR-026 |
| D-07 | RLS ativa sem política pública, ou API REST do Supabase desligada | Pendente | evita acesso direto ao banco pelo navegador | expor RLS com políticas | seção 15.3 |
| D-08 | `DATABASE_URL` com pooler e `DIRECT_URL` para migrations | Pendente | evita esgotar conexões | conexão direta única | seção 16 |
| D-09 | Imagens no Supabase Storage | Pendente | sem disco local em produção | Cloudflare R2 | FR-021 |
| D-10 | Provedor de e-mail transacional | **Dispensada** (Q-14, BR-027) | não há e-mail de recuperação: só o admin redefine senha | — | FR-009 |
| D-11 | `/api/v1` + OpenAPI gerado pelo NestJS | **Aprovada em 2026-11-10** | contrato vivo e versionamento | documentação manual | seção 13 |
| D-12 | Redis com papel definido: filas, limite e cache opcional | Pendente | justifica o componente | remover Redis | seção 16 |
| D-13 | Vitest, Testing Library, Supertest e Playwright com CI | **Aprovada em 2026-11-10** | garante a definição de pronto | testes manuais | seção 17 |
| D-14 | Monitoramento de erros com ferramenta externa | Pendente | detectar falha antes do aluno | só logs | NFR-012 |
| D-15 | `America/Sao_Paulo` na exibição, UTC no banco | Pendente | evita erro de horário de aula | UTC na tela | BR-015 |
| D-16 | Evolution API no modo QR Code (conexão não oficial), com número exclusivo e monitoramento | **Aprovada em 2026-11-10** (Q-12) | custo baixo e sem verificação de conta comercial | Cloud API oficial, que exige conta verificada e modelos aprovados | FR-025, BR-031, §19 |
| D-17 | Frontend em **Cloudflare Worker com static assets**, em vez de Pages | **Aprovada em 2026-11-10** | o projeto foi criado como Worker, que é para onde o Pages está migrando; para uma SPA estática o resultado é equivalente | Pages, com fallback via `_redirects` | §16.1, §16.4, FR-026 |

Com D-01 e D-02 aprovadas, a API roda na Railway e concentra cadastro, sessão, autorização por perfil e por dono e auditoria; o Supabase não emite token, não guarda sessão e não autentica ninguém, e sua chave de serviço só é usada para armazenamento de imagens. D-10 fica dispensada porque não existe e-mail de recuperação.

---

## 21. Histórico de mudanças

| Versão | Data | Mudança |
|---|---|---|
| 0.1.0 | — | Rascunho derivado de template genérico, com fluxos, requisitos e entidade de exemplo alheios ao produto. Sem valor de implementação. |
| 0.2.0 | 2026-11-10 | Reescrita completa para o produto real: 26 requisitos funcionais, 25 regras de negócio, 28 telas, 57 endpoints, 18 entidades; fluxos com alternativos; glossário; seções de segurança, LGPD, infraestrutura, testes, fases, riscos e perguntas em aberto; correção de contradições de escopo (notificações e área administrativa dentro, aplicativo nativo fora); definição do processo de mockup; arquivos de referência com regra de ausência; ordem de prioridade preservada (4.2, antes 3.1); regras de interface (11.2, antes 8.2) e acessibilidade (11.4, antes 8.4) mantidas e ampliadas. |
| 0.2.1 | 2026-11-10 | D-02 aprovada pelo dono: autenticação no NestJS, Supabase apenas como banco; Supabase Auth descartada. Seção 20.5 ganhou coluna de situação e nota sobre a divisão de responsabilidades. |
| 0.3.0 | 2026-11-10 | Respostas do dono aplicadas: taxas absorvidas pela escola com preço líquido (BR-028 a BR-030); serviços e categorias cadastrados pelo admin (Q-09); reembolso integral em 7 dias e retenção de 10% depois (BR-009, FR-019, FL-16); instrutor com login e análise por aula (FR-027, UI-029, EP-59, EP-60, `Instructor.userId`, `Lesson.analysis`); redefinição de senha só pelo admin, com remoção do autoatendimento e de D-10 (BR-027, FR-009, EP-58); dados institucionais em campo de texto (Q-20); Railway para API, Redis e Evolution (D-01 aprovada). 23 perguntas respondidas, 1 em parte e 2 abertas. |
| 0.3.1 | 2026-11-10 | Q-03 confirmada: taxa absorvida pela escola como regra fixa, alternativa de repasse descartada. Q-12 respondida: Evolution API no modo **QR Code** (não oficial), com número exclusivo obrigatório (BR-031), situação da conexão no painel (EP-61) e alerta de queda; risco de banimento promovido e mitigado na §19; D-16 aprovada. |
| 0.3.2 | 2026-11-10 | D-04, D-11 e D-13 aprovadas para destravar a fase 0. Implementação da fundação criada: monorepo pnpm, `packages/shared` com Zod, API NestJS com `/health` fora do prefixo `/api/v1`, web com tokens do `design.md`, Dockerfile de deploy, CI e configuração da Railway. |
| 0.3.3 | 2026-11-10 | Ambiente de desenvolvimento sem Docker: PostgreSQL 16 nativo na máquina (§16.2) e Redis fora até a fase 5. O Dockerfile é mantido exclusivamente como artefato de deploy (D-01, H-21). |
| 0.3.4 | 2026-11-10 | Hospedagem do frontend trocada de Cloudflare Pages para **Cloudflare Workers com static assets** (§1.1, §16.1, §16.4), com fallback de SPA pelo `wrangler.jsonc`. D-17 aprovada. |
