# SPEC — Autoescola Destak · Fatia 1: vitrine, acesso e checkout

## 0. Controle do documento

- Status: aprovado para planejamento
- Versão: 1.1.0 (revisão de conteúdo editável, taxas e reembolso)
- Data: 2026-11-10
- Autor: sessão de brainstorming (DeepSeek Harness)
- Responsável pela aprovação: Autoescola Destak
- Documento pai: `spec.md` (draft 0.1.0)
- Fonte visual: `DESIGN.md` (Hungry Tiger)
- Decisões e premissas: `decisions.md`

Este documento substitui, para a fatia 1, as seções genéricas do `spec.md`
(fluxos de "projeto", FR-001/FR-002, entidade `Project`). O `spec.md`
permanece como documento de origem e será reconciliado na fatia 2.

---

## 1. Ambiente e restrições conhecidas

| Item | Situação |
|---|---|
| Repositório | `C:\Users\djesus\Desktop\destak` |
| Shell / build / testes | **indisponível** no host desta sessão (sem `pwsh`, sem backend de sandbox). Nada pode ser executado aqui. |
| Consequência | implementação será escrita, mas `install`, `build`, `lint`, `test` e `git commit` precisam ser executados pelo responsável ou em ambiente com terminal funcional |
| Banco | Supabase em **dev** e em **prod**, projetos separados, via `DATABASE_URL` |
| Mídia | Supabase Storage em dev e em prod (buckets separados); disco local apenas na máquina do desenvolvedor |
| Pagamento | Asaas (Pix, boleto, crédito, débito) |
| Hospedagem do backend | **Railway**, container Docker, dois ambientes; migração futura para VPS (Hostinger) sem reescrita (§13) |
| Hospedagem do frontend | Cloudflare Pages |

O critério "validar antes de considerar pronto" (regra 11 do `spec.md`) só pode ser
cumprido quando o ambiente de execução existir. Nenhuma funcionalidade será
declarada pronta sem essa validação.

---

## 2. Contexto

A Destak vende CNH por atendimento humano. A landing não é catálogo: é o
primeiro atendente. Ela precisa responder, sem que o visitante pergunte:
quanto custa, é confiável, dá certo, e o que eu faço agora.

O objetivo comercial declarado pelo cliente é explícito: levar o aluno a
contratar a Destak para alcançar a CNH. Toda decisão de interface serve a isso.

### 2.1 Problema

- Visitante não encontra preço claro e vai embora.
- Prova social existe no WhatsApp e no Instagram, não no site.
- A autoescola não tem onde registrar pré-matrícula, cobrar e liberar acesso.

### 2.2 Objetivo da fatia 1

1. Publicar a landing que vende (planos, selo de preço, prova social, CTA).
2. Capturar pré-matrícula sem fricção.
3. Cobrar online (Pix, crédito, débito) e presencialmente (boleto/dinheiro via admin).
4. Avisar a autoescola no WhatsApp a cada pagamento confirmado.
5. Dar login ao aluno e ao admin, distinguidos por papel.
6. Deixar a autoescola editar sozinha todo texto da landing, o rodapé, as
   dúvidas, as taxas de parcelamento e a política de cancelamento — sem
   programador e sem deploy.

### 2.3 Fora do escopo da fatia 1

- Cronograma de aulas, presença, progresso por dia da semana (fatia 2/3).
- Boletos recorrentes e parcelamento de mensalidade.
- CRUD completo de conteúdo do site além de planos, prova social e configurações.
- Relatórios, exportação, gráficos do painel.
- Aplicativo mobile nativo.
- Integração Evolution API em produção (o adaptador existe; o envio real fica para a fatia 5).
- E-mail transacional em produção (o adaptador de e-mail fica preparado, envio real na fatia 5).

---

## 3. Personas e permissões

| Perfil | Descrição |
|---|---|
| Visitante | não autenticado; vê landing, planos, prova social, faz checkout |
| Aluno | autenticado, `role=ALUNO`; vê apenas os próprios dados |
| Administrador | autenticado, `role=ADMIN`; gerencia leads, pagamentos, planos, prova social e configurações |

| Ação | Visitante | Aluno | Admin |
|---|---:|---:|---:|
| Ver landing, planos, prova social | Sim | Sim | Sim |
| Criar pré-matrícula | Sim | Sim | Sim |
| Iniciar checkout | Sim | Sim | Sim |
| Ver o próprio pedido por `publicToken` | Sim | Sim | Sim |
| Ver `/minha-area` | Não | Sim | Sim |
| Ver qualquer dado de outro aluno | Não | Não | Sim |
| Gerar boleto | Não | Não | Sim |
| Marcar pagamento como recebido | Não | Não | Sim |
| Converter lead em aluno | Não | Não | Sim |
| Editar planos, prova social, configurações | Não | Não | Sim |

---

## 4. Fluxos

### 4.1 Visitante → pré-matrícula

1. Visitante escolhe um plano e clica em `QUERO ESSE PLANO`.
2. Sistema abre `/checkout/:plano` e carrega o resumo de valores do plano.
3. Visitante informa **nome completo (obrigatório)**, WhatsApp e e-mail (opcional).
4. Escolhe forma de pagamento: Pix, crédito (1x a 12x), débito, boleto (quando habilitado) ou "pagar na autoescola".
5. Sistema exibe o **detalhamento**: valor do plano, taxa da forma de pagamento (quando houver), valor total e valor de cada parcela.
6. Visitante marca o **consentimento obrigatório** ("li e aceito os termos de contratação e a política de cancelamento") — sem marcar, o botão permanece desabilitado.
7. Confirma.
8. Sistema valida, recalcula os valores no servidor, cria `Lead` e `Order` com *snapshot* dos valores e do consentimento, e retorna o pedido.
9. Pix: exibe QR e copia-e-cola. Cartão: tokeniza no browser e confirma. "Pagar na autoescola": exibe instrução e abre WhatsApp.
10. Sistema mostra `/pagamento/:publicToken` com status "aguardando confirmação".

Erro de validação: campo com erro inline, dados preservados, foco no primeiro campo inválido, nenhum pedido criado.

### 4.2 Asaas → pagamento confirmado

1. Asaas envia `POST /api/webhooks/asaas`.
2. API valida o token do header e grava `WebhookEvent` (chave única = id do evento).
3. Se o evento já foi processado, responde 200 sem efeito.
4. API atualiza `Order.status` para `PAGO` e grava `paidAt`.
5. API gera `Notification` para o WhatsApp configurado em `Settings`, com nome do comprador, plano, valor, forma e protocolo.
6. `WhatsAppPort` envia; falha não desfaz o pagamento, apenas marca `Notification.status = FALHOU` com o motivo.
7. `/pagamento/:publicToken` passa a exibir "pagamento confirmado — estamos liberando seu acesso".

### 4.3 Admin → liberar acesso

1. Admin entra em `/entrar` e cai em `/admin/leads`.
2. Vê a fila com filtro por status.
3. Clica em `LIBERAR ACESSO` no lead.
4. Define plano e categoria.
5. Sistema cria `User` (`role=ALUNO`, `status=ATIVO`), `StudentProfile` e `PasswordResetToken` de 24 h.
6. Sistema exibe o link de primeiro acesso **uma única vez**, com botão copiar, e tenta enviar por WhatsApp.
7. Lead passa a `CONVERTIDO`.

### 4.4 Admin → boleto e pagamento presencial

1. Admin abre `/admin/pagamentos`.
2. Em um pedido `PENDENTE`, clica em `GERAR BOLETO`, informa vencimento (padrão 5 dias úteis).
3. Sistema cria a cobrança no Asaas e grava `invoiceUrl` e `asaasPaymentId`.
4. Aluno vê o boleto em `/minha-area` e no pedido.
5. Quando o aluno paga em dinheiro no balcão, o admin clica em `MARCAR RECEBIDO`, escolhe `DINHEIRO` e confirma.
6. Sistema marca `PAGO`, grava `paidAt` e dispara o mesmo aviso de WhatsApp.

### 4.5 Aluno → login

