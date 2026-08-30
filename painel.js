// ============================================================
// KIT NARV — O app depois de entrar
// Abas: Início · Serviços · Orçamentos · Clientes · Financeiro
// ============================================================

const estado = {
  perfil: null,
  negocio: null,
  catalogo: [],
  clientes: [],
  atendimentos: [],
  lancamentos: [],
  retiradas: [],
  clienteAberto: null
};

const hoje = () => new Date().toISOString().slice(0, 10);
const inicioDoMes = () => new Date().toISOString().slice(0, 8) + '01';

function moeda(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataCurta(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return d + '/' + m + '/' + a.slice(2);
}

function iniciais(nome) {
  return (nome || '?').trim().split(/\s+/).slice(0, 2)
    .map(p => p[0]).join('').toUpperCase();
}


// ------------------------------------------------------------
// Carregar tudo do banco
// ------------------------------------------------------------

async function carregarTudo() {
  const { data: perfil } = await sb
    .from('perfis')
    .select('id, nome, papel, celular, foto_caminho, negocio_id, ' +
            'negocios(id, nome, tipo_atividade, tem_equipe, prolabore_valor, prolabore_dia, logo_caminho)')
    .maybeSingle();

  if (!perfil) return false;

  estado.perfil  = perfil;
  estado.negocio = perfil.negocios;

  const ehDono = perfil.papel === 'dono';

  const [cat, cli, ate] = await Promise.all([
    sb.from('servicos_catalogo').select('*').eq('ativo', true).order('nome'),
    sb.from('clientes').select('*').eq('arquivado', false).order('nome'),
    sb.from('atendimentos').select('*, clientes(nome)').order('data', { ascending: false }).limit(200)
  ]);

  estado.catalogo     = cat.data || [];
  estado.clientes     = cli.data || [];
  estado.atendimentos = ate.data || [];

  // Dinheiro só o dono enxerga. A regra está no banco; aqui só evitamos pedir.
  if (ehDono) {
    const [lan, ret] = await Promise.all([
      sb.from('lancamentos').select('*').order('data', { ascending: false }).limit(200),
      sb.from('retiradas').select('*').order('data', { ascending: false }).limit(200)
    ]);
    estado.lancamentos = lan.data || [];
    estado.retiradas   = ret.data || [];
  }

  return true;
}


// ------------------------------------------------------------
// Contas do mês
// ------------------------------------------------------------

function resumo() {
  const de = inicioDoMes();

  const entradasMes = estado.lancamentos
    .filter(l => l.tipo === 'entrada' && l.data >= de)
    .reduce((s, l) => s + Number(l.valor), 0);

  const despesasMes = estado.lancamentos
    .filter(l => l.tipo === 'despesa' && l.natureza === 'negocio' && l.data >= de)
    .reduce((s, l) => s + Number(l.valor), 0);

  const retiradoMes = estado.retiradas
    .filter(r => r.data >= de)
    .reduce((s, r) => s + Number(r.valor), 0);

  const entradasTudo = estado.lancamentos
    .filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0);
  const despesasTudo = estado.lancamentos
    .filter(l => l.tipo === 'despesa' && l.natureza === 'negocio')
    .reduce((s, l) => s + Number(l.valor), 0);
  const retiradoTudo = estado.retiradas.reduce((s, r) => s + Number(r.valor), 0);

  const aReceber = estado.atendimentos
    .filter(a => a.situacao === 'realizado' || a.situacao === 'pendente')
    .reduce((s, a) => s + Number(a.valor), 0);

  const proximos = estado.atendimentos
    .filter(a => a.situacao === 'agendado' && a.data >= hoje())
    .sort((a, b) => a.data.localeCompare(b.data));

  return {
    entradasMes, despesasMes, retiradoMes, aReceber, proximos,
    saldo: entradasTudo - despesasTudo - retiradoTudo,
    meta: Number(estado.negocio?.prolabore_valor || 0)
  };
}


// ------------------------------------------------------------
// Navegação entre abas
// ------------------------------------------------------------

function abrirAba(nome) {
  $$('.aba').forEach(a => a.classList.toggle('ativa', a.id === 'aba-' + nome));
  $$('.abas button').forEach(b => b.classList.toggle('ativa', b.dataset.aba === nome));
  $('#titulo-aba').textContent = {
    inicio: 'Início', servicos: 'Serviços', orcamentos: 'Orçamentos',
    clientes: 'Clientes', financeiro: 'Financeiro'
  }[nome];
  window.scrollTo(0, 0);
  desenhar();
}

$$('.abas button').forEach(b => {
  b.addEventListener('click', () => abrirAba(b.dataset.aba));
});


// ------------------------------------------------------------
// Folhas (janelas que sobem de baixo)
// ------------------------------------------------------------

function abrirFolha(id) { $('#' + id).classList.add('aberta'); }
function fecharFolha(id) { $('#' + id).classList.remove('aberta'); }

