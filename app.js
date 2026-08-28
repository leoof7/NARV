// ============================================================
// KIT NARV — Entrada no app
//
// A pessoa entra com CELULAR e SENHA.
// Por baixo, o sistema usa um e-mail gerado a partir do celular,
// que ela nunca vê e que nunca recebe mensagem.
// O e-mail de verdade é opcional e serve só para recuperar a conta.
//
// O cadastro é UMA tela. Serviços, preços e meta mensal
// ficam para dentro do app, depois que ela já entrou.
// ============================================================

const sb = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// Vira true quando o login já foi criado mas o negócio ainda não.
// Serve para não tentar criar o login duas vezes se algo falhar no meio.
let loginJaCriado = false;

let temEquipe = false;


// ------------------------------------------------------------
// Celular
// ------------------------------------------------------------

// Deixa só os números. Aceita 10 ou 11 dígitos (com DDD).
function limparCelular(valor) {
  const so = (valor || '').replace(/\D/g, '');
  if (so.length < 10 || so.length > 11) return null;
  return '55' + so;
}

// Vira o e-mail interno do login. A pessoa nunca vê isto.
function loginDoCelular(numero) {
  return 'c' + numero + '@' + CONFIG.DOMINIO_CELULAR;
}

// Escreve bonito enquanto digita: (31) 98842-7315
function formatarCelular(campo) {
  campo.addEventListener('input', () => {
    const d = campo.value.replace(/\D/g, '').slice(0, 11);
    const corte = d.length > 10 ? 7 : 6;
    let saida = d;
    if (d.length > 2) saida = '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length > 6) saida = '(' + d.slice(0, 2) + ') ' + d.slice(2, corte) + '-' + d.slice(corte);
    campo.value = saida;
  });
}

$$('input[data-celular]').forEach(formatarCelular);


// ------------------------------------------------------------
// Tipos de atividade
// ------------------------------------------------------------

const ATIVIDADES = [
  'Manicure e pedicure', 'Cabeleireiro(a)', 'Barbeiro', 'Maquiador(a)', 'Esteticista',
  'Diarista', 'Costureira', 'Jardineiro', 'Motorista', 'Mecânico',
  'Pedreiro', 'Mestre de obras', 'Pintor', 'Eletricista', 'Encanador',
  'Marceneiro', 'Gesseiro', 'Serralheiro', 'Outro'
];

const listaTipos = $('#c-tipo');
ATIVIDADES.forEach(tipo => {
  const op = document.createElement('option');
  op.value = tipo;
  op.textContent = tipo;
  listaTipos.appendChild(op);
});


// ------------------------------------------------------------
// Telas e avisos
// ------------------------------------------------------------

function irPara(id) {
  $$('.tela').forEach(t => t.classList.remove('ativa'));
  $('#' + id).classList.add('ativa');
  window.scrollTo(0, 0);
}

function aviso(id, texto, tipo = 'erro') {
  const el = $('#' + id);
  el.textContent = texto;
  el.className = 'aviso visivel ' + tipo;
}

function limparAviso(id) { $('#' + id).className = 'aviso'; }

function ocupado(botao, sim, textoOcupado = 'Aguarde…') {
  if (sim) {
    botao.dataset.texto = botao.textContent;
    botao.textContent = textoOcupado;
    botao.disabled = true;
  } else {
    botao.textContent = botao.dataset.texto || botao.textContent;
    botao.disabled = false;
  }
}

// Traduz o erro técnico para algo que a pessoa entende
function mensagemDeErro(erro) {
  const m = (erro?.message || '').toLowerCase();
  if (m.includes('invalid login'))       return 'Celular ou senha não conferem. Tente de novo.';
  if (m.includes('already registered') ||
      m.includes('already been registered') ||
      m.includes('user already'))        return 'Este celular já tem conta. Toque em "Já tenho conta".';
  if (m.includes('weak') || m.includes('pwned')) return 'Esta senha é fácil de descobrir. Escolha outra.';
  if (m.includes('password'))            return 'A senha precisa ter pelo menos 8 caracteres.';
  if (m.includes('convite'))             return erro.message;
  if (m.includes('já foi criada'))       return 'Esta conta já está pronta. É só entrar.';
  if (m.includes('failed to fetch'))     return 'Sem conexão com o servidor. Verifique a internet.';
  return 'Não deu certo agora. Tente de novo em instantes.';
}

// Mostrar e esconder senha
$$('.senha-caixa button').forEach(botao => {
  botao.addEventListener('click', () => {
    const campo = botao.previousElementSibling;
    const escondida = campo.type === 'password';
    campo.type = escondida ? 'text' : 'password';
    botao.textContent = escondida ? 'esconder' : 'mostrar';
  });
});


// ------------------------------------------------------------
// 1. ENTRAR
// ------------------------------------------------------------

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  limparAviso('aviso-login');

  const numero = limparCelular($('#login-celular').value);
  if (!numero) return aviso('aviso-login', 'Digite o celular com DDD. Exemplo: (31) 98842-7315');

  const botao = $('#btn-entrar');
  ocupado(botao, true, 'Entrando…');

  const { error } = await sb.auth.signInWithPassword({
    email: loginDoCelular(numero),
    password: $('#login-senha').value
  });

  ocupado(botao, false);
  if (error) return aviso('aviso-login', mensagemDeErro(error));
  await depoisDeEntrar();
});