1. Aluno abre `/entrar`, informa e-mail e senha (com botão de mostrar/ocultar).
2. Sistema valida e retorna access token + cookie de refresh.
3. Redireciona para `/minha-area` (aluno) ou `/admin/leads` (admin).
4. Em `/minha-area`: nome, categoria, plano, status da matrícula e pagamentos.
5. Se a senha for provisória, o sistema exige a troca antes de liberar a área.

Caso contrário (credencial inválida): mensagem única "e-mail ou senha inválidos", sem indicar qual campo, com o mesmo tempo de resposta para e-mail inexistente e senha errada.

### 4.6 Admin → cancelar e reembolsar

1. Admin abre `/admin/pagamentos` e escolhe um pedido `PAGO`.
2. Clica em `CANCELAR E REEMBOLSAR`.
3. Sistema mostra a prévia do estorno: valor pago, taxa de cancelamento aplicável (conforme política e prazo), valor a devolver e se está dentro do prazo de arrependimento de 7 dias.
4. Admin confirma com motivo (obrigatório, mínimo 10 caracteres).
5. Sistema chama o estorno no Asaas, grava `Refund` e muda o pedido para `ESTORNADO`.
6. Gera `Notification` para o WhatsApp da escola informando o estorno.
7. Aluno vê em `/minha-area` o status "estornado" com o valor devolvido.
8. Se o pedido ainda estiver `PENDENTE`, a ação é `CANCELAR` (sem estorno) e o pedido vai para `CANCELADO`.

Falha no estorno: pedido permanece `PAGO`, `Refund.status = FALHOU` com o motivo, e o admin vê alerta — nunca marcar como reembolsado sem confirmação do Asaas.

---

## 5. Requisitos funcionais

### RF-001 — Landing pública

**Entrada:** nenhuma.
**Regras:** busca planos ativos, prova social publicada e configurações públicas em paralelo; nenhuma seção quebra a página se um dos três falhar (a seção some e o erro é registrado no console com `requestId`).
**Resultado:** página renderizada em até 2,5 s em 3G rápido.

**Critérios de aceite**
- [ ] Hero, selo, planos, prova social, como funciona, dúvidas, CTA final e footer renderizam com dados do banco.
- [ ] Falha em prova social não impede a página de carregar.
- [ ] Nenhuma seção exibe texto placeholder do tipo "lorem".
- [ ] WhatsApp flutuante presente e funcional em todas as rotas.
- [ ] A página é SPA e exige JavaScript para renderizar conteúdo (decisão D-016); a limitação está declarada no `decisions.md` e não é tratada como requisito desta fatia.

### RF-002 — Vitrine de planos (4 planos)

**Entrada:** planos ativos ordenados por `ordem`.
**Regras:**
- Preço exibido em reais, com centavos apenas quando diferentes de zero.
- No máximo um plano com `destaque = true`.
- Plano inativo não aparece em nenhum lugar público.
- Nenhum preço é hardcoded no front.
- O card exibe o **valor base** do plano; taxas por forma de pagamento aparecem apenas no checkout, com aviso explícito no card.

**Critérios de aceite**
- [ ] Exatamente os planos ativos aparecem, na ordem definida.
- [ ] Card com `destaque` mostra badge `MAIS ESCOLHIDO`.
- [ ] Preço de R$ 1.200,00 exibe "R$ 1.200" e R$ 1.199,90 exibe "R$ 1.199,90".
- [ ] O card exibe o preço base e informa que o detalhamento com taxas está no checkout.
- [ ] Desativar um plano no admin remove o card após o próximo carregamento, sem deploy.
- [ ] Cada card leva ao checkout do plano correspondente.

### RF-003 — Selo "menor preço da região"

**Entrada:** `Settings.landing.sealText`, `Settings.landing.sealNote`, `Settings.landing.sealEnabled`.
**Regras:**
- Sem tabela comparativa, sem preço riscado, sem nome de concorrente.
- Selo só aparece se `sealEnabled = true` e o texto não estiver vazio.
- O texto é editável pelo admin; desligar o selo não deixa buraco no layout.

**Critérios de aceite**
- [ ] Com selo ligado, a faixa aparece com pill `MENOR PREÇO DA REGIÃO` e texto de apoio.
- [ ] Com selo desligado, a faixa some e a seção seguinte sobe sem espaço fantasma.
- [ ] Nenhum valor de concorrente é exibido em qualquer tela.
- [ ] Texto com mais de 160 caracteres é truncado no admin com aviso, não quebra o layout.

### RF-004 — Prova social (5 depoimentos, foto ou vídeo)

**Entrada:** `SocialProof` publicados, ordenados por `ordem`.
**Regras:**
- Cada item tem `mediaType` `FOTO` ou `VIDEO` e `mediaUrl`.
- Vídeo: poster obrigatório, sem autoplay com som, legenda quando existir.
- Item com mídia quebrada é ignorado e os demais continuam.
- Carrossel com autoplay de 6 s, pausado em hover, em foco e com `prefers-reduced-motion`.
- Navegação por setas, dots, arrasto e teclado.

**Critérios de aceite**
- [ ] Até 5 itens publicados aparecem no carrossel na ordem definida.
- [ ] Item não publicado não aparece.
- [ ] Autoplay pausa ao focar um card e não retoma sozinho enquanto o foco estiver ali.
- [ ] Com `prefers-reduced-motion`, não há autoplay nem transição animada.
- [ ] Setas e dots são operáveis por teclado e têm nome acessível.
- [ ] Imagem sem `alt` é rejeitada no cadastro do admin.

### RF-005 — Pré-matrícula (lead)

**Entrada:** `nome` (3–80, obrigatório), `whatsapp` (obrigatório, 10–11 dígitos após normalização), `email` (opcional, válido), `planId` (opcional), `mensagem` (até 500).
**Regras:**
- Nome normalizado (trim + espaços múltiplos colapsados).
- WhatsApp normalizado para dígitos; DDD obrigatório.
- Duplicidade: mesmo WhatsApp + mesmo plano em 24 h retorna o lead existente em vez de criar outro.
- Lead nasce com `status = NOVO`.
- Rate limit 5 por IP por minuto.

**Critérios de aceite**
- [ ] Lead válido é persistido e retorna 201 com `id`.
- [ ] Nome com 2 caracteres retorna 422 com erro no campo `nome`.
- [ ] WhatsApp com 9 dígitos retorna 422 com erro no campo `whatsapp`.
- [ ] Repetir o envio em menos de 24 h não cria segundo lead.
- [ ] Sexta tentativa em um minuto retorna 429.
- [ ] Erro de servidor exibe mensagem genérica e preserva os dados digitados.

### RF-006 — Checkout com detalhamento de valores

**Entrada:** `planSlug`, `name` (3–80, obrigatório), `whatsapp`, `email` (opcional), `method` (`PIX` | `CREDITO` | `DEBITO` | `BOLETO` | `DINHEIRO`), `installments` (1–12, só para `CREDITO`), `cardToken` (obrigatório para `CREDITO`/`DEBITO`), `consentAccepted` (boolean) e `termsVersion`.

**Regras:**
- Valor base lido de `Plan` no servidor; qualquer valor enviado pelo cliente é ignorado.
- `total = base + taxa`, onde a taxa vem da `FeeRule` vigente para `method` + faixa de parcelas.
- A taxa só é cobrada se `FeePolicy.passToCustomer = true` (padrão). Se `false`, a escola absorve e a taxa não aparece para o cliente.
- `installmentCents = round(total / installments)`; a **última parcela absorve a diferença** de arredondamento, garantindo que a soma das parcelas seja exatamente o total.
- Parcelamento com parcela menor que R$ 5,00 é rejeitado (limite do Asaas para cartão).
- **Consentimento obrigatório:** `consentAccepted` falso ou `termsVersion` desatualizado → 422 e nenhum pedido criado.
- O pedido grava `termsVersion`, `consentAcceptedAt`, `consentIp` e `consentUserAgent` como prova.
- Plano inativo retorna 422; método desabilitado na política retorna 422.
- `BOLETO` e `DINHEIRO` no checkout público apenas registram intenção de pagamento presencial e exigem `Settings.checkout.allowManualMethods = true`; o checkout público **nunca** cria cobrança no Asaas. Cobrança de boleto real é criada exclusivamente pelo admin (RF-010).
- Pedido nasce `PENDENTE` com `publicToken` aleatório de 32 caracteres e snapshot da `FeeRule` usada.
- Nenhum dado de cartão trafega para o backend: o front tokeniza no Asaas com a public key e envia apenas `cardToken`.
- Toda criação de pedido gera também o `Lead` correspondente, se não existir.