$$('[data-fecha]').forEach(b => {
  b.addEventListener('click', () => fecharFolha(b.dataset.fecha));
});

$$('.folha').forEach(f => {
  f.addEventListener('click', (e) => { if (e.target === f) f.classList.remove('aberta'); });
});


// ------------------------------------------------------------
// Desenhar as telas
// ------------------------------------------------------------

function desenhar() {
  desenharCabecalho();
  desenharInicio();
  desenharServicos();
  desenharClientes();
  desenharFinanceiro();
}

function desenharCabecalho() {
  const av = $('#avatar');
  av.textContent = iniciais(estado.perfil?.nome);
  if (estado.urlImagem) av.innerHTML = '<img src="' + estado.urlImagem + '" alt="">';
}

// ---------- INÍCIO ----------

function desenharInicio() {
  const r = resumo();
  const ehDono = estado.perfil.papel === 'dono';
  let h = '';

  // Tutorial: some sozinho quando as três tarefas estiverem feitas
  const tem = {
    servicos: estado.catalogo.length > 0,
    cliente:  estado.clientes.length > 0,
    servico:  estado.atendimentos.length > 0
  };

  if (!(tem.servicos && tem.cliente && tem.servico)) {
    h += '<div class="cartao"><p class="rotulo">Primeiros passos</p>' +
         '<ul class="passos">' +
         passo(tem.servicos, 'Cadastre seus serviços e preços', 'ir-catalogo') +
         passo(tem.cliente,  'Cadastre seu primeiro cliente',   'ir-cliente') +
         passo(tem.servico,  'Registre um serviço feito',       'ir-servico') +
         '</ul></div>';
  }

  if (ehDono) {
    h += '<div class="cartao destaque"><p class="rotulo">Saldo do negócio</p>' +
         '<p class="valor">' + moeda(r.saldo) + '</p></div>';

    h += '<div class="dupla">' +
         '<div class="cartao"><p class="rotulo">Entradas do mês</p>' +
         '<p class="valor verde">' + moeda(r.entradasMes) + '</p></div>' +
         '<div class="cartao"><p class="rotulo">Saídas do mês</p>' +
         '<p class="valor laranj">' + moeda(r.despesasMes) + '</p></div></div>';

    if (r.meta > 0) {
      const pct = Math.min(100, (r.retiradoMes / r.meta) * 100);
      const estourou = r.retiradoMes > r.meta;
      h += '<button class="cartao" data-ir-aba="financeiro">' +
           '<p class="rotulo">Sua meta do mês</p>' +
           '<p class="valor">' + moeda(r.retiradoMes) + ' <span style="font-size:17px;color:#5A6472">de ' + moeda(r.meta) + '</span></p>' +
           '<div class="barra' + (estourou ? ' estourou' : '') + '"><i style="width:' + pct + '%"></i></div>' +
           (estourou ? '<p class="rotulo" style="margin-top:8px">Você já retirou mais do que planejou este mês.</p>' : '') +
           '</button>';
    } else {
      h += '<button class="cartao" data-ir-aba="financeiro">' +
           '<p class="rotulo">Sua meta do mês</p>' +
           '<p class="valor" style="font-size:19px">Definir quanto quero receber</p></button>';
    }
  }

  const qtdReceber = estado.atendimentos
    .filter(a => a.situacao === 'realizado' || a.situacao === 'pendente').length;

  h += '<button class="cartao" data-ir-aba="servicos"><p class="rotulo">A receber</p>' +
       '<p class="valor laranj">' + moeda(r.aReceber) + '</p>' +
       '<p class="rotulo" style="margin:6px 0 0">' + qtdReceber + ' serviço(s) sem pagamento</p></button>';

  if (r.proximos.length) {
    h += '<p class="secao-titulo">Próximos serviços</p>';
    r.proximos.slice(0, 4).forEach(a => { h += linhaAtendimento(a); });
  }

  $('#aba-inicio').innerHTML = h;

  $$('#aba-inicio [data-ir-aba]').forEach(b =>
    b.addEventListener('click', () => abrirAba(b.getAttribute('data-ir-aba'))));
  ligarListas('#aba-inicio');

  const atalhos = {
    'ir-catalogo': () => abrirCatalogo(),
    'ir-cliente':  () => abrirFormCliente(),
    'ir-servico':  () => abrirFormServico()
  };
  Object.keys(atalhos).forEach(id => {
    const el = $('#' + id);
    if (el) el.addEventListener('click', atalhos[id]);
  });
}

function passo(feito, texto, id) {
  return '<li class="' + (feito ? 'feito' : '') + '">' +
         '<div class="bolinha">' + (feito ? '✓' : '') + '</div>' +
         (feito ? '<span>' + texto + '</span>'
                : '<button id="' + id + '" style="background:none;border:none;padding:0;' +
                  'font:inherit;color:#14357F;text-align:left;cursor:pointer;text-decoration:underline">' +
                  texto + '</button>') + '</li>';
}

// ---------- SERVIÇOS ----------

