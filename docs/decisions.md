# decisions.md — Autoescola Destak

Registro de decisões, premissas e histórico. Alinhado à **spec 0.3.0**.
Ordem de prioridade em conflito: `spec.md` §4.2.

| Campo | Valor |
|---|---|
| Versão | 1.4.0 |
| Data | 2026-11-10 |
| Referência | `docs/spec.md` 0.3.4 |
| Aprovador | dono da Autoescola Destak |

## Como este arquivo se organiza

| Série | Significado | Onde vive |
|---|---|---|
| `D-xx` | decisão técnica | tabela na §20.5 da spec; aqui fica a situação |
| `P-xx` | premissa adotada por recomendação | seção 3, com a pergunta de origem e a situação |
| `H-xx` | registro histórico do ciclo 0.1.0 | seção 4 |

Regras de manutenção: toda premissa aponta para uma pergunta; decisão aprovada vira regra na spec e ganha data aqui; item histórico não é apagado, ganha situação; mudança de comportamento atualiza spec e este arquivo na mesma etapa (I-17).

---

## 1. Respostas do dono em 2026-11-10

Estas deixaram de ser premissa e passaram a regra na spec.

| Pergunta | Resposta | Virou |
|---|---|---|
| Q-01 | a conta do aluno nasce ao comprar no site e também por cadastro do admin | FR-005, FR-008, FR-015 |
| Q-02 | a compra gera a cobrança; só o admin emite boleto avulso e parcelamento, cancela e estorna | BR-004, BR-006, FR-018, FR-019 |
| Q-03 | Pix, boleto e cartão; as taxas ficam com a autoescola, o preço cadastrado é **líquido** e o cliente paga exatamente esse valor; juros do parcelamento por conta da escola | BR-028, BR-029, BR-030 |
| Q-04 | o admin agenda e registra presença; **o instrutor tem login** e registra a análise de cada aula de cada aluno | FR-027, §7.1, §7.2, UI-029 |
| Q-05 | o estudo por dia da semana vem das aulas com presença registrada | FR-020, BR-010 |
| Q-06 | o admin edita uma lista fechada de conteúdo | FR-021, FR-022 |
| Q-07 | dois carrosséis: depoimentos e fotos de aprovados | FR-002 |
| Q-08 | as seis mensagens automáticas da §13.10 | FR-025 |
| Q-09 | serviços e categorias são **cadastrados pelo admin**, sem lista fixa | FR-003, FR-016 |
| Q-10 | cancelamento até 7 dias com reembolso integral; depois, retenção de 10% | BR-009, FR-019, FL-16 |
| Q-11 | cadastro pede nome, CPF, celular com WhatsApp e e-mail | FR-005, FR-015 |
| Q-12 | Evolution API hospedada na **Railway**, no **modo QR Code** (conexão não oficial), com número exclusivo | §16.1, BR-031, D-16 |
| Q-13 | **Railway** para API, Redis e Evolution | §16, D-01 |
| Q-14 | **somente o admin troca a senha** dos usuários; sem autoatendimento | BR-027, FR-009, EP-58 |
| Q-15 | as contas Asaas existem; **sem notificações do Asaas** ligadas | FR-024 |
| Q-18 | o formato de mockup da §11.6, com aprovação do dono registrada | §11.6, P-13 |
| Q-19 | tema claro | §11.2, P-14 |
| Q-20 | dados institucionais editáveis pelo admin em campo de texto | FR-022, `SiteSetting.institution.*` |
| Q-21 | contexto de uso da §3.3 confirmado | §3.3, P-15 |
| Q-22 | uma matrícula ativa por categoria | BR-025 |
| Q-23 | sem exportação nesta versão | P-17 |
| Q-24 | ordem de seções da §11.1 confirmada | FR-001, P-18 |
| Q-26 | metas de desempenho da tabela NFR | P-19 |
| Q-27 | domínio oficial em produção, subdomínio em homologação, dois projetos Supabase | P-20 |

**Em aberto:** Q-17 (`design.md` completo, com logo, fotos e textos reais) e Q-25 (guarda de dados, contato de privacidade e retenção de backup). Q-16 (analytics) segue sem resposta e não bloqueia.

---

## 2. Decisões técnicas (série D)