**Critérios de aceite**
- [ ] Checkout exibe valor do plano, taxa, total e valor da parcela antes de confirmar.
- [ ] Plano de R$ 1.900 em 12x com taxa de 4,99% exibe parcela calculada e a soma das 12 parcelas é exatamente o total.
- [ ] Corpo com `totalCents` ou `baseAmountCents` forjado é ignorado; prevalece o cálculo do servidor.
- [ ] Sem consentimento marcado, o envio é bloqueado no front **e** retorna 422 no servidor.
- [ ] O pedido guarda versão dos termos, IP, user-agent e data do consentimento.
- [ ] Alterar a `FeeRule` no admin muda o total do próximo pedido sem deploy.
- [ ] Parcela abaixo de R$ 5,00 retorna 422 com mensagem clara.
- [ ] Pedido Pix retorna QR e copia-e-cola válidos.
- [ ] Pedido de cartão com token inválido retorna 422 e não cria cobrança.
- [ ] Pedido com `planSlug` inexistente retorna 404.
- [ ] Botão fica desabilitado durante o envio e reabilita em erro.
- [ ] `publicToken` não é sequencial nem derivável do `id`.

### RF-007 — Acompanhamento do pagamento

**Entrada:** `publicToken`.
**Regras:** a página consulta o status a cada 5 s enquanto `PENDENTE`, para ao chegar em `PAGO`/`CANCELADO`/`VENCIDO`.

**Critérios de aceite**
- [ ] Status muda de "aguardando" para "confirmado" sem recarregar a página.
- [ ] Polling para após status final.
- [ ] Token inválido exibe "pedido não encontrado" e CTA de WhatsApp.
- [ ] A tela nunca afirma pagamento sem `status = PAGO` vindo do servidor.

### RF-008 — Webhook Asaas

**Entrada:** payload do Asaas + header de token.
**Regras:**
- Token inválido → 401, nada é gravado.
- `WebhookEvent.eventId` é único; repetição responde 200 sem reprocessar.
- Só transições permitidas: `PENDENTE → PAGO`, `PENDENTE → VENCIDO`, `PENDENTE → CANCELADO`, `PAGO → ESTORNADO`.
- Evento para pedido desconhecido é gravado e ignorado, sem erro 500.
- Processamento responde 200 em até 5 s; envio de WhatsApp é assíncrono.

**Critérios de aceite**
- [ ] Mesmo evento enviado duas vezes gera um único `Notification` e um único `paidAt`.
- [ ] Payload sem token retorna 401.
- [ ] Evento de pedido inexistente não derruba o endpoint.
- [ ] Estorno após pagamento muda o status para `ESTORNADO` e não apaga o histórico.

### RF-009 — Aviso no WhatsApp da escola

**Entrada:** `Settings.school.whatsapp`, `Settings.school.whatsappTemplate`, pedido pago.
**Regras:**
- Template com variáveis `{{nome}}`, `{{plano}}`, `{{valor}}`, `{{forma}}`, `{{protocolo}}`.
- Variável desconhecida é mantida literal e registrada em log de aviso.
- Número ausente ou inválido: `Notification` fica `FALHOU` com motivo, e o admin vê alerta em `/admin/pagamentos`.
- Envio nunca bloqueia a resposta do webhook.
- Em dev, `OutboxAdapter` grava a mensagem e não envia.

**Critérios de aceite**
- [ ] Pagamento confirmado gera `Notification` com o nome do comprador no corpo.
- [ ] Alterar o número no admin passa a valer sem deploy.
- [ ] Número inválido não impede a confirmação do pagamento.
- [ ] Admin vê a notificação falhada e consegue reenviar.

### RF-010 — Boleto (somente admin)

**Entrada:** `orderId`, `dueDate` (opcional).
**Regras:** só `ADMIN`; pedido precisa estar `PENDENTE`; vencimento mínimo hoje + 1 dia útil; gera cobrança `BOLETO` no Asaas e grava `invoiceUrl`.
**Critérios de aceite**
- [ ] Aluno recebe 403 ao chamar a rota.
- [ ] Boleto gerado aparece em `/minha-area` e em `/admin/pagamentos`.
- [ ] Segundo boleto para o mesmo pedido é bloqueado com 409.
- [ ] Vencimento no passado retorna 422.

### RF-011 — Marcar recebido (dinheiro)

**Entrada:** `orderId`, `method = DINHEIRO`, `observacao` (opcional, até 300).
**Regras:** apenas `ADMIN`; só `PENDENTE`; grava `paidAt` do servidor e dispara o aviso de WhatsApp do RF-009.
**Critérios de aceite**
- [ ] Pedido muda para `PAGO` e registra quem marcou e quando.
- [ ] Aviso de WhatsApp é gerado.
- [ ] Repetir a ação em pedido já pago retorna 409.

### RF-012 — Autenticação

**Entrada:** `email`, `password`.
**Regras:**
- bcrypt cost 12; comparação sempre executada (mesmo com e-mail inexistente) para não vazar tempo.
- Access token JWT HS256, 15 min, payload `{ sub, role }`.
- Refresh token opaco, 30 dias, hash SHA-256 em `Session`, cookie `httpOnly; Secure; SameSite=Strict; Path=/api/auth`.
- Rotação a cada refresh; reuso de token revogado revoga a família inteira.
- 5 tentativas por minuto por IP + e-mail.
- Usuário `BLOQUEADO` não autentica.
- Senha provisória força troca antes de acessar a área.

**Critérios de aceite**
- [ ] Login válido retorna access token e define cookie de refresh.
- [ ] Senha errada e e-mail inexistente retornam a mesma mensagem e o mesmo status.
- [ ] Sexta tentativa em um minuto retorna 429.
- [ ] Refresh com token válido emite novo par e invalida o anterior.
- [ ] Reutilizar o refresh antigo revoga a sessão e retorna 401.
- [ ] Logout apaga o cookie e revoga a sessão.
- [ ] Usuário bloqueado recebe 403.
- [ ] Token expirado retorna 401 e o front tenta refresh uma vez antes de deslogar.

### RF-013 — Controle de acesso

**Regras:** `RolesGuard` em toda rota admin; toda rota de aluno valida propriedade no service (não no token).
**Critérios de aceite**
- [ ] Aluno chamando `/api/admin/*` recebe 403.
- [ ] Aluno abrindo `/minha-area` de outro id recebe 403/404, nunca dados.
- [ ] Token sem `role` é rejeitado.
- [ ] Rota admin com token de aluno expirado retorna 401, não 500.

### RF-014 — Minha área

**Entrada:** usuário autenticado.
**Regras:** mostra apenas dados próprios: nome, e-mail, WhatsApp, categoria, plano, status da matrícula, pedidos e boletos.
**Critérios de aceite**
- [ ] Sem matrícula liberada, exibe "matrícula ainda não liberada" com CTA de WhatsApp.
- [ ] Pedidos aparecem em ordem decrescente de criação.
- [ ] Nenhum campo de outro aluno aparece na resposta.

### RF-015 — Conversão de lead em aluno

**Entrada:** `leadId`, `planId`, `categoria`.
**Regras:** só `ADMIN`; e-mail obrigatório no lead para gerar acesso (se ausente, o admin informa no ato); senha provisória aleatória de 12 caracteres nunca exibida em log; link de definição de senha válido por 24 h e de uso único; lead vira `CONVERTIDO` e não pode ser convertido duas vezes.
**Critérios de aceite**
- [ ] Conversão cria `User` `ALUNO` + `StudentProfile` e retorna o link uma única vez.
- [ ] Converter o mesmo lead novamente retorna 409.
- [ ] Link usado duas vezes retorna 410 na segunda.
- [ ] Link expirado retorna 410.

### RF-016 — Administração de planos