function linhaAtendimento(a) {
  const et = a.situacao === 'pago' ? 'et-pago'
           : a.situacao === 'agendado' ? 'et-agendado' : 'et-pendente';
  const rotulo = { pago: 'Pago', agendado: 'Agendado',
                   realizado: 'A receber', pendente: 'A receber' }[a.situacao];
  return '<button class="item" data-atendimento="' + a.id + '"><div class="corpo">' +
         '<span class="titulo">' + escapar(a.clientes?.nome || 'Sem cliente') + '</span>' +
         '<span class="sub">' + escapar(a.servico_nome) + ' · ' + dataCurta(a.data) + '</span>' +
         '<span class="etiqueta ' + et + '">' + rotulo + '</span>' +
         '</div><div class="direita">' + moeda(a.valor) + '</div></button>';
}

function desenharServicos() {
  const lista = estado.atendimentos;
  if (!lista.length) {
    $('#aba-servicos').innerHTML =
      '<div class="vazio"><strong>Nenhum serviço registrado</strong>' +
      'Toque no botão + para registrar o primeiro.</div>';
    return;
  }
  $('#aba-servicos').innerHTML = lista.map(linhaAtendimento).join('');
  ligarListas('#aba-servicos');
}

// ---------- CLIENTES ----------

function desenharClientes() {
  const busca = ($('#busca-cliente')?.value || '').toLowerCase();
  const lista = estado.clientes.filter(c =>
    !busca || c.nome.toLowerCase().includes(busca) || (c.telefone || '').includes(busca));

  let h = '<div class="campo"><input id="busca-cliente" type="search" ' +
          'placeholder="Buscar por nome ou telefone" value="' + escapar(busca) + '"></div>';

  if (!estado.clientes.length) {
    h += '<div class="vazio"><strong>Nenhum cliente ainda</strong>' +
         'Toque no botão + para cadastrar o primeiro.</div>';
  } else if (!lista.length) {
    h += '<div class="vazio"><strong>Ninguém encontrado</strong>Tente outro nome.</div>';
  } else {
    lista.forEach(c => {
      const ats = estado.atendimentos.filter(a => a.cliente_id === c.id);
      h += '<button class="item" data-cliente="' + c.id + '"><div class="corpo">' +
           '<span class="titulo">' + escapar(c.nome) + '</span>' +
           '<span class="sub">' + (ats.length ? ats.length + ' atendimento(s)' : 'Sem atendimentos') + '</span>' +
           '</div><div class="direita">›</div></button>';
    });
  }

  $('#aba-clientes').innerHTML = h;

  ligarListas('#aba-clientes');

  const campo = $('#busca-cliente');
  campo.addEventListener('input', () => {
    const v = campo.value; desenharClientes();
    const novo = $('#busca-cliente'); novo.value = v; novo.focus();
  });
}

// ---------- FINANCEIRO ----------

function desenharFinanceiro() {
  if (estado.perfil.papel !== 'dono') {
    $('#aba-financeiro').innerHTML =
      '<div class="vazio"><strong>Área do dono</strong>' +
      'O financeiro do negócio não fica visível para a equipe.</div>';
    return;
  }

  const r = resumo();
  let h = '<div class="dupla">' +
    '<button class="cartao" id="btn-entrada" style="background:#E6F2EC;border-color:#BFDDCE">' +
    '<p class="valor verde" style="font-size:19px">Entrada</p>' +
    '<p class="rotulo" style="margin:4px 0 0">Registrar dinheiro que entrou</p></button>' +
    '<button class="cartao" id="btn-saida" style="background:#FDECE3;border-color:#F5CDB4">' +
    '<p class="valor laranj" style="font-size:19px">Saída</p>' +
    '<p class="rotulo" style="margin:4px 0 0">Registrar dinheiro que saiu</p></button></div>';

  h += '<p class="secao-titulo">Resumo do mês</p>';
  h += resumoLinha('Entradas', r.entradasMes, 'verde');
  h += resumoLinha('Saídas do negócio', r.despesasMes, 'laranj');
  h += resumoLinha('Retirado por você', r.retiradoMes, '');
  h += resumoLinha('A receber', r.aReceber, 'laranj');
  h += resumoLinha('Saldo do negócio', r.saldo, 'verde');

  h += '<p class="secao-titulo">Sua meta mensal</p>';
  h += '<button class="cartao" id="btn-meta">' +
       '<p class="rotulo">Quanto você gostaria de receber por mês</p>' +
       '<p class="valor">' + (r.meta > 0 ? moeda(r.meta) : 'Não definido') + '</p>' +
       '<p class="rotulo" style="margin:8px 0 0">Toque para ' + (r.meta > 0 ? 'alterar' : 'definir') + '</p></button>';

  if (r.meta > 0) {
    h += '<button class="btn btn-secundario" id="btn-retirada">Registrar retirada</button>';
  }

  const ultimos = estado.lancamentos.slice(0, 15);
  if (ultimos.length) {
    h += '<p class="secao-titulo">Últimos lançamentos</p>';
    ultimos.forEach(l => {
      const ent = l.tipo === 'entrada';
      h += '<div class="item"><div class="corpo">' +
           '<span class="titulo">' + escapar(l.categoria || (ent ? 'Entrada' : 'Saída')) + '</span>' +
           '<span class="sub">' + dataCurta(l.data) +
           (l.natureza ? ' · ' + (l.natureza === 'negocio' ? 'do negócio' : 'pessoal') : '') +
           '</span></div><div class="direita ' + (ent ? 'verde' : 'laranj') + '">' +
           (ent ? '+' : '−') + ' ' + moeda(l.valor) + '</div></div>';
    });
  }

  $('#aba-financeiro').innerHTML = h;

  $('#btn-entrada').addEventListener('click', () => abrirFormLancamento('entrada'));
  $('#btn-saida').addEventListener('click',   () => abrirFormLancamento('despesa'));
  $('#btn-meta').addEventListener('click',    abrirMeta);
  const br = $('#btn-retirada');
  if (br) br.addEventListener('click', abrirRetirada);
}

