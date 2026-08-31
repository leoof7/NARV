# NARV — Escopo

Última atualização: 31/08/2026

Este documento é a fonte da verdade sobre o que o NARV é e o que ele não é.
Ideia nova não entra no meio de uma sessão — vira item de "Próxima fase"
aqui, e é discutida depois.

---

## Como chegamos até aqui

Reconstruído a partir do histórico do repositório, porque a conversa em que
o produto foi desenhado aconteceu no claude.ai e não foi preservada.

| Quando | O que entrou |
|---|---|
| 28/08 20:41 | Primeiro esqueleto: `index.html`, `estilo.css`, `config.js`, `app.js`. Cadastro e login. |
| 30/08 13:59 | Login por celular no lugar de e-mail (`app.js`, +53 linhas). |
| 30/08 14:24 | O app inteiro depois de entrar: `painel.js` com 1.001 linhas, cinco abas, folhas. |
| 30/08 14:28 | Ajustes de CSS. |
| 30/08 (local) | Cinco correções feitas mas **ainda não publicadas** no GitHub. |

Onde está publicado: `leoof7.github.io` (GitHub Pages, a partir do
repositório `leoof7/NARV`, público).

---

## O que está pronto e funcionando

**Entrada**
Login com celular e senha. Criar conta em uma tela. Entrar na equipe com
código de convite. Recuperação de senha pelo WhatsApp da equipe Narv.

**Início**
Tutorial de três passos que some sozinho quando as tarefas são feitas. Saldo
do negócio, entradas e saídas do mês, barra da meta, total a receber,
próximos serviços agendados.

**Serviços**
Registrar serviço com cliente, item do catálogo ou avulso, valor, data,
situação (pago / a receber / agendado), forma de pagamento e endereço.
Serviço pago pode virar entrada no financeiro. Tocar num serviço marca como
pago.

**Clientes**
Cadastro com telefone, observação e — opcional — dados de empresa para o PDF
do orçamento. Busca por nome, empresa ou telefone. Perfil com total gasto,
número de atendimentos, serviço mais feito, histórico e botão de WhatsApp.
Botão "Repetir serviço".

**Financeiro** (só o dono vê)
Entradas e saídas, resumo do mês, meta mensal, registro de retirada, últimos
lançamentos.

**Catálogo**
Serviços sugeridos por tipo de atividade (18 profissões cobertas). Edição de
preços em lote. Cadastro de serviço avulso.

**Conta**
Foto de perfil ou logo do negócio. Sair. Apagar a conta com dupla
confirmação.

---

## Bloco entregue em 30-31/08/2026

Tudo abaixo foi escrito **e testado no navegador**, contra o banco real.

1. **Dinheiro** — vírgula decimal, valor zero bloqueado, saldo somado sobre
   todos os registros, saída pessoal e retirada unificadas (ADR-004).
2. **Fuso horário** — `dataLocal()` no lugar de `toISOString()`.
3. **Editar e apagar serviço** — folha própria, com confirmação.
4. **Agenda** — dois modos (lista por dia e calendário do mês), dentro da
   aba Serviços. Ver ADR-006.
5. **Convite de equipe** — Ajustes › Minha equipe, com geração de código.
6. **Interface** — `alert` e `confirm` trocados pelas folhas do app.

**Falta rodar no banco:** migração `05` (dados de empresa do cliente) e `06`
(hora do atendimento). O app detecta sozinho se a `06` já rodou e esconde o
campo de hora enquanto não rodar, em vez de quebrar.

### Ainda pendente do bloco

- Categoria da saída virar lista escolhida (pré-requisito do gráfico)
- `try/catch` geral e `ocupado()` corrigido
- Erro silencioso ao salvar preços
- Campo morto `#c-outra-atividade`
- Confirmação de senha no cadastro
- Validação de data

---

## Bugs conhecidos

Encontrados e comprovados em 30/08/2026, testando o app em navegador.

### Ainda abertos