**Regras:** criar, editar, reordenar e desativar. Desativar não apaga histórico de pedidos. Preço em centavos, inteiro positivo. Slug único e imutável depois de criado.
**Critérios de aceite**
- [ ] Preço negativo ou zero é rejeitado.
- [ ] Slug duplicado retorna 409.
- [ ] Plano com pedidos não pode ser excluído, apenas desativado.
- [ ] Mudança de ordem reflete na landing.

### RF-017 — Administração de prova social

**Regras:** upload de foto (JPEG/PNG/WebP até 5 MB) e vídeo (MP4 até 50 MB); `alt` obrigatório para foto; `poster` obrigatório para vídeo; publicação explícita.
**Critérios de aceite**
- [ ] Arquivo acima do limite retorna 413.
- [ ] Tipo não permitido retorna 415.
- [ ] Upload sem `alt` (foto) retorna 422.
- [ ] Item despublicado some da landing.
- [ ] URL gerada em dev aponta para o disco local; em prod, para o bucket do Supabase.

### RF-018 — Configurações da escola

**Regras:** chave-valor com validação por chave; `school.whatsapp` validado como telefone; alterações auditadas com autor e data.
**Critérios de aceite**
- [ ] WhatsApp inválido é rejeitado com erro no campo.
- [ ] Alteração reflete na landing e nas notificações sem deploy.
- [ ] Alteração por usuário sem `ADMIN` retorna 403.

### RF-019 — Primeiro acesso e recuperação de senha

**Regras:** token aleatório de 32 bytes, hash no banco, 24 h, uso único; resposta idêntica exista ou não o e-mail; nova senha com mínimo 8 caracteres, ao menos uma letra e um número; ao definir, todas as sessões antigas são revogadas.
**Critérios de aceite**
- [ ] Pedido de recuperação para e-mail inexistente retorna 200 com a mesma mensagem.
- [ ] Senha "12345678" é rejeitada.
- [ ] Após definir a senha, o link não funciona mais.
- [ ] Todas as sessões anteriores são revogadas.

### RF-020 — Mídia

**Regras:** upload via `POST /api/admin/media`, validação de MIME real (magic bytes, não extensão), nome aleatório, sem path traversal, `Cache-Control` público longo para mídia pública.
**Critérios de aceite**
- [ ] Arquivo renomeado para `.php` com conteúdo de imagem é aceito como imagem e servido como `image/*`.
- [ ] Conteúdo de HTML com extensão `.png` é rejeitado.
- [ ] Nome com `../` não escreve fora do diretório de upload.

### RF-021 — Conteúdo editável da landing

**Entrada:** `ContentBlock` (chave, seção, tipo, valor).
**Regras:**
- **Todo texto visível da landing vem do banco.** Nenhuma cópia de marketing fica hardcoded no front.
- Chaves semeadas cobrem: hero (eyebrow, linha 1, linha 2, apoio, CTA primário, CTA secundário, micro-linha), faixa do selo (pill e apoio), cabeçalhos de seção, rótulos de botão, textos de estado vazio/erro, CTA final e micro-textos.
- Texto puro apenas: HTML é escapado na renderização. Quebras de linha simples são preservadas.
- Limite de caracteres por chave (definido no seed); exceder retorna 422 com o limite na mensagem.
- Chave obrigatória não aceita vazio; chave ausente cai no valor do seed, nunca em tela vazia.
- Publicação é imediata ao salvar, com auditoria (autor, antes, depois) e possibilidade de restaurar a versão anterior.
- Cache público de 60 s, invalidado no salvamento.

**Critérios de aceite**
- [ ] Alterar `hero.titleLine1` no admin muda a landing em até 60 s, sem deploy.
- [ ] Tentar salvar `<script>alert(1)</script>` exibe o texto literal, sem executar.
- [ ] Salvar vazio em chave obrigatória retorna 422.
- [ ] Texto acima do limite retorna 422 com o limite.
- [ ] Histórico mostra autor, data, valor anterior e permite restaurar.
- [ ] Remover uma chave do banco não deixa a seção vazia (fallback do seed).

### RF-022 — Dúvidas frequentes editáveis

**Entrada:** `FaqItem` (pergunta 5–120, resposta 10–600, ordem, publicado).
**Regras:** CRUD no admin; ordem arrastável; despublicado some da landing; no mínimo 1 item publicado para a seção aparecer; máximo 20.
**Critérios de aceite**
- [ ] Criar item no admin faz aparecer na landing na posição definida.
- [ ] Despublicar o último item oculta a seção inteira, sem espaço fantasma.
- [ ] Pergunta com 3 caracteres retorna 422.
- [ ] Reordenar reflete na landing.

### RF-023 — Rodapé e dados da escola editáveis

**Entrada:** `Settings` com chaves `footer.*`: `address`, `addressLine2`, `hours`, `phone`, `whatsapp`, `email`, `cnpj`, `legalNote`, `instagram`.
**Regras:** validados por tipo (telefone com 10–11 dígitos, e-mail válido, CNPJ com 14 dígitos); aparecem no rodapé e alimentam os links de contato; alteração vale sem deploy; campo vazio remove a linha em vez de mostrar "undefined".
**Critérios de aceite**
- [ ] Alterar endereço no admin reflete no rodapé.
- [ ] CNPJ inválido retorna 422.
- [ ] Campo deixado vazio remove a linha do rodapé.
- [ ] WhatsApp do rodapé é o mesmo configurado para as notificações.

### RF-024 — Política de taxas configurável

**Entrada:** `FeeRule` (`method`, `installmentsFrom`, `installmentsTo`, `percentBps`, `fixedCents`) e `FeePolicy` (`passToCustomer`, `enabledMethods`).
**Regras:**
- Taxa = `base * percentBps / 10000 + fixedCents`, arredondada para cima no centavo.
- Faixas de parcelas não podem se sobrepor para o mesmo método (conflito retorna 409).
- `passToCustomer = false` faz a escola absorver a taxa; o cliente vê apenas o valor do plano.
- Alterações **nunca** retroagem: pedidos já criados mantêm o snapshot da regra usada.
- Admin tem prévia: dado um plano e um parcelamento, mostra base, taxa, total e parcela.

**Critérios de aceite**
- [ ] Criar duas faixas sobrepostas para o mesmo método retorna 409.
- [ ] Prévia no admin bate exatamente com o valor cobrado no checkout.
- [ ] Mudar o percentual não altera pedidos antigos.
- [ ] Com `passToCustomer = false`, o checkout não exibe taxa e o total é igual ao plano.
- [ ] Método removido de `enabledMethods` desaparece do checkout.

### RF-025 — Termos, consentimento e transparência de encargos

**Entrada:** `TermsDocument` (`version`, `content`, `publishedAt`) e aceite no checkout.
**Regras:**
- Só uma versão vigente; publicar nova versão arquiva a anterior, sem apagar.
- O checkout exige aceite da versão vigente e exibe, antes do botão: o detalhamento de valores, a política de cancelamento em resumo (percentual de retenção e prazo de arrependimento de 7 dias) e o link para o termo completo.
- O aceite grava versão, data, IP e user-agent no pedido.
- Termo é texto simples com quebras de linha; sem HTML executável.

**Critérios de aceite**
- [ ] Checkout mostra o resumo da política de cancelamento antes de confirmar.
- [ ] Publicar nova versão obriga novo aceite no próximo checkout.
- [ ] Pedido antigo continua apontando para a versão aceita na época.
- [ ] Aceite sem IP registrado é rejeitado no servidor.
- [ ] Link do termo abre a versão vigente em página pública.

### RF-026 — Cancelamento e reembolso

**Entrada:** `orderId`, `reason` (10–300), confirmação de valor.
**Regras:**
- Apenas `ADMIN`.
- Pedido `PENDENTE` → `CANCELADO` (sem estorno). Pedido `PAGO` → estorno no Asaas → `ESTORNADO`.
- Valor devolvido = `valor pago − taxa de cancelamento`, onde a taxa segue `Settings.refund.feePercent` e só se aplica após `Settings.refund.feeAppliesAfterDays`.
- Dentro de 7 dias da compra (arrependimento, CDC art. 49), a taxa de cancelamento é **zero**.
- Estorno é idempotente por `orderId`: segunda tentativa retorna 409.
- Falha no gateway marca `Refund.status = FALHOU` e **mantém** o pedido `PAGO`.
- Ação registra autor, motivo e valores; gera `Notification` (RF-027).

