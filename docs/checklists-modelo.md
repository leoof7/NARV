# Checklists modelo — o que existe no banco e ainda não tem tela

Encontrado em 09/09/2026, ao exportar a estrutura do banco.

As tabelas `checklists`, `checklist_itens` e `atendimento_checklist`
existem desde as migrações 01 a 04, com **conteúdo já escrito e regra de
segurança pensada** — só nunca ganharam tela no app.

Este arquivo guarda o conteúdo, para ele não se perder caso as tabelas
sejam removidas.

## Como foi desenhado

`checklists` com `negocio_id = NULL` são **modelos para todo mundo**.
Quando a pessoa cria o próprio, ele nasce com o `negocio_id` dela.

A regra de segurança já reflete isso:

```sql
-- ver: os modelos globais e os meus
(negocio_id is null) or (negocio_id = meu_negocio_id())

-- criar, alterar e apagar: só os meus
negocio_id = meu_negocio_id()
```

Não é um furo — é a estrutura correta para "modelo global + cópia
personalizada".

## O conteúdo que está lá

### Antes de começar o serviço

1. Combinei o valor com o cliente
2. Combinei o prazo
3. Confirmei quem compra o material
4. Tirei foto do local antes de começar
5. O cliente aprovou o orçamento

### Ao terminar

1. Registrei o serviço no app
2. O cliente conferiu e aprovou
3. Recebi ou combinei o pagamento
4. Tirei foto do resultado
5. Pedi indicação para outros clientes

### Fim do mês

1. Lancei todas as entradas do mês
2. Separei despesa do negócio da pessoal
3. Retirei meu pró-labore
4. Cobrei quem está devendo
5. Conferi o saldo do negócio

## Por que isto tem valor

O conteúdo está no tom certo do produto e resolve problemas reais do
público:

- **"Combinei o valor" e "confirmei quem compra o material"** são as duas
  causas mais comuns de briga com cliente no meio da obra.
- **"Tirei foto do local antes de começar"** é a defesa dela quando o
  cliente diz que algo já estava quebrado.
- **"Pedi indicação"** é como esse público consegue cliente novo.
- A lista de fim do mês é um roteiro do que o app já faz — funcionaria
  como um guia de uso.

Um detalhe que envelheceu: *"Retirei meu pró-labore"* usa a palavra que o
CLAUDE.md manda evitar. Se virar tela, trocar por *"Retirei o meu do mês"*.

## O que faltaria para virar funcionalidade

- Tela de checklist dentro do atendimento, marcando item por item
- Copiar o modelo para `atendimento_checklist` ao abrir um serviço
- Deixar a pessoa criar e editar os próprios

Estimativa: uma tela e meia. Não está no escopo — fica em Próxima fase.