| # | O quê | Gravidade |
|---|---|---|
| 16 | **A equipe vê a meta do dono.** O profissional não vê lançamentos nem retiradas (conferido), mas lê `negocios.prolabore_valor` — ou seja, quanto o dono quer ganhar por mês. Fere a regra "dinheiro é só do dono". Corrige na RLS por coluna, ou com uma view sem essa coluna para quem não é dono. | Alto |
| 14 | **Dados de empresa do cliente não salvam.** As colunas `empresa`, `responsavel`, `cnpj`, `endereco` e `email` nunca foram criadas em `clientes`, mas o formulário as envia. Quem abre "Dados da empresa" e preenche recebe erro técnico. Corrige com a migração `05`. | Crítico |
| 7 | `ocupado()` chamado duas vezes trava o botão em "Salvando…" para sempre. Testado. | Médio |
| 8 | Salvar preços não checa erro nenhum. Mostra "Preços salvos" mesmo falhando. | Médio |
| 9 | Campo `#c-outra-atividade` existe no HTML e tem zero referências no JavaScript. | Médio |
| 10 | Nenhum `try/catch` no projeto. Queda de rede trava a tela. | Médio |
| 12 | `mt-dia` (dia da retirada) é salvo e nunca usado. | Baixo |
| 13 | Sem validação de data. Serviço pode ser marcado pago com data futura. | Baixo |

### Resolvidos em 30-31/08/2026

Todos corrigidos **e testados no navegador**, contra o banco real.

| # | O quê | Como foi provado |
|---|---|---|
| 1 | Valor com vírgula salvava **R$ 0,00** sem avisar | `150,50` → 150.5 e `1.234,56` → 1234.56 |
| 2 | Saldo só somava os últimos 200 lançamentos | 300 entradas de R$ 100 agora dão R$ 30.000 (davam R$ 20.000) |
| 3 | Não dava para editar nem apagar serviço | Editado e apagado contra o banco, com confirmação em folha |
| 4 | `hoje()` usava UTC e gravava o dia seguinte após as 21h | Às 22h30 do dia 30, grava 30 |
| 5 | Negócio com equipe trancava **todo mundo** para fora, dono incluído | Duas contas reais criadas; ambas entram |
| 6 | Saída pessoal não baixava o saldo | R$ 2.000 − 300 − 200 − 500 = R$ 1.000 (ADR-004) |
| 11 | 8 `alert()` e 3 `confirm()` no painel | Trocados por folhas. Sobrou só o de apagar a conta, exceção proposital |
| 15 | Não existia tela para criar convite | Ajustes › Minha equipe gerou o código `FA71838C` |

---

## Validações que faltam

Valor maior que zero · vírgula decimal · confirmação de senha no cadastro
(crítico, porque a recuperação é manual) · telefone de cliente · CNPJ ·
cliente e serviço duplicados · tamanho da imagem no upload (foto de celular
tem 5–8 MB e o limite grátis é 1 GB no total).

---

## Próxima fase — congelado, não entra agora

- **Orçamentos** — orçamento rápido, calculadora de "quanto quer ganhar
  acima dos custos", PDF e envio pelo WhatsApp. A aba já existe vazia.
- **Gráfico de gastos por categoria** — pedido em 30/08. Depende da
  categoria virar lista, que foi puxada para o bloco atual justamente para o
  dado nascer limpo.
- **Recorrência** — "repetir este atendimento em 15 dias". Hoje o botão
  "Repetir serviço" no perfil do cliente cobre o caso em dois toques.
- **Banco de homologação** — a partir do que estiver em produção. O Leandro
  avisa o dia.
- Editar e arquivar cliente.
- Relatório mensal para imprimir ou mandar.

---

## Limites conhecidos

Medido em 30/08/2026 contra as cotas do plano Free.

O gargalo é **tráfego**, não espaço. Cada ação no app recarrega tudo do
banco: 42 KB para um usuário novo, 236 KB para um com um ano de uso.

| | Usuário novo | Com 1 ano de uso |
|---|---|---|
| Por mês, por prestador | 10,5 MB | 60 MB |
| Cabem no Free (5 GB) | ~485 | ~85 |
| Cabem no Pro, US$ 25 (250 GB) | ~24.000 | ~4.200 |

Em espaço o Free (500 MB) guardaria uns 1.600 prestadores-ano. O limite de
usuários (50.000) não chega perto. Uso real em 30/08: 27 MB de 500 MB,
4 usuários, 0 MB de tráfego.

**Conclusão:** o Free segura o piloto com folga. Ele aperta quando os
primeiros usuários completarem um ano de dados, e a causa é o "recarrega
tudo a cada ação".