**Critérios de aceite**
- [ ] Cancelar pedido pendente não chama o gateway e marca `CANCELADO`.
- [ ] Reembolsar dentro de 7 dias devolve 100% do valor pago.
- [ ] Reembolsar após o prazo aplica a retenção configurada e mostra o valor líquido antes de confirmar.
- [ ] Segunda tentativa de estorno no mesmo pedido retorna 409.
- [ ] Falha do gateway mantém o pedido como `PAGO` e exibe alerta.
- [ ] Aluno vê "estornado" e o valor devolvido em `/minha-area`.
- [ ] Estorno não apaga histórico: pedido, pagamento e reembolso continuam consultáveis.

### RF-027 — Aviso de cancelamento no WhatsApp

**Regras:** template próprio (`school.refundTemplate`) com `{{nome}}`, `{{plano}}`, `{{valorPago}}`, `{{valorDevolvido}}`, `{{protocolo}}`, `{{motivo}}`; mesma resiliência do RF-009 (falha não desfaz o estorno).
**Critérios de aceite**
- [ ] Estorno concluído gera mensagem com valor devolvido.
- [ ] Template inválido não impede o estorno.
- [ ] Admin consegue reenviar o aviso.

---

## 6. Interface

### 6.1 Mapa design → funcionalidade

| ID | Referência no DESIGN.md | Tela / bloco | Requisito |
|---|---|---|---|
| UI-001 | Hero display | hero da landing | RF-001 |
| UI-002 | Filled Primary Button | CTAs `QUERO MINHA CNH` | RF-001, RF-006 |
| UI-003 | Ghost Outline Button | nav e `VER PREÇOS` | RF-001 |
| UI-004 | Pill Badge | selo, `MAIS ESCOLHIDO`, categorias | RF-003, RF-002 |
| UI-005 | Surface Card | cards de plano e depoimento | RF-002, RF-004 |
| UI-006 | Dotted Divider | separadores de seção | RF-001 |
| UI-007 | Pill Input Field | checkout, login, admin | RF-005, RF-012 |
| UI-008 | Alert Badge | urgência e erro | RF-003 |
| UI-009 | Iconography Set | WhatsApp FAB, setas do carrossel | RF-001, RF-004 |
| UI-010 | Surface Card | detalhamento de valores no checkout | RF-006, RF-024 |
| UI-011 | Pill Input Field | checkbox de consentimento e seleção de parcelas | RF-025 |
| UI-012 | Alert Badge | aviso de encargo de cancelamento | RF-025, RF-026 |
| UI-013 | Ghost Outline Button | ações do editor de conteúdo no admin | RF-021 |

### 6.2 Tokens

Uso obrigatório dos tokens do `DESIGN.md` via `@theme` do Tailwind v4. Proibido valor de cor literal em componente.

| Papel | Valor |
|---|---|
| canvas | `#823513` |
| card | `#402011` |
| profundo | `#281006` |
| acento | `#faae33` |
| borda | `#6b2e12` |
| alerta | `#d1255c` |

### 6.3 Desvios autorizados do DESIGN.md

1. Fotografia de pessoa permitida **somente** no carrossel de prova social, dentro do card de 6px.
2. Foco visível obrigatório em inputs (o design pede ausência de anel): `outline` 2px `#faae33` com offset 2px.
3. Watermark botânico substituído por marcação viária tracejada a 4% de opacidade.
4. `Chili Red` também sinaliza erro de formulário, não apenas "heat".

### 6.4 Regra de contraste

- Texto pequeno (13–18px) nunca direto no canvas `#823513`; sempre sobre `#402011` ou `#281006`.
- Texto no canvas tem no mínimo 18px/500.
- Contraste mínimo 4,5:1 para texto normal e 3:1 para texto grande; verificado por teste automatizado de contraste nos tokens.

### 6.5 Estados obrigatórios

| Tela | loading | vazio | erro | sucesso |
|---|---|---|---|---|
| Planos | skeleton 4 cards | "planos em atualização" + WhatsApp | retry | — |
| Prova social | skeleton 5 cards | seção oculta | seção oculta | — |
| Checkout | botão desabilitado | — | erro por campo + geral | redireciona |
| Pagamento | "aguardando confirmação" | — | "pedido não encontrado" | "confirmado" |
| Login | botão desabilitado | — | "e-mail ou senha inválidos" | redireciona por papel |
| Minha área | skeleton | "matrícula não liberada" | retry | — |
| Admin leads | skeleton linhas | "nenhuma pré-matrícula" | retry | toast |
| Admin pagamentos | skeleton linhas | "nenhum pedido" | retry | toast |
| Admin conteúdo | skeleton de campos | "nenhum bloco nesta seção" | retry | toast "publicado" |
| Admin reembolso | botão "processando" | — | falha do gateway | toast + chip de falha |
| Checkout com taxas | "calculando valores…" | — | método sem regra configurada | resumo atualizado |

### 6.6 Responsividade

- Mobile até 767px: display 56px, cards em coluna, carrossel 1 por vez, nav em sheet, FAB 56px.
- Tablet 768–1023px: display 88px, planos 2×2.
- Desktop 1024px+: display **144px**, planos 4 colunas, carrossel 3 por vez, container 1440px.
- Escala tipográfica com `clamp()`, sem tamanho fixo solto.
- O hero ocupa no máximo ~78% da altura da viewport em desktop; o CTA precisa aparecer sem rolagem em telas de 900px de altura.

> **Revisão de 2026-11-10:** o display do hero caiu de 195px para 144px (e de 72px para 56px no mobile) porque ocupava a dobra inteira e empurrava preço e CTA para fora da tela. Continua dentro da faixa 130–213px do DESIGN.md, no piso.

### 6.8 Detalhamento de valores e consentimento

- O checkout mostra, antes do botão de confirmar: `Plano` + valor base, `Taxas da forma de pagamento` (ou "sem taxa"), `Total` em 29px e `ou Nx de R$ X` em destaque.
- Quando o método não tem taxa, a linha **aparece** dizendo "sem taxa" — transparência vale mais que limpeza visual.
- Seletor de parcelas de 1 a 12, cada opção já com o valor da parcela.
- Consentimento: checkbox com rótulo clicável, link para os termos e frase obrigatória sobre retenção no cancelamento ("pode haver retenção de até X% se você cancelar após N dias").
- Sem consentimento, o botão fica desabilitado; se forçado, erro inline com `role="alert"`.
- Em mobile, o resumo empilha e o total mantém 29px.

### 6.7 Acessibilidade

- Tudo operável por teclado, foco visível e ordem de tabulação igual à visual.
- Carrossel: `aria-roledescription`, setas nomeadas, `aria-live="polite"`, autoplay pausável.
- Vídeo com faixa de legenda; sem autoplay com som.
- Labels reais, `aria-describedby` nos erros, `role="alert"`.
- Modal prende foco, fecha com Esc e devolve foco ao gatilho.
- Estado nunca comunicado só por cor.
- `alt` obrigatório em foto de depoimento.

---

## 7. Modelo de dados

Dinheiro em centavos (`Int`). Datas em UTC. `id` UUID v4 salvo como texto.

### User
| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| id | uuid | sim | servidor |
| name | string | sim | 3–80 |
| email | string | sim | único, minúsculo |
| passwordHash | string | sim | bcrypt cost 12 |
| role | enum | sim | `ALUNO`, `ADMIN` |
| status | enum | sim | `PENDENTE`, `ATIVO`, `BLOQUEADO` |
| whatsapp | string | não | dígitos |
| mustChangePassword | bool | sim | padrão `true` para conta criada por admin |
| lastLoginAt | datetime | não | servidor |
| createdAt / updatedAt | datetime | sim | servidor |

### StudentProfile
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| userId | uuid | único, FK |
| planId | uuid | FK `Plan` |
| categoria | enum | `A`, `B`, `AB`, `REFORCO` |
| matriculaAtiva | bool | padrão `false` |
| iniciouEm | datetime | opcional |

### Session
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| userId | uuid | FK |
| familyId | uuid | agrupa a cadeia de refresh |
| tokenHash | string | único, SHA-256 |
| expiresAt | datetime | +30 dias |
| revokedAt | datetime | nulo enquanto válida |
| ip / userAgent | string | auditoria |