| ID | Decisão | Situação | Data | Observação |
|---|---|---|---|---|
| D-01 | API Node/Docker na Railway, fora do Cloudflare Pages | **Aprovada** | 2026-11-10 | Q-13. Redis e Evolution API também na Railway |
| D-02 | Autenticação no NestJS; Supabase apenas como banco | **Aprovada** | 2026-11-10 | Supabase Auth descartado |
| D-03 | Sessão em cookie `httpOnly` + token curto com rotação; Argon2id | Pendente | — | Alternativa: JWT em `localStorage` |
| D-04 | Zod compartilhado, React Hook Form e TanStack Query | **Aprovada** | 2026-11-10 | Base de `packages/shared` e das dependências do web |
| D-05 | BullMQ sobre Redis para webhook e notificação | Pendente | — | Alternativa: processamento síncrono |
| D-06 | Pré-renderização das rotas públicas no build | Pendente | — | Substitui H-16 |
| D-07 | RLS sem política pública, ou API REST do Supabase desligada | Pendente | — | Alternativa: expor RLS com políticas |
| D-08 | `DATABASE_URL` com pooler e `DIRECT_URL` para migrations | Pendente | — | Absorve H-24 |
| D-09 | Imagens no Supabase Storage | Pendente | — | Absorve H-08 |
| D-10 | Provedor de e-mail transacional | **Dispensada** | 2026-11-10 | Q-14: não existe e-mail de recuperação; `SMTP_*` sai da tabela de variáveis |
| D-11 | `/api/v1` + OpenAPI gerado pelo NestJS | **Aprovada** | 2026-11-10 | Prefixo global já aplicado no `main.ts`, com `/health` excluído |
| D-12 | Redis com papel definido: filas, limite e cache opcional | Pendente | — | Alternativa: remover Redis |
| D-13 | Vitest, Testing Library, Supertest e Playwright com CI | **Aprovada** | 2026-11-10 | Já refletida nos scripts e no workflow `ci.yml` |
| D-14 | Monitoramento de erros com ferramenta externa | Pendente | — | Ferramenta a definir (Q-26) |
| D-15 | `America/Sao_Paulo` na exibição, UTC no banco | Pendente | — | Alternativa: UTC na tela |
| D-16 | Evolution API no modo QR Code (não oficial), com número exclusivo e monitoramento | **Aprovada** | 2026-11-10 | Q-12. Risco aceito: banimento do número. Mitigação: número exclusivo (BR-031), volume baixo, alerta de conexão (EP-61) e caminho de migração para Cloud API |
| D-17 | Frontend em Cloudflare Worker com static assets, em vez de Pages | **Aprovada** | 2026-11-10 | O projeto foi criado como Worker no painel do Cloudflare, que é para onde o Pages está migrando. Para uma SPA estática o resultado é equivalente: mesma entrega de arquivos, mesmo cache de borda. Motivo operacional: o deploy por `wrangler deploy` já existe e o fallback de SPA fica no `not_found_handling` do `wrangler.jsonc`, em vez de depender de `_redirects`. Alternativa mantida em `apps/web/public/_redirects` caso se volte para Pages |

**Nota de ambiente (2026-11-10):** o banco de desenvolvimento passou a ser o **PostgreSQL 16 nativo** na máquina, sem Docker, e o Redis saiu do ambiente até a fase 5, porque nada o consome antes das filas de notificação. O Dockerfile da API **permanece**: ele é o artefato de deploy da Railway e da futura VPS (D-01, H-21). Docker para desenvolvimento e Docker para deploy são decisões separadas — a primeira caiu, a segunda ficou.

---

## 3. Premissas (série P)

| ID | Premissa | Pergunta | Situação |
|---|---|---|---|
| P-01 | compra gera cobrança; só admin emite, cancela e estorna | Q-02 | Convertida em regra (BR-004, BR-006) |
| P-02 | conta do aluno por dois caminhos | Q-01 | Convertida em regra (FR-005, FR-015) |
| P-03 | admin agenda e registra; instrutor sem login | Q-04 | **Superada**: o instrutor tem login e registra análise (FR-027) |
| P-04 | estudo vem de aulas com presença | Q-05 | Convertida em regra (FR-020) |
| P-05 | lista fechada de conteúdo editável | Q-06 | Convertida em regra (FR-021) |
| P-06 | dois carrosséis | Q-07 | Convertida em regra (FR-002) |
| P-07 | seis mensagens automáticas | Q-08 | Convertida em regra (FR-025) |
| P-08 | cadastro com nome, CPF, celular e e-mail | Q-11 | Convertida em regra (FR-005) |
| P-09 | Evolution API em modo Cloud API oficial | Q-12 | **Superada**: o dono escolheu o modo QR Code, com número exclusivo obrigatório (D-16, BR-031) |
| P-10 | API, Redis e Evolution no mesmo servidor | Q-13 | Convertida em regra (Railway, D-01) |
| P-11 | recuperação de senha por e-mail | Q-14 | **Superada**: só o admin redefine senha (BR-027) |
| P-12 | notificações do Asaas definidas canal por canal | Q-15 | Convertida em regra: nenhuma notificação do Asaas ligada |
| P-13 | mockup no formato da §11.6 | Q-18 | Convertida em regra |
| P-14 | tema claro | Q-19 | Convertida em regra |
| P-15 | contexto de uso da §3.3 | Q-21 | Convertida em regra |
| P-16 | uma matrícula ativa por categoria | Q-22 | Convertida em regra (BR-025) |
| P-17 | sem exportação de relatório | Q-23 | Convertida em regra |
| P-18 | ordem de seções da §11.1 | Q-24 | Convertida em regra |
| P-19 | metas de desempenho e disponibilidade | Q-26 | Convertida em regra (NFR) |
| P-20 | domínio oficial + subdomínio; dois Supabase | Q-27 | Convertida em regra (§16.2) |