function resumoLinha(rotulo, valor, cor) {
  return '<div class="item"><div class="corpo"><span class="titulo">' + rotulo + '</span></div>' +
         '<div class="direita ' + cor + '">' + moeda(valor) + '</div></div>';
}

function escapar(t) {
  return String(t ?? '').replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}


// ------------------------------------------------------------
// Botão + Novo
// ------------------------------------------------------------

$('#fab').addEventListener('click', () => abrirFolha('folha-novo'));

$('#novo-servico').addEventListener('click',  () => { fecharFolha('folha-novo'); abrirFormServico(); });
$('#novo-cliente').addEventListener('click',  () => { fecharFolha('folha-novo'); abrirFormCliente(); });
$('#nova-entrada').addEventListener('click',  () => { fecharFolha('folha-novo'); abrirFormLancamento('entrada'); });
$('#nova-saida').addEventListener('click',    () => { fecharFolha('folha-novo'); abrirFormLancamento('despesa'); });


// ------------------------------------------------------------
// Formulário: cliente
// ------------------------------------------------------------

function abrirFormCliente() {
  $('#cl-nome').value = '';
  $('#cl-telefone').value = '';
  $('#cl-obs').value = '';
  limparAviso('aviso-cliente');
  abrirFolha('folha-cliente');
  setTimeout(() => $('#cl-nome').focus(), 200);
}

$('#form-cliente').addEventListener('submit', async (e) => {
  e.preventDefault();
  const botao = $('#btn-salvar-cliente');
  ocupado(botao, true, 'Salvando…');

  const { error } = await sb.from('clientes').insert({
    negocio_id: estado.perfil.negocio_id,
    nome: $('#cl-nome').value.trim(),
    telefone: $('#cl-telefone').value.trim() || null,
    observacao: $('#cl-obs').value.trim() || null
  });

  ocupado(botao, false);
  if (error) return aviso('aviso-cliente', mensagemDeErro(error));

  fecharFolha('folha-cliente');
  await recarregar();
  abrirAba('clientes');
});


// ------------------------------------------------------------
// Formulário: serviço
// ------------------------------------------------------------

function abrirFormServico() {
  if (!estado.clientes.length) {
    alert('Cadastre um cliente primeiro.');
    return abrirFormCliente();
  }

  $('#sv-cliente').innerHTML = estado.clientes
    .map(c => '<option value="' + c.id + '">' + escapar(c.nome) + '</option>').join('');

  $('#sv-servico').innerHTML =
    (estado.catalogo.length
      ? estado.catalogo.map(s =>
          '<option value="' + s.id + '" data-preco="' + (s.preco_atual ?? '') + '">' +
          escapar(s.nome) + '</option>').join('')
      : '') + '<option value="">Outro serviço…</option>';

  $('#sv-outro-nome').value = '';
  $('#sv-valor').value = estado.catalogo[0]?.preco_atual ?? '';
  $('#sv-data').value = hoje();
  $('#sv-endereco').value = '';
  marcarPastilha('#sv-situacao', 'pago');
  marcarPastilha('#sv-pagamento', 'Dinheiro');
  atualizarCampoOutro();
  limparAviso('aviso-servico');
  abrirFolha('folha-servico');
}

function atualizarCampoOutro() {
  const usaOutro = $('#sv-servico').value === '';
  $('#campo-outro').style.display = usaOutro ? 'block' : 'none';
  $('#sv-outro-nome').required = usaOutro;
}

$('#sv-servico').addEventListener('change', () => {
  const op = $('#sv-servico').selectedOptions[0];
  const preco = op?.dataset.preco;
  if (preco) $('#sv-valor').value = preco;
  atualizarCampoOutro();
});

function marcarPastilha(seletor, valor) {
  $$(seletor + ' button').forEach(b =>
    b.classList.toggle('marcada', b.dataset.valor === valor));
}