### PasswordResetToken
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| userId | uuid | FK |
| tokenHash | string | único |
| expiresAt | datetime | +24 h |
| usedAt | datetime | nulo até uso |

### Plan
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| slug | string | único, imutável |
| nome | string | 3–60 |
| categoria | enum | `A`, `B`, `AB`, `REFORCO` |
| precoCentavos | int | > 0 |
| parcelas | int | 1–12, padrão 1 |
| inclui | string[] | até 8 itens |
| destaque | bool | no máximo um ativo |
| ativo | bool | padrão `true` |
| ordem | int | inteiro |

### Lead
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| nome | string | 3–80 |
| whatsapp | string | 10–11 dígitos |
| email | string | opcional |
| planId | uuid | opcional |
| mensagem | string | até 500 |
| status | enum | `NOVO`, `CONTATADO`, `CONVERTIDO`, `DESCARTADO` |
| convertedUserId | uuid | opcional |
| createdAt | datetime | servidor |

A duplicidade de 24 h é regra de serviço (consulta por `whatsapp` + `planId` + `createdAt > agora - 24h`), não índice de banco, porque `planId` pode ser nulo. Índice comum em `(whatsapp, createdAt)`.

### Order
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| publicToken | string | 32 chars, único |
| planId | uuid | FK |
| buyerName | string | 3–80 |
| buyerEmail | string | opcional |
| buyerWhatsapp | string | dígitos |
| method | enum | `PIX`, `CREDITO`, `DEBITO`, `BOLETO`, `DINHEIRO` |
| status | enum | `PENDENTE`, `PAGO`, `VENCIDO`, `CANCELADO`, `ESTORNADO` |
| baseAmountCents | int | preço do plano no momento da compra |
| feeAmountCents | int | taxa calculada (0 quando a escola absorve) |
| totalCents | int | `base + fee` |
| feeRuleId | uuid | snapshot da regra usada |
| installments | int | 1–12 |
| installmentCents | int | valor da parcela, com a última ajustada |
| termsVersion | string | versão dos termos aceita |
| consentAcceptedAt | datetime | obrigatório |
| consentIp | string | obrigatório |
| consentUserAgent | string | obrigatório |
| asaasPaymentId | string | único, opcional |
| asaasCustomerId | string | opcional |
| invoiceUrl | string | opcional |
| pixPayload | text | opcional |
| dueDate | date | opcional |
| paidAt | datetime | opcional |
| paidByUserId | uuid | opcional, preenchido no recebimento manual |
| canceledAt | datetime | opcional |
| canceledByUserId | uuid | opcional |
| cancelReason | string | opcional |
| userId | uuid | opcional, se logado |
| createdAt | datetime | servidor |

### WebhookEvent
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| eventId | string | único |
| payload | json | bruto |
| receivedAt | datetime | servidor |
| processedAt | datetime | opcional |

### SocialProof
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| studentName | string | 2–60 |
| categoria | enum | `A`, `B`, `AB` |
| nota | int | 1–5 |
| quote | string | até 400, opcional em vídeo |
| mediaType | enum | `FOTO`, `VIDEO` |
| mediaUrl | string | obrigatório |
| thumbnailUrl | string | obrigatório para vídeo |
| alt | string | obrigatório para foto |
| approvedFirstTry | bool | padrão `true` |
| ordem | int | inteiro |
| publicado | bool | padrão `false` |

### Setting
| Campo | Tipo | Regra |
|---|---|---|
| key | string | único, notação pontual |
| value | json | validado por chave |
| updatedByUserId | uuid | auditoria |
| updatedAt | datetime | servidor |

Chaves iniciais: `school.whatsapp`, `school.whatsappTemplate`,
`school.refundTemplate`, `landing.sealEnabled`, `landing.sealText`,
`landing.sealNote`, `checkout.allowManualMethods`, `checkout.payAtSchoolEnabled`,
`fees.passToCustomer`, `fees.enabledMethods`, `refund.feePercent`,
`refund.feeAppliesAfterDays`, `refund.coolingOffDays` (padrão 7) e o grupo
`footer.*` (`address`, `addressLine2`, `hours`, `phone`, `whatsapp`, `email`,
`cnpj`, `legalNote`, `instagram`).

### ContentBlock
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| key | string | único; ex. `hero.titleLine1` |
| section | enum | `HERO`, `SEAL`, `PLANS`, `SOCIAL`, `STEPS`, `FAQ`, `FINAL_CTA`, `FOOTER`, `COMMON` |
| type | enum | `TEXT`, `TEXTAREA`, `LABEL` |
| value | text | texto puro; limite por chave |
| maxLength | int | 40–600 |
| required | bool | chave obrigatória não aceita vazio |
| updatedByUserId | uuid | auditoria |
| updatedAt | datetime | servidor |

### ContentRevision
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| contentBlockId | uuid | FK |
| previousValue | text | valor antes da edição |
| newValue | text | valor depois |
| changedByUserId | uuid | autor |
| createdAt | datetime | servidor |

### FaqItem
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| question | string | 5–120 |
| answer | text | 10–600 |
| ordem | int | inteiro |
| publicado | bool | padrão `false` |

### FeeRule
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| method | enum | `PIX`, `CREDITO`, `DEBITO`, `BOLETO` |
| installmentsFrom | int | 1 |
| installmentsTo | int | ≥ from, ≤ 12 |
| percentBps | int | 0–10000 |
| fixedCents | int | ≥ 0 |
| ativo | bool | padrão `true` |

Sem sobreposição de faixas por método (validado no serviço e por constraint).

### TermsDocument
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| version | string | único; ex. `2026-11-01` |
| content | text | texto puro |
| publishedAt | datetime | servidor |
| archivedAt | datetime | opcional |

### Refund
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| orderId | uuid | único (um estorno por pedido) |
| amountPaidCents | int | valor efetivamente pago |
| feeRetainedCents | int | retenção aplicada |
| amountRefundedCents | int | valor devolvido |
| status | enum | `SOLICITADO`, `PROCESSANDO`, `CONCLUIDO`, `FALHOU` |
| reason | string | 10–300 |
| asaasRefundId | string | opcional |
| requestedByUserId | uuid | autor |
| createdAt / completedAt | datetime | servidor / opcional |
| erro | string | opcional |

### Notification
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | servidor |
| canal | enum | `WHATSAPP`, `EMAIL` |
| destino | string | E.164 ou e-mail |
| corpo | text | mensagem renderizada |
| status | enum | `PENDENTE`, `ENVIADA`, `FALHOU` |
| erro | string | opcional |
| orderId | uuid | opcional |
| createdAt | datetime | servidor |
| sentAt | datetime | opcional |

### Seed inicial (conteúdo de rascunho, editável)

Planos: `A · Moto`, `B · Carro`, `AB · Moto + Carro`, `Reforço · Aulas avulsas`
— preços de exemplo, todos com `ativo = true` e um `destaque = true`.
Cinco `SocialProof` **não publicados**, com mídia de exemplo, para o admin revisar.
`Settings` com WhatsApp vazio (o sistema exibe alerta no admin até ser configurado).

`ContentBlock`: um registro por chave, com o texto atual do protótipo.
`FaqItem`: as 5 perguntas do protótipo, publicadas.
`FeeRule`: uma faixa por método, com percentual **zero** por padrão — a escola só
liga a taxa quando decidir repassar; assim nenhum pedido nasce cobrando algo não
combinado.
`TermsDocument`: versão `2026-11-10` com o texto-base de contratação e cancelamento.

---

## 8. API

Formato de erro único: `{ statusCode, code, message, details? }`, `message` em
português pronta para o usuário, sem stack e sem detalhe de banco.
Toda resposta inclui `x-request-id`.

### Público

```
GET  /api/public/plans                       → Plan[]
GET  /api/public/social-proof                → SocialProof[] (publicados)
GET  /api/public/settings                    → chaves públicas
GET  /api/public/content                     → { chave: valor }
GET  /api/public/faq                         → FaqItem[] (publicados)
GET  /api/public/terms                       → { version, content }
GET  /api/public/checkout/preview            → { base, fee, total, installment }
     ?planSlug=&method=&installments=
POST /api/public/leads                       → 201 Lead
POST /api/public/checkout                    → 201 { order, payment }
GET  /api/public/orders/:publicToken         → { order }
```

