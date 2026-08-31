-- ============================================================
-- NARV — Exportar a ESTRUTURA do banco
--
-- POR QUE ISTO EXISTE, E POR QUE É URGENTE
--
-- As migrações 01 a 04 (tabelas, funções e políticas de RLS) foram
-- feitas no chat anterior e NÃO estão no repositório. Só existem a
-- 05, 06 e 07.
--
-- Ou seja: hoje o banco é a ÚNICA cópia da estrutura do NARV.
-- Se ele for apagado ou recriado, perdemos as tabelas, as funções
-- (criar_conta, aceitar_convite, criar_convite, apagar_minha_conta)
-- e todas as regras de segurança.
--
-- RODE ISTO ANTES DE LIMPAR OU RECRIAR QUALQUER COISA.
--
-- COMO USAR
--   1. SQL Editor > New query
--   2. Rode um bloco por vez
--   3. Copie o resultado e salve em docs/migracoes/00-estrutura-atual.sql
--
-- Tudo aqui é só leitura. Não altera nada.
-- ============================================================


-- ------------------------------------------------------------
-- BLOCO 1 — As colunas de todas as tabelas
-- ------------------------------------------------------------
select table_name, ordinal_position, column_name, data_type,
       is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public'
 order by table_name, ordinal_position;


-- ------------------------------------------------------------
-- BLOCO 2 — Chaves, índices e restrições
-- ------------------------------------------------------------
select tablename, indexname, indexdef
  from pg_indexes
 where schemaname = 'public'
 order by tablename, indexname;

select conrelid::regclass as tabela,
       conname            as nome,
       pg_get_constraintdef(oid) as definicao
  from pg_constraint
 where connamespace = 'public'::regnamespace
 order by conrelid::regclass::text, conname;


-- ------------------------------------------------------------
-- BLOCO 3 — As regras de segurança (RLS)
-- Esta é a parte mais difícil de reconstruir de cabeça.
-- ------------------------------------------------------------
select tablename, rowsecurity as rls_ligada
  from pg_tables
 where schemaname = 'public'
 order by tablename;

select schemaname, tablename, policyname, permissive,
       roles, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public'
 order by tablename, policyname;


-- ------------------------------------------------------------
-- BLOCO 4 — O código das funções
-- criar_conta, aceitar_convite, criar_convite, apagar_minha_conta,
-- minha_meta, salvar_minha_meta e o que mais houver.
-- ------------------------------------------------------------
select p.proname as funcao,
       pg_get_functiondef(p.oid) as codigo_completo
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
 order by p.proname;


-- ------------------------------------------------------------
-- BLOCO 5 — Gatilhos e permissões por coluna
-- ------------------------------------------------------------
select event_object_table as tabela, trigger_name, action_timing,
       event_manipulation, action_statement
  from information_schema.triggers
 where trigger_schema = 'public'
 order by tabela, trigger_name;

select table_name, column_name, privilege_type, grantee
  from information_schema.column_privileges
 where table_schema = 'public'
 order by table_name, column_name;


-- ------------------------------------------------------------
-- BLOCO 6 — Os arquivos guardados (Storage)
-- O bucket e as regras dele também somem se o projeto for recriado.
-- ------------------------------------------------------------
select id, name, public, file_size_limit, allowed_mime_types
  from storage.buckets;

select policyname, cmd, qual, with_check
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects';