$('#btn-recuperar').addEventListener('click', () => {
  aviso('aviso-login',
    'Chame a equipe Narv no WhatsApp (31) 97158-9587 para recuperar sua senha. ' +
    'Tenha em mãos o celular cadastrado.', 'ok');
});


// ------------------------------------------------------------
// 2. CRIAR CONTA — tela única
// ------------------------------------------------------------

$$('#escolha-equipe .escolha').forEach(botao => {
  botao.addEventListener('click', () => {
    $$('#escolha-equipe .escolha').forEach(b => b.classList.remove('marcada'));
    botao.classList.add('marcada');
    temEquipe = botao.dataset.equipe === 'sim';
  });
});

$('#form-cadastro').addEventListener('submit', async (e) => {
  e.preventDefault();
  limparAviso('aviso-cadastro');

  const nome = $('#c-nome').value.trim();
  const tipo = listaTipos.value;

  if (!tipo) return aviso('aviso-cadastro', 'Escolha o que você faz.');

  const numero = limparCelular($('#c-celular').value);
  if (!numero) return aviso('aviso-cadastro', 'Digite o celular com DDD. Exemplo: (31) 98842-7315');

  const botao = $('#btn-cadastro');
  ocupado(botao, true, 'Criando sua conta…');

  // Passo A — cria o login, se ainda não existir
  if (!loginJaCriado) {
    const { error } = await sb.auth.signUp({
      email: loginDoCelular(numero),
      password: $('#c-senha').value
    });

    if (error) { ocupado(botao, false); return aviso('aviso-cadastro', mensagemDeErro(error)); }

    const { data } = await sb.auth.getSession();
    if (!data.session) {
      ocupado(botao, false);
      return aviso('aviso-cadastro',
        'Conta criada, mas a sessão não abriu. Desligue "Confirm email" no Supabase.');
    }
    loginJaCriado = true;
  }

  // Passo B — cria o negócio e o perfil
  const { error } = await sb.rpc('criar_conta', {
    p_nome:              nome,
    p_celular:           $('#c-celular').value.trim(),
    p_negocio_nome:      $('#c-negocio').value.trim() || null,
    p_tipo_atividade:    tipo,
    p_tem_equipe:        temEquipe,
    p_email_recuperacao: $('#c-email').value.trim() || null
  });

  ocupado(botao, false);
  if (error) return aviso('aviso-cadastro', mensagemDeErro(error));

  await depoisDeEntrar();
});


// ------------------------------------------------------------
// 3. CONVITE DE EQUIPE
// ------------------------------------------------------------

$('#form-convite').addEventListener('submit', async (e) => {
  e.preventDefault();
  limparAviso('aviso-convite');

  const numero = limparCelular($('#v-celular').value);
  if (!numero) return aviso('aviso-convite', 'Digite o celular com DDD.');

  const botao = $('#btn-convite');
  ocupado(botao, true, 'Entrando…');

  const { error: erroCadastro } = await sb.auth.signUp({
    email: loginDoCelular(numero),
    password: $('#v-senha').value
  });

  if (erroCadastro) {
    ocupado(botao, false);
    return aviso('aviso-convite', mensagemDeErro(erroCadastro));
  }

  const { error } = await sb.rpc('aceitar_convite', {
    p_codigo:            $('#v-codigo').value.trim(),
    p_nome:              $('#v-nome').value.trim(),
    p_celular:           $('#v-celular').value.trim(),
    p_email_recuperacao: null
  });

  ocupado(botao, false);
  if (error) return aviso('aviso-convite', mensagemDeErro(error));
  await depoisDeEntrar();
});


// ------------------------------------------------------------
// 4. DEPOIS DE ENTRAR
// Tela provisória. O painel de Início entra no próximo bloco.
// ------------------------------------------------------------

async function depoisDeEntrar() {
  const { data: perfil } = await sb
    .from('perfis')
    .select('nome, papel, celular, negocios(nome, tipo_atividade)')
    .maybeSingle();

  // Tem login mas o negócio não foi criado: volta para terminar o cadastro
  if (!perfil) {
    loginJaCriado = true;
    $('#campo-senha').style.display = 'none';
    $('#c-senha').removeAttribute('required');
    $('#titulo-cadastro').textContent = 'Falta pouco';
    aviso('aviso-cadastro', 'Seu login já existe. Confirme os dados do negócio para terminar.', 'ok');
    return irPara('tela-cadastro');
  }

  const { count } = await sb
    .from('servicos_catalogo')
    .select('*', { count: 'exact', head: true });

  $('#ok-nome').textContent     = perfil.nome;
  $('#ok-papel').textContent    = perfil.papel === 'dono' ? 'Dono do negócio' : 'Profissional';
  $('#ok-negocio').textContent  = perfil.negocios?.nome || perfil.negocios?.tipo_atividade || '—';
  $('#ok-celular').textContent  = perfil.celular;
  $('#ok-servicos').textContent = (count ?? 0) + ' serviço(s) no catálogo';

  irPara('tela-ok');
}

$('#btn-sair').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.reload();
});


// ------------------------------------------------------------
// 5. NAVEGAÇÃO
// ------------------------------------------------------------

$$('[data-ir]').forEach(el => {
  el.addEventListener('click', () => irPara(el.dataset.ir));
});


// ------------------------------------------------------------
// 6. ABERTURA
// ------------------------------------------------------------

(async function iniciar() {
  const { data } = await sb.auth.getSession();
  if (data.session) await depoisDeEntrar();
})();