### Auth

```
POST /api/auth/login                         → { accessToken, user } + Set-Cookie
POST /api/auth/refresh                       → { accessToken } + Set-Cookie rotacionado
POST /api/auth/logout                        → 204
POST /api/auth/logout-all                    → 204
GET  /api/auth/me                            → { user }
POST /api/auth/password-reset/request        → 202
POST /api/auth/password-reset/confirm        → 204
```

### Aluno

```
GET  /api/me/summary                         → { user, student, orders }
```

### Admin (`role = ADMIN`)

```
GET    /api/admin/leads?status&page
PATCH  /api/admin/leads/:id/status
POST   /api/admin/leads/:id/convert          → { user, firstAccessUrl }
GET    /api/admin/orders?status&page
POST   /api/admin/orders/:id/boleto          → { invoiceUrl }
POST   /api/admin/orders/:id/mark-paid       → { order }
POST   /api/admin/orders/:id/cancel          → { order }        (pendente)
POST   /api/admin/orders/:id/refund          → { refund }       (pago)
GET    /api/admin/refunds?status&page
GET    /api/admin/plans
POST   /api/admin/plans
PATCH  /api/admin/plans/:id
DELETE /api/admin/plans/:id                  → desativa
GET    /api/admin/social-proof
POST   /api/admin/social-proof
PATCH  /api/admin/social-proof/:id
DELETE /api/admin/social-proof/:id
GET    /api/admin/content?section
PATCH  /api/admin/content/:key               → { block, revision }
GET    /api/admin/content/:key/revisions
POST   /api/admin/content/:key/restore       → { block }
GET    /api/admin/faq
POST   /api/admin/faq
PATCH  /api/admin/faq/:id
DELETE /api/admin/faq/:id
GET    /api/admin/fees
POST   /api/admin/fees                       → 409 se faixa sobrepõe
PATCH  /api/admin/fees/:id
DELETE /api/admin/fees/:id
POST   /api/admin/fees/preview               → { base, fee, total, installment }
GET    /api/admin/terms
POST   /api/admin/terms                      → publica nova versão
GET    /api/admin/settings
PATCH  /api/admin/settings
POST   /api/admin/media                      → { url }
GET    /api/admin/notifications?status
POST   /api/admin/notifications/:id/retry
```

### Webhook

```
POST /api/webhooks/asaas                     → 200 { received: true }
```

---

## 9. Segurança

- Senhas com bcrypt cost 12; nunca em log, nunca em resposta, nunca em token.
- JWT com `sub` e `role` apenas; sem PII no payload.
- Refresh em cookie `httpOnly`, `Secure` (prod), `SameSite=Strict`, `Path=/api/auth`.
- Rotação de refresh com detecção de reuso por família.
- `helmet`, CORS com lista explícita de origens, `ValidationPipe` com `whitelist` e `forbidNonWhitelisted`.
- Rate limit: login 5/min, checkout 10/min, leads 5/min, admin 100/min.
- Webhook autenticado por token do Asaas + `WebhookEvent` idempotente.
- Upload com validação de magic bytes, limite de tamanho e nome aleatório.
- Dados de cartão nunca passam pelo backend (tokenização no browser).
- Segredos só em env, validadas por Zod na subida; `.env` fora do repositório, `.env.example` com todas as chaves.
- Log estruturado com redação de `authorization`, `cookie`, `password`, `token`, `card`.
- **Conteúdo editorial** é tratado como entrada hostil: escape na renderização, sem HTML, `Content-Security-Policy` restritiva no front; `dangerouslySetInnerHTML` proibido.
- **Valores sempre calculados no servidor**: nenhum `total`, `fee` ou `installment` vindo do cliente é aceito.
- **Consentimento com prova**: versão dos termos, timestamp, IP e user-agent gravados na criação do pedido; retenção de 5 anos.
- **Reembolso** exige `ADMIN`, confirmação explícita com valor líquido, motivo e trilha de auditoria; idempotente por pedido.
- Termos e política de cancelamento versionados: publicar nova versão nunca apaga a anterior.

---

## 10. Testes

| Nível | Ferramenta | Cobertura mínima |
|---|---|---|
| Unitário | Vitest (web) / Jest (api) | RF-003, RF-005, RF-006, RF-008, RF-012, RF-015, RF-021, RF-024, RF-026 |
| Integração | supertest + Postgres de dev | RF-006, RF-008, RF-010, RF-011, RF-013, RF-018, RF-023, RF-025 |
| Interface | Testing Library | carrossel (RF-004), checkout com taxas (RF-006), consentimento (RF-025), login (RF-012) |
| Contraste | script de token | 6.4 |
| E2E (opcional na fatia) | Playwright | landing → checkout Pix → webhook simulado → confirmado; e admin → reembolso |

Casos obrigatórios:
1. Webhook duplicado não duplica efeito.
2. Aluno recebe 403 em rota admin.
3. Preço não vem do cliente.
4. Senha errada e e-mail inexistente respondem igual.
5. Reuso de refresh revoga a família.
6. Upload de HTML com extensão de imagem é rejeitado.
7. Link de primeiro acesso é de uso único.
8. `checkout/preview` bate centavo a centavo com o valor efetivamente cobrado.
9. Soma das parcelas é exatamente o total, inclusive com arredondamento.
10. Checkout sem consentimento não cria pedido.
11. Conteúdo com `<script>` é renderizado como texto e não executa.
12. Reembolso dentro de 7 dias devolve 100%; após, aplica retenção.
13. Segunda tentativa de reembolso no mesmo pedido retorna 409.
14. Falha no gateway mantém o pedido `PAGO`.

---

## 11. Aceite da fatia 1 (definition of done)

- [ ] `pnpm install && pnpm build && pnpm lint && pnpm test` passam (executado pelo responsável; esta sessão não tem shell).
- [ ] Landing publicada com 4 planos, selo, 5 depoimentos e CTA funcionando.
- [ ] Pedido Pix criado no sandbox do Asaas e confirmado por webhook.
- [ ] Pedido de cartão tokenizado com sucesso no sandbox.
- [ ] Boleto gerado pelo admin aparece para o aluno.
- [ ] Recebimento em dinheiro marcado pelo admin gera aviso de WhatsApp.
- [ ] Login de aluno e de admin com rotas protegidas e 403 cruzado.
- [ ] Link de primeiro acesso funciona uma vez e expira em 24 h.
- [ ] Nenhum segredo no repositório; `.env.example` completo.
- [ ] `decisions.md` atualizado com toda premissa nova.
- [ ] API publicada na Railway em `development` e `production`, com `/health` retornando 200 nos dois.
- [ ] `preDeployCommand` roda `prisma migrate deploy`; migration quebrada impede o deploy.
- [ ] Login funciona de ponta a ponta entre `www.destak.com.br` e `api.destak.com.br` (cookie de refresh aceito).
- [ ] Variáveis conferidas por ambiente; nenhuma credencial de produção no ambiente `development`.
- [ ] Rollback executado uma vez em `development` e documentado.
- [ ] Todos os textos da landing são editáveis no admin e refletem sem deploy.
- [ ] Rodapé (endereço, horário, contato, CNPJ) editável nas configurações.
- [ ] Dúvidas frequentes editáveis, com publicar/despublicar e reordenação.
- [ ] Checkout mostra valor do plano, taxa, total e valor da parcela.
- [ ] Consentimento obrigatório gravado com versão, IP e data.
- [ ] Admin cancela pedido pendente e reembolsa pedido pago, com valor líquido exibido antes.
- [ ] Política de taxas e de retenção configurável, com prévia no admin.

---