function valorPastilha(seletor) {
  return $(seletor + ' button.marcada')?.dataset.valor || null;
}

$$('.pastilhas').forEach(grupo => {
  grupo.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    Array.from(grupo.children).forEach(x => x.classList.remove('marcada'));
    b.classList.add('marcada');
  });
});

$('#form-servico').addEventListener('submit', async (e) => {
  e.preventDefault();
  const botao = $('#btn-salvar-servico');
  ocupado(botao, true, 'Salvando…');

  const servicoId = $('#sv-servico').value || null;
  const nomeServico = servicoId
    ? estado.catalogo.find(s => s.id === servicoId)?.nome
    : $('#sv-outro-nome').value.trim();

  const situacao = valorPastilha('#sv-situacao') || 'realizado';
  const valor = Number($('#sv-valor').value || 0);

  const { data: novo, error } = await sb.from('atendimentos').insert({
    negocio_id: estado.perfil.negocio_id,
    cliente_id: $('#sv-cliente').value,
    servico_id: servicoId,
    profissional_id: estado.perfil.id,
    criado_por: estado.perfil.id,
    tipo: 'rapido',
    servico_nome: nomeServico,   // cópia congelada
    valor: valor,                // cópia congelada
    data: $('#sv-data').value || hoje(),
    endereco: $('#sv-endereco').value.trim() || null,
    forma_pagamento: valorPastilha('#sv-pagamento'),
    situacao: situacao
  }).select().single();

  ocupado(botao, false);
  if (error) return aviso('aviso-servico', mensagemDeErro(error));

  fecharFolha('folha-servico');

  // Serviço pago vira entrada no Financeiro, se a pessoa quiser
  if (situacao === 'pago' && estado.perfil.papel === 'dono' && valor > 0) {
    if (confirm('Deseja registrar a entrada de ' + moeda(valor) + ' no Financeiro?')) {
      await sb.from('lancamentos').insert({
        negocio_id: estado.perfil.negocio_id,
        criado_por: estado.perfil.id,
        tipo: 'entrada',
        valor: valor,
        data: novo.data,
        categoria: nomeServico,
        cliente_id: novo.cliente_id,
        atendimento_id: novo.id,
        forma_pagamento: novo.forma_pagamento
      });
    }
  }

  await recarregar();
  abrirAba('servicos');
});


// ------------------------------------------------------------
// Formulário: entrada e saída
// ------------------------------------------------------------

function abrirFormLancamento(tipo) {
  $('#lc-tipo').value = tipo;
  $('#titulo-lancamento').textContent = tipo === 'entrada' ? 'Entrada' : 'Saída';
  $('#lc-valor').value = '';
  $('#lc-data').value = hoje();
  $('#lc-categoria').value = '';
  $('#lc-obs').value = '';
  $('#campo-natureza').style.display = tipo === 'despesa' ? 'block' : 'none';
  marcarPastilha('#lc-natureza', 'negocio');
  $('#btn-salvar-lancamento').className = 'btn ' + (tipo === 'entrada' ? 'btn-verde' : 'btn-principal');
  limparAviso('aviso-lancamento');
  abrirFolha('folha-lancamento');
  setTimeout(() => $('#lc-valor').focus(), 200);
}

$('#form-lancamento').addEventListener('submit', async (e) => {
  e.preventDefault();
  const botao = $('#btn-salvar-lancamento');
  const tipo = $('#lc-tipo').value;
  ocupado(botao, true, 'Salvando…');

  const { error } = await sb.from('lancamentos').insert({
    negocio_id: estado.perfil.negocio_id,
    criado_por: estado.perfil.id,
    tipo: tipo,
    valor: Number($('#lc-valor').value || 0),
    data: $('#lc-data').value || hoje(),
    categoria: $('#lc-categoria').value.trim() || null,
    natureza: tipo === 'despesa' ? (valorPastilha('#lc-natureza') || 'negocio') : null,
    observacao: $('#lc-obs').value.trim() || null
  });

  ocupado(botao, false);
  if (error) return aviso('aviso-lancamento', mensagemDeErro(error));

  fecharFolha('folha-lancamento');
  await recarregar();
  abrirAba('financeiro');
});


// ------------------------------------------------------------
// Meta mensal e retirada
// ------------------------------------------------------------

function abrirMeta() {
  $('#mt-valor').value = estado.negocio?.prolabore_valor ?? '';
  $('#mt-dia').value   = estado.negocio?.prolabore_dia ?? '';
  limparAviso('aviso-meta');
  abrirFolha('folha-meta');
}

$('#form-meta').addEventListener('submit', async (e) => {
  e.preventDefault();
  const botao = $('#btn-salvar-meta');
  ocupado(botao, true, 'Salvando…');

  const v = $('#mt-valor').value, d = $('#mt-dia').value;
  const { error } = await sb.from('negocios').update({
    prolabore_valor: v === '' ? null : Number(v),
    prolabore_dia:   d === '' ? null : Number(d)
  }).eq('id', estado.perfil.negocio_id);

  ocupado(botao, false);
  if (error) return aviso('aviso-meta', mensagemDeErro(error));

  fecharFolha('folha-meta');
  await recarregar();
});

