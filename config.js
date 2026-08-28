// ============================================================
// KIT NARV — Configuração
//
// Estas duas chaves são públicas por natureza. Ficam visíveis no
// navegador de qualquer app do mundo. Quem protege os dados é a
// regra do banco (RLS), não o segredo da chave.
//
// A chave "secret" / "service_role" NUNCA entra aqui.
// ============================================================

const CONFIG = {
  SUPABASE_URL: 'https://rtisqipntpnvlhetfoeb.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_DBUZzakv9rl2sJIbOUOOYg_6Z2OAjec',

  // Domínio interno do login por celular. Nunca recebe e-mail de verdade.
  DOMINIO_CELULAR: 'celular.kitnarv.app'
};