## 12. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Sem shell nesta sessão | não há verificação automática | implementação entregue com comandos de validação documentados; aceite exige execução externa |
| Supabase único de produção | teste tocar dados reais | dois projetos obrigatórios; `DATABASE_URL` de dev nunca aponta para prod; checagem na subida |
| Asaas sem conta aprovada | checkout não funciona | homologação no sandbox primeiro; `allowManualMethods` permite vender com boleto/dinheiro enquanto isso |
| Vídeo de 50 MB em 3G | landing lenta | poster obrigatório, `preload="none"`, limite de 50 MB, recomendação de 15 s |
| Alegação "mais barato da região" | risco comercial/jurídico | texto editável, desligável, sem comparação nominal |
| Prova social com foto real | LGPD | autorização de uso de imagem registrada fora do sistema; `alt` e remoção a pedido |
| Railway sem região no Brasil | latência de 110–160 ms na API | cache público curto, respostas enxutas, Cloudflare na frente; latência não afeta a landing estática |
| Disco do container é efêmero | upload sumiria após deploy | mídia sempre em Supabase Storage; disco local só na máquina do dev (D-008) |
| Limite de conexões do Supabase | esgotamento com picos | `pgbouncer` na URL da aplicação, `DIRECT_URL` apenas para migrations |
| Migration incompatível com versão anterior | rollback de código quebra | migrations aditivas (expand/contract) e revisão obrigatória no PR |
| Repasse de taxa ao cliente | questionamento comercial e reclamação | taxa só existe se configurada, aparece antes do pagamento, com total e parcela explícitos; padrão é 0% |
| Arrependimento em 7 dias (CDC art. 49) | cobrança indevida e reclamação no Procon | retenção zero no prazo; resumo da política no checkout e no termo; estorno total |
| Conteúdo editável como vetor de XSS | execução de script no site | escape na renderização, sem HTML, CSP, testes com payload malicioso |
| Texto longo quebrando o layout | hero estourando a dobra | limite de caracteres por bloco, aviso no editor e revisão visual |
| Reembolso sem confirmação do gateway | caixa divergente | pedido só vira `ESTORNADO` após resposta do Asaas; falha mantém `PAGO` |

---

## 13. Deploy, ambientes e infraestrutura

O backend roda na **Railway** como um container Docker. A escolha foi feita
sabendo do custo: a Railway **não tem região no Brasil**, então a API responde
com latência extra de rede para usuários brasileiros. O runbook operacional
completo, com comandos, está em `docs/ops/railway-setup.md`.

### 13.1 Topologia

| Camada | Onde roda |
|---|---|
| `apps/web` (SPA) | Cloudflare Pages — `www.destak.com.br` |
| `apps/api` (NestJS) | Railway, serviço `api`, ambientes `production` e `development` |
| Banco | Supabase Postgres (`destak-prod`, `destak-dev`) |
| Mídia | Supabase Storage (`media`, `media-dev`) |
| Pagamento | Asaas (produção e sandbox) |
| DNS / TLS | Cloudflare (DNS), Railway (TLS do `api.*`) |

### 13.2 Ambientes

| Item | `development` | `production` |
|---|---|---|
| Branch | `develop` | `main` |
| URL da API | `https://api-dev.destak.com.br` | `https://api.destak.com.br` |
| Banco | projeto Supabase `destak-dev` | projeto Supabase `destak-prod` |
| Bucket | `media-dev` | `media` |
| Asaas | chave de sandbox + webhook de homologação | chave de produção + webhook de produção |
| CORS | `http://localhost:5173`, `https://dev.destak.com.br` | `https://www.destak.com.br`, `https://destak.com.br` |
| Auto-deploy | push em `develop` | push em `main` |
| Dados | descartáveis | reais, com backup |

Regra dura: a API **não sobe** se `NODE_ENV !== production` e a `DATABASE_URL`
contiver o identificador do projeto Supabase de produção (D-007).

### 13.3 Build

- Dockerfile multi-stage: `node:22-alpine`, pnpm via `corepack`, `prisma generate`, build NestJS, poda de devDependencies, usuário não-root, `dumb-init` como PID 1.
- Contexto de build é a **raiz do monorepo** (o build precisa de `packages/shared`); o Dockerfile fica em `apps/api/Dockerfile` e a Railway recebe `RAILWAY_DOCKERFILE_PATH`.
- Cache de dependências via mount do store do pnpm.
- Imagem final não contém código-fonte, testes nem `.env`.

### 13.4 Migrations

- Executadas em `preDeployCommand`, antes de subir a nova versão: `prisma migrate deploy`.
- **Proibido** `prisma migrate dev` ou `db push` contra qualquer banco remoto.
- Migrations devem ser **aditivas e compatíveis com a versão anterior** (expand/contract), para permitir rollback de código sem rollback de dados.
- Falha na migration **impede** o deploy (não sobe código contra schema antigo).

### 13.5 Saúde, reinício e rollback

- `GET /health` verifica processo + `SELECT 1` no banco; responde 200 só com tudo ok.
- Healthcheck com timeout de 60 s; política `ON_FAILURE` com 5 tentativas.
- Deploy é atômico; a versão anterior continua servindo até o healthcheck passar.
- Rollback = redeploy da versão anterior pela Railway; como as migrations são aditivas, não há perda de dado.
- Logs estruturados em JSON (pino) com `requestId`; sem PII, sem token, sem senha.

### 13.6 Domínio, cookies e CORS

- Front em `www.destak.com.br` e API em `api.destak.com.br` são **mesmo site** (mesmo eTLD+1) → cookie de refresh com `Domain=.destak.com.br`, `SameSite=Strict`, `Secure`, `Path=/api/auth` e `httpOnly`.
- **Domínio próprio no front é obrigatório em produção.** Se o front ficar em `*.pages.dev`, vira cross-site e o cookie exigiria `SameSite=None`, ampliando superfície de CSRF.
- CORS com lista explícita de origens e `credentials: true`; origem fora da lista é rejeitada.
- Toda rota que usa cookie (`/auth/refresh`, `/auth/logout`) exige header `x-destak-csrf` e valida `Origin`.
- `app.set('trust proxy', 1)` para IP real e rate limit corretos atrás do proxy da Railway.

### 13.7 Segredos

- Todas as variáveis são cadastradas por **ambiente** na Railway; nenhuma no repositório.
- `.env.example` lista as chaves com valor vazio e comentário de uso.
- `JWT_SECRET`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` e `SUPABASE_SERVICE_ROLE_KEY` nunca aparecem no bundle do front nem em log.
- Rotação: trocar o segredo no ambiente e redeploy; tokens antigos caem por expiração ou `logout-all`.

### 13.8 Variáveis obrigatórias

`NODE_ENV`, `PORT`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`,
`JWT_ACCESS_TTL`, `REFRESH_TTL`, `APP_PUBLIC_URL`, `API_PUBLIC_URL`,
`CORS_ORIGINS`, `ASAAS_BASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`,
`STORAGE_DRIVER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_BUCKET`, `WHATSAPP_DRIVER`, `EVOLUTION_BASE_URL`,
`EVOLUTION_API_KEY`, `SCHOOL_WHATSAPP`, `LOG_LEVEL`.

### 13.9 Migração futura para VPS (Hostinger)

O backend sai da Railway sem reescrever nada porque:

- o artefato de deploy é o **Dockerfile**, não a plataforma;
- nenhuma API proprietária da Railway é usada (sem bindings, sem volume gerenciado);
- estado fica no Supabase (banco e storage), não no disco do container;
- configuração é 100% variável de ambiente.

Checklist de corte (detalhado no runbook): baixar TTL do DNS para 300 s → subir
`docker compose` na VPS com a mesma imagem + proxy reverso/TLS → apontar
`api.destak.com.br` para o novo IP → trocar a URL do webhook no Asaas → manter
a Railway ligada 48 h em standby → desligar.

### 13.10 Custos e desempenho

- Railway: cobrança por uso (container + egress); estimativa de US$ 5–15/mês no estágio inicial.
- Supabase: plano gratuito atende dev e produção inicial; atenção ao limite de conexões — usar `?pgbouncer=true` (`DIRECT_URL` para migrations).
- Latência: sem região no Brasil, respostas públicas recebem `Cache-Control` curto e o front usa cache do navegador para planos e prova social.

---

## 14. Próximas fatias (fora deste escopo)

2. Área do aluno completa: aulas, presença, progresso.
3. Painel admin completo: alunos, progresso por dia da semana, relatórios.
4. Assas recorrente/mensalidade.
5. Evolution API e e-mail transacional em produção.