---

## 4. Registro histórico do ciclo 0.1.0 (série H)

| ID | Origem (0.1.0) | Situação | Onde vive agora / motivo |
|---|---|---|---|
| H-01 | Escopo em fatias | Substituída | §18 (oito fases com critério de saída) |
| H-02 | Landing como prioridade comercial | Incorporada | §18, fase 1 |
| H-03 | Conteúdo provisório marcado como exemplo | Incorporada | I-16, FR-021 |
| H-04 | Aluno não se cadastra sozinho; só lead | Superada | resposta de Q-01: dois caminhos |
| H-05 | Selo de menor preço sem comparativo | Descartada | alegação comercial sem comprovação; fora do escopo |
| H-06 | Foto de aluno no carrossel | Incorporada | P-06, BR-012 |
| H-07 | Dois projetos Supabase | Incorporada | P-20 |
| H-08 | Storage plugável | Substituída | D-09 (Supabase Storage) |
| H-09 | Sessão em Postgres, não em Redis | Substituída | D-03 + `Session`; Redis serve filas e limite |
| H-10 | Cartão tokenizado no navegador | Incorporada | FR-005, §11.7 |
| H-11 | Asaas como gateway único | Incorporada | §13, §13.9 |
| H-12 | Notificação não bloqueia a operação principal | Incorporada | FR-025, D-05 |
| H-13 | Boleto é prerrogativa do admin | Incorporada e confirmada | BR-004, Q-02 |
| H-14 | Foco visível em campos | Incorporada | §11.4 |
| H-15 | Marca d'água viária no fundo | Descartada | decisão visual fora do escopo; depende de Q-17 |
| H-16 | SPA sem SSR | Substituída | D-06, FR-026 |
| H-17 | Shell indisponível na sessão de trabalho | Registro operacional | não é decisão de produto |
| H-18 | Dinheiro em centavos | Incorporada | BR-014 |
| H-19 | Senha com hash e JWT de sessão | Incorporada | D-03 |
| H-20 | Backend na Railway | **Incorporada** | D-01 aprovada, Q-13 |
| H-21 | Artefato portátil, sem dependência de plataforma | Incorporada | D-01 |
| H-22 | Cookie de sessão exige domínio próprio | Incorporada | P-20, §15.1 |
| H-23 | Migrations rodam no deploy | Incorporada | I-15, §16.4 |
| H-24 | Pooler para a aplicação, conexão direta para migration | Incorporada | D-08 |
| H-25 | Ambientes isolados por branch | Incorporada | §16.2, P-20 |
| H-26 | Herói sem ocupar a dobra inteira | Incorporada | §11.7 |
| H-27 | Todo texto da landing vindo do banco | Incorporada | FR-021 |
| H-28 | Repasse de taxa ao cliente | **Superada** | Q-03: a escola absorve a taxa e o preço é líquido (BR-028) |
| H-29 | Aceite de termos com prova | Fora desta versão | avaliar com Q-25 |
| H-30 | Retenção no cancelamento | **Incorporada com 10%** | BR-009, Q-10, FL-16 |
| H-31 | Rodapé e contato editáveis | Incorporada | FR-022, Q-20 |

---

## 5. Log

| Data | Mudança |
|---|---|
| 2026-11-10 | Arquivo criado no ciclo 0.1.0 com 31 decisões (D-001 a D-031) do recorte da fatia 1. |
| 2026-11-10 | Reconciliado com a spec 0.2.1: séries D, P e H; D-02 aprovada. |
| 2026-11-10 | Reconciliação com a spec 0.3.0: 24 respostas do dono registradas; D-01 aprovada e D-10 dispensada; P-03 e P-11 superadas; P-09 vigente só quanto ao modo; H-04 e H-28 superadas; H-20 e H-30 incorporadas. Restam Q-17 e Q-25. |
| 2026-11-10 | Spec 0.3.1: Q-03 confirmada (taxa absorvida, sem repasse) e Q-12 respondida em modo QR Code; D-16 aprovada com risco aceito e número exclusivo obrigatório. Restam Q-17 e Q-25. |
| 2026-11-10 | Spec 0.3.4: D-17 aprovada — frontend em Cloudflare Worker com static assets. O build do Worker passou a usar `pnpm --filter @destak/web build` (antes rodava o build da raiz, que compilava a API sem necessidade). `_redirects` permanece como plano B para Pages. |
| 2026-11-10 | Spec 0.3.2: D-04, D-11 e D-13 aprovadas. Fase 0 implementada em arquivos (monorepo, shared, API com `/health`, web com tokens, Docker, CI, `railway.json`); validação depende de execução na máquina do dono, porque a sessão não tem terminal. |
| 2026-11-10 | Spec 0.3.3: ambiente local sem Docker — PostgreSQL 16 nativo, Redis adiado para a fase 5, Dockerfile mantido só para deploy. `docker-compose.yml` fica como comentário, sem serviços. |