function abrirRetirada() {
  $('#rt-valor').value = estado.negocio?.prolabore_valor ?? '';
  $('#rt-data').value = hoje();
  marcarPastilha('#rt-tipo', 'prolabore');
  limparAviso('aviso-retirada');
  abrirFolha('folha-retirada');
}

$('#form-retirada').addEventListener('submit', async (e) => {
  e.preventDefault();
  const botao = $('#btn-salvar-retirada');
  ocupado(botao, true, 'Salvando…');

  const { error } = await sb.from('retiradas').insert({
    negocio_id: estado.perfil.negocio_id,
    tipo: valorPastilha('#rt-tipo') || 'prolabore',
    valor: Number($('#rt-valor').value || 0),
    data: $('#rt-data').value || hoje()
  });

  ocupado(botao, false);
  if (error) return aviso('aviso-retirada', mensagemDeErro(error));

  fecharFolha('folha-retirada');
  await recarregar();
});


// ------------------------------------------------------------
// Ajustes
// ------------------------------------------------------------

$('#avatar').addEventListener('click', () => {
  $('#aj-nome').textContent = estado.perfil.nome;
  $('#aj-papel').textContent = estado.perfil.papel === 'dono' ? 'Dono do negócio' : 'Profissional';
  $('#aj-negocio').textContent = estado.negocio?.nome || estado.negocio?.tipo_atividade || '';
  $('#aj-qtd-servicos').textContent = estado.catalogo.length + ' cadastrado(s)';
  abrirFolha('folha-ajustes');
});

$('#aj-catalogo').addEventListener('click', () => { fecharFolha('folha-ajustes'); abrirCatalogo(); });
$('#aj-imagem').addEventListener('click',  () => { fecharFolha('folha-ajustes'); abrirFolha('folha-imagem'); });

$('#aj-sair').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.reload();
});

$('#aj-apagar').addEventListener('click', async () => {
  if (!confirm('Isto apaga sua conta, seus clientes, serviços e todo o financeiro. Não tem volta. Continuar?')) return;
  if (prompt('Para confirmar, digite APAGAR em letras maiúsculas:') !== 'APAGAR') return;

  const { error } = await sb.rpc('apagar_minha_conta');
  if (error) return alert('Não deu certo: ' + error.message);
  alert('Conta apagada.');
  localStorage.clear();
  location.reload();
});


// ------------------------------------------------------------
// Catálogo de serviços e preços
// ------------------------------------------------------------

function abrirCatalogo() {
  desenharCatalogo();
  abrirFolha('folha-catalogo');
}

function desenharCatalogo() {
  let h = '';

  if (!estado.catalogo.length) {
    const sug = SERVICOS_SUGERIDOS[estado.negocio?.tipo_atividade] || [];
    if (sug.length) {
      h += '<p style="color:#5A6472;margin:0 0 14px">Estes são os serviços mais comuns de ' +
           escapar(estado.negocio.tipo_atividade).toLowerCase() +
           '. Desmarque o que você não faz e coloque quanto cobra.</p>';
      sug.forEach((nome, i) => {
        h += '<div class="servico-linha marcada">' +
             '<input type="checkbox" id="sg' + i + '" checked>' +
             '<label class="nome" for="sg' + i + '">' + escapar(nome) + '</label>' +
             '<input class="preco" type="number" inputmode="decimal" min="0" step="0.01" placeholder="R$">' +
             '</div>';
      });
      h += '<button class="btn btn-verde" id="btn-salvar-sugeridos">Salvar meus serviços</button>';
    }
    h += '<button class="btn btn-secundario" id="btn-novo-servico-catalogo">Cadastrar outro serviço</button>';
  } else {
    estado.catalogo.forEach(s => {
      h += '<div class="item"><div class="corpo">' +
           '<span class="titulo">' + escapar(s.nome) + '</span>' +
           '<span class="sub">Preço alterado em ' + dataCurta(s.atualizado_em) + '</span></div>' +
           '<input class="preco" type="number" inputmode="decimal" min="0" step="0.01" ' +
           'data-servico="' + s.id + '" value="' + (s.preco_atual ?? '') + '"></div>';
    });
    h += '<button class="btn btn-principal" id="btn-salvar-precos">Salvar preços</button>';
    h += '<button class="btn btn-secundario" id="btn-novo-servico-catalogo">Cadastrar outro serviço</button>';
  }

  $('#conteudo-catalogo').innerHTML = h;

  const bs = $('#btn-salvar-sugeridos');
  if (bs) bs.addEventListener('click', salvarSugeridos);

  const bp = $('#btn-salvar-precos');
  if (bp) bp.addEventListener('click', salvarPrecos);

  $('#btn-novo-servico-catalogo').addEventListener('click', novoServicoCatalogo);

  $$('#conteudo-catalogo .servico-linha input[type=checkbox]').forEach(c =>
    c.addEventListener('change', () =>
      c.closest('.servico-linha').classList.toggle('marcada', c.checked)));
}