**Armadilha do Free:** projeto sem acesso por 7 dias é pausado. Se o piloto
ficar uma semana parado, ninguém entra até despausar.

---

## Decisões de arquitetura (ADR)

### ADR-001 — Arquivos soltos em vez de Next.js
**Quando:** 28/08/2026
**Decisão:** HTML, CSS e JavaScript puro, servidos pelo GitHub Pages, sem
build. Foge do padrão Next.js/Vercel da Lesete.
**Por quê:** piloto que precisa chegar rápido na mão de gente real. Sem
passo de build, não há build para quebrar. Publicar é subir arquivo.
**Custo aceito:** sem componentes, sem verificação automática de tipos, tudo
montado com `innerHTML`, e todo texto precisa passar por `escapar()` na mão.
**Quando revisitar:** quando houver mais de uma pessoa mexendo no código, ou
quando o app passar de umas 3.000 linhas.

### ADR-002 — Login por celular com e-mail fabricado
**Quando:** 30/08/2026
**Decisão:** a pessoa entra com celular e senha. O sistema fabrica
`c55DDNNNNNNNNN@celular.kitnarv.app` para satisfazer o Supabase Auth, que
exige e-mail. E-mail de verdade é opcional, só para recuperação.
**Por quê:** o público não usa e-mail. Pedir e-mail derrubaria o cadastro.
**Custo aceito:** recuperação de senha vira trabalho manual pelo WhatsApp
para quem não deixou e-mail. Torna a confirmação de senha no cadastro
obrigatória — errar a senha significa perder a conta.

### ADR-003 — Preço é cópia congelada no atendimento
**Quando:** 30/08/2026
**Decisão:** o atendimento guarda `servico_nome` e `valor` no momento do
registro, em vez de só apontar para o catálogo.
**Por quê:** mudar o preço hoje não pode reescrever o que foi cobrado mês
passado. O histórico tem que ser o que aconteceu de verdade.
**Custo aceito:** o mesmo nome de serviço fica repetido em muitas linhas.
Irrelevante nesta escala.

### ADR-004 — Todo dinheiro que sai baixa o saldo
**Quando:** 30/08/2026
**Decisão:** saída do negócio, saída pessoal e retirada baixam o caixa
igual. O rótulo "pessoal" existe só para a pessoa ver na lista. Saída
pessoal e retirada contam igual na meta.
**Por quê:** o público não tem conta PJ — a carteira dela é o caixa. O
modelo anterior, em que saída pessoal não baixava nada, fazia o app mostrar
mais dinheiro do que existia na carteira.
**Custo aceito:** o saldo de quem já tinha saídas pessoais registradas vai
diminuir quando isso subir. O número novo é o correto; o antigo estava
inflado.

### ADR-005 — Segurança no banco, não no app
**Quando:** 28/08/2026
**Decisão:** as regras de quem vê o quê vivem no Supabase (RLS e permissões
do Postgres). O app só evita pedir o que sabe que não pode.
**Por quê:** o código roda no navegador e é público. Qualquer pessoa pode
ler e chamar o banco direto. Segurança no app seria teatro.
**Verificado em 30/08:** visitante anônimo recebe `42501 permission denied`
nas 8 tabelas — mais restritivo que RLS sozinha, porque nem chega a
consultar. Falta verificar o isolamento **entre negócios diferentes**, que
exige duas contas de teste.

### ADR-006 — Agenda como modo da aba Serviços, não aba nova
**Quando:** 30/08/2026
**Decisão:** a Agenda é mais um filtro dentro de Serviços, com dois modos
(lista por dia e calendário do mês). Não virou a sexta aba da barra de baixo.
**Por quê:** um serviço com situação "agendado" e data no futuro **já é** um
agendamento — não é dado novo, é visualização. E a barra de baixo já tem
cinco ícones; a sexta aba começaria a espremer os rótulos em celular pequeno.
**Custo aceito:** a Agenda fica um toque mais escondida do que se fosse aba
própria. Se o uso mostrar que ela é a tela mais aberta do dia, vira aba.
**Depende de:** migração 06, que adiciona a coluna `hora`. O app funciona sem
ela — esconde o campo de hora e mostra "—" na lista.