async function salvarSugeridos() {
  const botao = $('#btn-salvar-sugeridos');
  ocupado(botao, true, 'Salvando…');

  const linhas = [];
  $$('#conteudo-catalogo .servico-linha').forEach(l => {
    if (!l.querySelector('input[type=checkbox]').checked) return;
    const p = l.querySelector('.preco').value;
    linhas.push({
      negocio_id: estado.perfil.negocio_id,
      nome: l.querySelector('.nome').textContent,
      preco_atual: p === '' ? null : Number(p)
    });
  });

  if (!linhas.length) { ocupado(botao, false); return alert('Marque pelo menos um serviço.'); }

  const { error } = await sb.from('servicos_catalogo').insert(linhas);
  ocupado(botao, false);
  if (error) return alert(mensagemDeErro(error));

  await recarregar();
  desenharCatalogo();
}

async function salvarPrecos() {
  const botao = $('#btn-salvar-precos');
  ocupado(botao, true, 'Salvando…');

  for (const campo of $$('#conteudo-catalogo input[data-servico]')) {
    const id = campo.dataset.servico;
    const atual = estado.catalogo.find(s => s.id === id)?.preco_atual;
    const novo = campo.value === '' ? null : Number(campo.value);
    if (Number(atual ?? NaN) === Number(novo ?? NaN)) continue;
    await sb.from('servicos_catalogo').update({ preco_atual: novo }).eq('id', id);
  }

  ocupado(botao, false);
  await recarregar();
  desenharCatalogo();
  alert('Preços salvos. Os serviços antigos continuam com o valor de antes.');
}

async function novoServicoCatalogo() {
  const nome = prompt('Nome do serviço:');
  if (!nome || !nome.trim()) return;
  const preco = prompt('Quanto você cobra? (só o número, pode deixar vazio)');

  const { error } = await sb.from('servicos_catalogo').insert({
    negocio_id: estado.perfil.negocio_id,
    nome: nome.trim(),
    preco_atual: preco && preco.trim() !== '' ? Number(preco.replace(',', '.')) : null
  });

  if (error) return alert(mensagemDeErro(error));
  await recarregar();
  desenharCatalogo();
}


// ------------------------------------------------------------
// Foto de perfil ou logo do negócio
// ------------------------------------------------------------

$('#form-imagem').addEventListener('submit', async (e) => {
  e.preventDefault();
  const arquivo = $('#img-arquivo').files[0];
  if (!arquivo) return aviso('aviso-imagem', 'Escolha uma imagem.');

  const ehLogo = valorPastilha('#img-tipo') === 'logo';
  if (ehLogo && estado.perfil.papel !== 'dono')
    return aviso('aviso-imagem', 'Só o dono do negócio pode trocar a logo.');

  const botao = $('#btn-salvar-imagem');
  ocupado(botao, true, 'Enviando…');

  const ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase();
  const caminho = estado.perfil.negocio_id + '/' +
    (ehLogo ? 'logo.' + ext : 'perfil-' + estado.perfil.id + '.' + ext);

  const { error: erroUp } = await sb.storage
    .from('imagens').upload(caminho, arquivo, { upsert: true });

  if (erroUp) { ocupado(botao, false); return aviso('aviso-imagem', mensagemDeErro(erroUp)); }

  const { error } = ehLogo
    ? await sb.from('negocios').update({ logo_caminho: caminho }).eq('id', estado.perfil.negocio_id)
    : await sb.from('perfis').update({ foto_caminho: caminho }).eq('id', estado.perfil.id);

  ocupado(botao, false);
  if (error) return aviso('aviso-imagem', mensagemDeErro(error));

  fecharFolha('folha-imagem');
  await recarregar();
});

async function carregarImagem() {
  const caminho = estado.perfil?.foto_caminho || estado.negocio?.logo_caminho;
  if (!caminho) { estado.urlImagem = null; return; }

  const { data } = await sb.storage.from('imagens').createSignedUrl(caminho, 3600);
  estado.urlImagem = data?.signedUrl || null;
}


// ------------------------------------------------------------
// Recarregar e abrir
// ------------------------------------------------------------

async function recarregar() {
  await carregarTudo();
  await carregarImagem();
  desenhar();
}

async function abrirApp() {
  const ok = await carregarTudo();
  if (!ok) return false;
  await carregarImagem();
  $$('.tela').forEach(t => t.classList.remove('ativa'));
  $('.app').style.display = 'none';   // some com a área de login, senão sobra espaço em branco
  $('#painel').classList.add('ativo');
  abrirAba('inicio');
  return true;
}


// ------------------------------------------------------------
// Partida
// ------------------------------------------------------------

iniciar();


// ------------------------------------------------------------
// Cliques nas listas
// ------------------------------------------------------------

function ligarListas(area) {
  $$(area + ' [data-cliente]').forEach(b =>
    b.addEventListener('click', () => abrirPerfilCliente(b.dataset.cliente)));

  $$(area + ' [data-atendimento]').forEach(b =>
    b.addEventListener('click', () => abrirAtendimento(b.dataset.atendimento)));
}


// ------------------------------------------------------------
// Perfil do cliente
// ------------------------------------------------------------

function abrirPerfilCliente(id) {
  const c = estado.clientes.find(x => x.id === id);
  if (!c) return;
  estado.clienteAberto = c;

  const ats = estado.atendimentos
    .filter(a => a.cliente_id === id)
    .sort((a, b) => b.data.localeCompare(a.data));

  const total = ats.reduce((s, a) => s + Number(a.valor), 0);
  const ultimo = ats[0];

  const contagem = {};
  ats.forEach(a => { contagem[a.servico_nome] = (contagem[a.servico_nome] || 0) + 1; });
  const favorito = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a])[0];

  let h = '<div class="cartao"><p class="valor" style="font-size:24px">' + escapar(c.nome) + '</p>';
  if (c.telefone) h += '<p class="rotulo" style="margin:6px 0 0">' + escapar(c.telefone) + '</p>';
  if (c.observacao) h += '<p class="rotulo" style="margin:6px 0 0">' + escapar(c.observacao) + '</p>';
  h += '</div>';

  h += '<div class="dupla">' +
       '<div class="cartao"><p class="rotulo">Atendimentos</p><p class="valor">' + ats.length + '</p></div>' +
       '<div class="cartao"><p class="rotulo">Total gasto</p><p class="valor verde" style="font-size:19px">' +
       moeda(total) + '</p></div></div>';

  if (ultimo) {
    h += '<div class="cartao"><p class="rotulo">Último atendimento</p>' +
         '<p class="valor" style="font-size:19px">' + escapar(ultimo.servico_nome) + '</p>' +
         '<p class="rotulo" style="margin:6px 0 0">' + dataCurta(ultimo.data) + ' · ' + moeda(ultimo.valor) + '</p>' +
         (favorito ? '<p class="rotulo" style="margin:6px 0 0">Serviço mais feito: ' + escapar(favorito) + '</p>' : '') +
         '</div>';
  }

  if (c.telefone) {
    const so = c.telefone.replace(/\D/g, '');
    const numero = so.length > 11 ? so : '55' + so;
    h += '<a class="btn btn-verde" style="text-decoration:none" target="_blank" rel="noopener" ' +
         'href="https://wa.me/' + numero + '">Abrir conversa no WhatsApp</a>';
  }

  h += '<button class="btn btn-principal" id="pf-repetir">Repetir serviço</button>';

  if (ats.length) {
    h += '<p class="secao-titulo">Histórico</p>';
    ats.forEach(a => { h += linhaAtendimento(a); });
  } else {
    h += '<div class="vazio">Nenhum serviço registrado para este cliente.</div>';
  }

  $('#conteudo-perfil').innerHTML = h;
  abrirFolha('folha-perfil');

  $('#pf-repetir').addEventListener('click', () => {
    fecharFolha('folha-perfil');
    abrirFormServico();
    $('#sv-cliente').value = c.id;
    if (ultimo?.servico_id) {
      $('#sv-servico').value = ultimo.servico_id;
      $('#sv-servico').dispatchEvent(new Event('change'));
    }
  });

  ligarListas('#conteudo-perfil');
}


// ------------------------------------------------------------
// Tocar num serviço: marcar como pago
// ------------------------------------------------------------

async function abrirAtendimento(id) {
  const a = estado.atendimentos.find(x => x.id === id);
  if (!a) return;

  if (a.situacao === 'pago') {
    return alert(a.servico_nome + '\n' + (a.clientes?.nome || '') +
                 '\n' + dataCurta(a.data) + '\n' + moeda(a.valor) + '\nJá está pago.');
  }

  if (!confirm('Marcar como pago?\n\n' + a.servico_nome + ' · ' + moeda(a.valor))) return;

  const { error } = await sb.from('atendimentos')
    .update({ situacao: 'pago' }).eq('id', id);

  if (error) return alert(mensagemDeErro(error));

  if (estado.perfil.papel === 'dono' && Number(a.valor) > 0) {
    if (confirm('Deseja registrar a entrada de ' + moeda(a.valor) + ' no Financeiro?')) {
      await sb.from('lancamentos').insert({
        negocio_id: estado.perfil.negocio_id,
        criado_por: estado.perfil.id,
        tipo: 'entrada',
        valor: a.valor,
        data: hoje(),
        categoria: a.servico_nome,
        cliente_id: a.cliente_id,
        atendimento_id: a.id,
        forma_pagamento: a.forma_pagamento
      });
    }
  }

  fecharFolha('folha-perfil');
  await recarregar();
}
