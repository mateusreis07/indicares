const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const dbSigpa = require('./db-sigpa');
const { buscarHistorico } = require('./historico');
const { buscarChamadosPorAnalista } = require('./chamados-analista');
const { put, list } = require('@vercel/blob');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Rota de Login Mockada (Simples)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  // Mock auth: Em produção, validar contra o banco.
  if (username === 'admin' && password === 'admin') {
    const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, message: 'Login realizado com sucesso!' });
  }
  return res.status(401).json({ error: 'Credenciais inválidas' });
});

// Middleware de autenticação
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'Nenhum token fornecido' });
  
  jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token inválido ou expirado' });
    req.userId = decoded.user;
    next();
  });
};

// Rota de Teste do Banco
app.get('/api/test-db', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ message: 'Conexão com o banco funcionando!', result: rows });
  } catch (error) {
    console.error('Erro no banco:', error);
    res.status(500).json({ error: 'Erro ao conectar no banco' });
  }
});

app.get('/api/chamados/periodos', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        YEAR(\`Data de abertura\`) as ano, 
        MONTH(\`Data de abertura\`) as mes 
      FROM glpi.vw_dados_glpi_v2 
      WHERE \`Data de abertura\` IS NOT NULL
        AND \`Atribuído - Grupo técnico\` = 'residentes_SAJMP'
      ORDER BY ano DESC, mes DESC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar períodos:', error);
    res.status(500).json({ error: 'Erro ao buscar períodos' });
  }
});

app.get('/api/chamados/resumo', verifyToken, async (req, res) => {
  try {
    const sigpaUser = req.headers['x-sigpa-user'];
    const sigpaPassword = req.headers['x-sigpa-password'];
    const { ano, mes } = req.query;
    // Utilizamos COUNT(DISTINCT ID) para evitar duplicação por causa de múltiplos técnicos, 
    // e filtramos pelo grupo 'residentes_SAJMP'
    let query = `
      SELECT \`Status\` as status, COUNT(DISTINCT ID) as total 
      FROM glpi.vw_dados_glpi_v2 
      WHERE \`Atribuído - Grupo técnico\` = 'residentes_SAJMP'
    `;
    const params = [];
    
    if (ano && mes) {
      query += ' AND YEAR(`Data de abertura`) = ? AND MONTH(`Data de abertura`) = ?';
      params.push(Number(ano), Number(mes));
    }
    
    query += ' GROUP BY `Status`';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados' });
  }
});

// Nova Rota para Top 10 Requerentes
app.get('/api/chamados/top-requerentes', verifyToken, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    
    let query = `
      SELECT \`Requerente - Requerente\` as requerente, COUNT(DISTINCT ID) as total 
      FROM glpi.vw_dados_glpi_v2 
      WHERE \`Atribuído - Grupo técnico\` = 'residentes_SAJMP'
        AND \`Requerente - Requerente\` NOT IN (
          'MATEUS PEREIRA REIS', 
          'BRUNA CAROLINE CASTOR DA SILVA', 
          'FABRICIO ANDRE BONIFÁCIO CUNHA', 
          'Thiago Silva da Rocha', 
          'Jan Roberto de Souza Ramos'
        )
    `;
    const params = [];
    
    if (ano && mes) {
      query += ' AND YEAR(`Data de abertura`) = ? AND MONTH(`Data de abertura`) = ?';
      params.push(Number(ano), Number(mes));
    }
    
    query += ' GROUP BY \`Requerente - Requerente\` ORDER BY total DESC LIMIT 10';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar top requerentes:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Nova Rota para Relatório de Tipo
app.get('/api/relatorios/tipo', verifyToken, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    let query = `
      SELECT \`Tipo\` as tipo, COUNT(DISTINCT ID) as total 
      FROM glpi.vw_dados_glpi_v2 
      WHERE \`Atribuído - Grupo técnico\` = 'residentes_SAJMP'
    `;
    const params = [];
    
    if (ano && mes) {
      query += ' AND YEAR(`Data de abertura`) = ? AND MONTH(`Data de abertura`) = ?';
      params.push(Number(ano), Number(mes));
    }
    
    query += ' GROUP BY \`Tipo\`';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar relatorio por tipo:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Nova Rota para Histórico (Últimos 12 meses)
app.get('/api/relatorios/historico', verifyToken, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    if (!ano || !mes) return res.status(400).json({ error: 'Ano e mês são obrigatórios' });

    res.json(await buscarHistorico(ano, mes));
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Nova Rota para Top 5 Categorias
app.get('/api/relatorios/top-categorias', verifyToken, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    let query = `
      SELECT \`Categoria\` as categoria, COUNT(DISTINCT ID) as total 
      FROM glpi.vw_dados_glpi_v2 
      WHERE \`Atribuído - Grupo técnico\` = 'residentes_SAJMP'
    `;
    const params = [];
    
    if (ano && mes) {
      query += ' AND YEAR(`Data de abertura`) = ? AND MONTH(`Data de abertura`) = ?';
      params.push(Number(ano), Number(mes));
    }
    
    query += ' GROUP BY \`Categoria\` ORDER BY total DESC LIMIT 5';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar top categorias:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Rota para Chamados por Analista no mês: os titulares (mesmo sem chamados) e os suplentes que atenderam no mês
app.get('/api/relatorios/chamados-por-analista', verifyToken, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    if (!ano || !mes) return res.status(400).json({ error: 'Ano e mês são obrigatórios' });

    res.json(await buscarChamadosPorAnalista(ano, mes));
  } catch (error) {
    console.error('Erro ao buscar chamados por analista:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Rota para Testar Conexão SIGPA
app.post('/api/sigpa/test-connection', verifyToken, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    
    // Tenta executar uma query simples
    await dbSigpa.runSigpaQuery(username, password, 'SELECT 1 AS result');
    res.json({ success: true, message: 'Conexão bem-sucedida' });
  } catch (error) {
    console.error('Erro no teste do SIGPA:', error.message);
    res.status(401).json({ error: 'Falha na autenticação: ' + error.message });
  }
});

// Nova Rota para Banco SIGPA
// Queries mensais do SIGPA (parâmetros: $1 = início, $2 = fim do período)
const SIGPA_QUERIES = {
  documentosEmitidos: `
    select 	
        to_char(doc.dtfinalizacao, 'MM') 		as mes, 
        to_char(doc.dtfinalizacao, 'YYYY') 	    as ano,
        to_char(doc.dtfinalizacao, 'MM-YYYY')   as mes_ano, 
        count(*)::integer								as quantidade
    from saj.eedtdocemitido doc 
    inner join saj.efmpprocesso proc on doc.cdprocesso = proc.cdprocesso 
    where doc.dtexclusao is null 
    and doc.flmodofinalizacao = 'U' and proc.cdlocal <> '999999'
    and doc.dtfinalizacao >= $1::timestamp and doc.dtfinalizacao <= $2::timestamp
    group by 	to_char(doc.dtfinalizacao, 'MM'),
          to_char(doc.dtfinalizacao, 'YYYY'), 
          to_char(doc.dtfinalizacao, 'MM-YYYY')
    order by 2, 1;
  `,
  novosExtrajudiciais: `
    select 	to_char(p.dtusuinclusao, 'MM') 		as mes, 
        to_char(p.dtusuinclusao, 'YYYY') 	as ano, 
        to_char(p.dtusuinclusao, 'MM-YYYY') as mes_ano, 
        count(*)::integer							as quantidade
    from saj.efmpprocesso p
    where cdtipoprocesso in ('0101','0103', '0601', '0602', '0603', '0604', '0703', '0704','0706','0901')
    and cdlocal <> '999999'
    and cdsituacaoprocesso <> 'C'
    and cdprocesso not like 'MG%'
    and p.dtusuinclusao >= $1::timestamp and p.dtusuinclusao <= $2::timestamp
    group by to_char(p.dtusuinclusao, 'MM'),
        to_char(p.dtusuinclusao, 'YYYY'),
        to_char(p.dtusuinclusao, 'MM-YYYY')
    order by 2, 1;
  `,
  movimentosTaxonomicos: `
    select 
        to_char(procmv.dtmovimento, 'MM')		as mes,
        to_char(procmv.dtmovimento, 'YYYY')		as ano,
        to_char(procmv.dtmovimento, 'MM-YYYY')	as mes_ano,
        count(*)::integer								as quantidade
    from saj.efmpprocessomv procmv
    inner join saj.efmptipomvprocesso tpmv on
    procmv.cdtipomvprocesso = tpmv.cdtipomvprocesso 
    where procmv.cdlocal <> '999999' and 
    (tpmv.cdtipomvext like '9%' or tpmv.cdtipomvextpai like '9%') 
    and procmv.cdusuinclusao <> 'SAJ'
    and procmv.cdtipomvprocesso not in (375, 106, 107)
    and procmv.dtmovimento >= $1::timestamp and procmv.dtmovimento <= $2::timestamp
    group by 
      to_char(procmv.dtmovimento, 'MM'),
      to_char(procmv.dtmovimento, 'YYYY'),
      to_char(procmv.dtmovimento, 'MM-YYYY')
    order by 2, 1;
  `,
  evolucaoPeticionamento: `
    select 
        to_char(pet.dtusuinclusao, 'MM')		as mes,
        to_char(pet.dtusuinclusao, 'YYYY')		as ano,
        to_char(pet.dtusuinclusao, 'MM-YYYY')	as mes_ano,
        count(*)::integer								as quantidade
    from saj.efmppeticionamento pet 
    where flstatus = 2 and demsgerro like '%IP%'
    and pet.dtusuinclusao >= $1::timestamp and pet.dtusuinclusao <= $2::timestamp
    group by 
      to_char(pet.dtusuinclusao, 'MM'),
      to_char(pet.dtusuinclusao, 'YYYY'),
      to_char(pet.dtusuinclusao, 'MM-YYYY')
    order by 2, 1;
  `
};

// Executa as 4 queries do SIGPA em paralelo para o período informado
const buscarIndicadoresSigpa = async (sigpaUser, sigpaPassword, startStr, endStr) => {
  const [docs, novos, movs, evos] = await Promise.all([
    dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, SIGPA_QUERIES.documentosEmitidos, [startStr, endStr]),
    dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, SIGPA_QUERIES.novosExtrajudiciais, [startStr, endStr]),
    dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, SIGPA_QUERIES.movimentosTaxonomicos, [startStr, endStr]),
    dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, SIGPA_QUERIES.evolucaoPeticionamento, [startStr, endStr])
  ]);
  return {
    documentosEmitidos: docs.rows,
    novosExtrajudiciais: novos.rows,
    movimentosTaxonomicos: movs.rows,
    evolucaoPeticionamento: evos.rows
  };
};

app.get('/api/sigpa/dados', verifyToken, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    if (!ano || !mes) return res.status(400).json({ error: 'Ano e mês são obrigatórios' });

    const sigpaUser = req.headers['x-sigpa-user'];
    const sigpaPassword = req.headers['x-sigpa-password'];

    // Período: do mês selecionado do ano anterior até o último dia do mês selecionado no ano atual
    const startDate = new Date(ano - 1, mes - 1, 1, 0, 0, 0);
    const endDate = new Date(ano, mes, 0, 23, 59, 59);

    const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')} 23:59:59`;

    res.json(await buscarIndicadoresSigpa(sigpaUser, sigpaPassword, startStr, endStr));
  } catch (error) {
    console.error('Erro ao buscar dados do SIGPA:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do SIGPA' });
  }
});

// Rota para Publicar Snapshot no Vercel Blob
app.post('/api/publicar', verifyToken, async (req, res) => {
  try {
    const { dados, periodo } = req.body;
    if (!dados || !periodo) {
      return res.status(400).json({ error: 'Dados e período são obrigatórios' });
    }

    const ano = Number(periodo.ano);
    const mes = Number(periodo.mes);
    if (!ano || !mes || mes < 1 || mes > 12) {
      return res.status(400).json({ error: 'Período inválido' });
    }
    const chave = `${ano}-${String(mes).padStart(2, '0')}`;

    const snapshot = {
      periodo: { ano, mes },
      publicadoEm: new Date().toISOString(),
      publicadoPor: req.userId,
      dados
    };

    const blobOptions = {
      access: 'public',
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'application/json',
      cacheControlMaxAge: 60
    };

    // 1. Snapshot do mês (um arquivo por mês, não sobrescreve os outros)
    const { url } = await put(`snapshot/meses/${chave}.json`, JSON.stringify(snapshot), blobOptions);

    // 2. Reconstrói o índice de meses publicados a partir dos arquivos existentes
    const meses = [];
    let cursor;
    do {
      const result = await list({ prefix: 'snapshot/meses/', cursor, token: process.env.BLOB_READ_WRITE_TOKEN });
      for (const blob of result.blobs) {
        const match = blob.pathname.match(/(\d{4})-(\d{2})\.json$/);
        if (match) {
          meses.push({ ano: Number(match[1]), mes: Number(match[2]), chave: `${match[1]}-${match[2]}`, atualizadoEm: blob.uploadedAt });
        }
      }
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);
    if (!meses.some(m => m.chave === chave)) {
      meses.push({ ano, mes, chave, atualizadoEm: snapshot.publicadoEm });
    }
    meses.sort((a, b) => b.chave.localeCompare(a.chave)); // mais recente primeiro

    await put('snapshot/indice.json', JSON.stringify({ atualizadoEm: snapshot.publicadoEm, meses }), blobOptions);

    // 3. Mantém o arquivo legado apontando para o mês mais recente
    if (meses[0].chave === chave) {
      await put('snapshot/dados-publicos.json', JSON.stringify(snapshot), blobOptions);
    }

    console.log(`[PUBLICAR] Snapshot de ${chave} publicado com sucesso: ${url}`);
    res.json({ success: true, url, publicadoEm: snapshot.publicadoEm, chave });
  } catch (error) {
    console.error('Erro ao publicar snapshot:', error);
    res.status(500).json({ error: 'Erro ao publicar dados na nuvem' });
  }
});

// Data de implantação do SIGPA: início da série da Evolução Total
const SIGPA_DATA_IMPLANTACAO = '2022-09-12';

// Rota para Publicar a Evolução Total de UM painel do SIGPA (desde a implantação até o último mês completo).
// Um painel por chamada: cada consulta é longa e rodá-las isoladas evita sobrecarregar a base.
app.post('/api/publicar/evolucao-sigpa/:painel', verifyToken, async (req, res) => {
  const { painel } = req.params;
  if (!Object.hasOwn(SIGPA_QUERIES, painel)) {
    return res.status(400).json({ error: 'Painel inválido' });
  }

  try {
    const sigpaUser = req.headers['x-sigpa-user'];
    const sigpaPassword = req.headers['x-sigpa-password'];

    // Último dia do mês anterior: evita exibir o mês corrente incompleto como queda
    const hoje = new Date();
    const endDate = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    const startStr = `${SIGPA_DATA_IMPLANTACAO} 00:00:00`;
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')} 23:59:59`;

    const inicio = Date.now();
    const result = await dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, SIGPA_QUERIES[painel], [startStr, endStr]);

    const snapshot = {
      painel,
      implantacao: SIGPA_DATA_IMPLANTACAO,
      ate: { ano: endDate.getFullYear(), mes: endDate.getMonth() + 1 },
      publicadoEm: new Date().toISOString(),
      publicadoPor: req.userId,
      dados: result.rows
    };

    const { url } = await put(`snapshot/evolucao-sigpa/${painel}.json`, JSON.stringify(snapshot), {
      access: 'public',
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'application/json',
      cacheControlMaxAge: 60
    });

    console.log(`[PUBLICAR] Evolução total SIGPA (${painel}) publicada em ${((Date.now() - inicio) / 1000).toFixed(1)}s: ${url}`);
    res.json({ success: true, url, publicadoEm: snapshot.publicadoEm });
  } catch (error) {
    console.error(`Erro ao publicar evolução SIGPA (${painel}):`, error);
    res.status(500).json({ error: 'Erro ao publicar evolução total do SIGPA' });
  }
});


// --- ROTAS DO PAINEL DE MONITORAMENTO (EQUIPE) ---

app.get('/api/monitoramento/peticionamento-erro', verifyToken, async (req, res) => {
  try {
    const sigpaUser = req.headers['x-sigpa-user'];
    const sigpaPassword = req.headers['x-sigpa-password'];
    const { dataInicio } = req.query;
    if (!dataInicio) return res.status(400).json({ error: 'dataInicio é obrigatória' });
    
    const query = `
      select pet.tpsistema, loc.delocal, proc.nuprocessoexterno, demsgerro, pet.dtusuinclusao
      from saj.efmppeticionamento pet
      join saj.efmpprocesso proc on proc.cdprocesso = pet.cdprocesso 
      join saj.esajlocal loc on loc.cdlocal = proc.cdlocal 
      where flstatus not in (2, 5)
      and (
      demsgerro = 'Falha ao realizar comunicação com o serviço do MNI do tribunal remoto. Erro: HTTP/1.1 500 Internal Server Error' or
      demsgerro = 'A URL de validação de funcionamento do Tribunal não está respondendo conforme o esperado.' or 
      demsgerro like '%Erro Inesperado: Erro ao enviar documento para o Storage Remoto%' or 
      demsgerro like '%jboss%' or 
      demsgerro like '%Connection Closed Gracefully.%' or
      demsgerro like '%Erro: HTTP%' or
      demsgerro like '%Erro: HTTP/1.1 404 Not Found%' or
      demsgerro like 'O serviço do MNI do tribunal remoto retornou o erro: Não foi possível recuperar o responsável pela Pessoa Jurídica MINISTERIO PUBLICO DO ESTADO DO PARÁ' or
      demsgerro like 'O serviço do MNI do tribunal remoto retornou o erro: Erro ao gravar arquivo no storage.' or
      demsgerro like 'Falha ao realizar comunicação com o serviço do MNI do tribunal remoto. Erro: O tempo limite da operação foi atingido.' or
      demsgerro like 'O serviço do MNI do tribunal remoto retornou o erro: org.jbpm.graph.def.DelegationException: script threw exception' or
      demsgerro like 'O serviço do MNI do tribunal remoto retornou o erro: java.net.UnknownHostException: auth-api-tjpa-auth-prd.apps.oc.i.tj.pa.gov.br: Name or service not known' or
      demsgerro like 'Falha ao realizar comunicação com o serviço do MNI do tribunal remoto. Erro: Invalid HTTP Response: Length is 0' or
      demsgerro like 'Falha ao realizar comunicação com o serviço do MNI do tribunal remoto. Erro: Socket Error # 110
Connection timed out.' or
      demsgerro like 'Falha ao realizar comunicação com o serviço do MNI do tribunal remoto. Erro: error:00000000:lib(0):func(0):reason(0)' or
      demsgerro like 'O serviço do MNI do tribunal remoto retornou o erro: Response status code does not indicate success: 404 (Not Found)' or
      demsgerro like '%contacte%' or
      demsgerro like '%read%' or
      demsgerro like '%Erro ao gravar arquivo no storage.' or
      demsgerro like 'O serviço do MNI do tribunal remoto retornou o erro: Erro ao realizar login via MNI. Stack must not be null' or
      demsgerro like 'O serviço do MNI do tribunal remoto retornou o erro: Erro ao realizar login via MNI. exception invoking: postAuthenticate' or
      demsgerro like '%Softplan.Unj.MniConnector%'or
      demsgerro like 'O serviço do MNI do tribunal remoto retornou o erro: Response status code does not indicate success: 504 (Gateway Time-out).' or
      demsgerro like 'Erro na entrega da petição intermediária do MNI Connector. Detalhes: Connection Closed Gracefully.' or
      demsgerro like '%Response status code does not indicate success: 502 (Bad Gateway).' or
      demsgerro like 'O serviço do MNI do tribunal remoto retornou o erro: [Erro ao validar arquivo online.pdf.p7s. (Unable to acquire JDBC Connection), Erro ao Entregar Manifestacao Processual]' or
      demsgerro like 'Erro na entrega da petição intermediária do MNI Connector. Detalhes: O Connector Softplan.Unj.MniConnector.Entregar.Peticao.Intermediaria.WebApi retornou o erro: Status Code: 500 | Código de Erro: 13009 | Mensagem: O SOAP body de resposta está vazio. | Erro:' or
      demsgerro like 'O serviço do MNI do tribunal remoto retornou o erro: Response status code does not indicate success: 503 (Service Temporarily Unavailable).'
      )
      and pet.dtusuinclusao >= $1::timestamp 
      order by pet.dtusuinclusao desc;
    `;
    
    const result = await dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, query, [`${dataInicio} 00:00:00`]);
    res.json({ rows: result.rows, count: result.rows.length, executedAt: new Date() });
  } catch (error) {
    console.error('Erro na query peticionamento-erro:', error);
    res.status(500).json({ error: 'Erro ao executar consulta' });
  }
});

app.get('/api/monitoramento/intimacao-problema', verifyToken, async (req, res) => {
  try {
    const sigpaUser = req.headers['x-sigpa-user'];
    const sigpaPassword = req.headers['x-sigpa-password'];
    const query = `
      select
        loc.delocal,
        proc.nuprocesso,
        e.nuprocessoexterno,
        e.tpsistema,
        e.deobservacao,
        e.dtusuinclusao
      from saj.efmpintimacao e
      inner join saj.efmpprocesso proc on e.cdprocesso = proc.cdprocesso
      inner join saj.esajlocal loc on proc.cdlocal = loc.cdlocal
      where
        e.deobservacao not like 'Vista recebida com sucesso.' 
        and e.deobservacao not like 'Aguardando Recebimento. Selecione o processo e clique em ""Receber Intimação"".'
        and e.deobservacao not like 'Aguardando Recebimento. Selecione o processo e clique em "Receber Intimação".'
        and e.deobservacao not like 'Processo cadastrado. Aguarde...'
        and e.deobservacao not like 'Sistema recebendo vista do processo. Aguarde...'
        and e.deobservacao not like 'O serviço do MNI do tribunal remoto retornou o erro: Nenhuma comunicação processual localizada.'
        and e.deobservacao not like 'O serviço do MNI do tribunal remoto retornou o erro: [Aviso Pendente não encontrado, Erro ao Consultar Teor da Comunicação.]'
        and e.deobservacao not like 'Aguardando Importação/Geração do Processo.'
        and e.dtusuinclusao > current_date - 15
      order by e.dtusuinclusao desc
    `;
    
    const result = await dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, query);
    res.json({ rows: result.rows, count: result.rows.length, executedAt: new Date() });
  } catch (error) {
    console.error('Erro na query intimacao-problema:', error);
    res.status(500).json({ error: 'Erro ao executar consulta' });
  }
});

app.get('/api/monitoramento/peticionamento-travado', verifyToken, async (req, res) => {
  try {
    const sigpaUser = req.headers['x-sigpa-user'];
    const sigpaPassword = req.headers['x-sigpa-password'];
    const query = `
      select 	proc.nuprocessoexterno, 
          pet.dtusuinclusao, 
          pet.cdusuinclusao, 
          pet.demsgerro
      from saj.efmppeticionamento pet
      join saj.efmpprocesso proc on proc.cdprocesso = pet.cdprocesso
      where pet.flstatus in (9, 0) and pet.dtusuinclusao < CURRENT_TIMESTAMP - interval '5 minutes'
      order by pet.dtusuinclusao desc;
    `;
    
    const result = await dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, query);
    res.json({ rows: result.rows, count: result.rows.length, executedAt: new Date() });
  } catch (error) {
    console.error('Erro na query peticionamento-travado:', error);
    res.status(500).json({ error: 'Erro ao executar consulta' });
  }
});

app.get('/api/monitoramento/fora-fluxo', verifyToken, async (req, res) => {
  try {
    const sigpaUser = req.headers['x-sigpa-user'];
    const sigpaPassword = req.headers['x-sigpa-password'];
    const query = `
      SELECT  PROC.NUPROCESSO 										as "numero_mp",
          PROC.CDTIPOPROCESSO || ' - ' || 
          TIPOPROC.DETIPOPROCESSO 								as "tipo",
          coalesce(REMETENTE.DELOCAL, 'Sem remetente') 			as "remetente",
          LOCAL.DELOCAL  					 						as "destino",
          case 
              when remetente.cdtipolocal = 12 and local.cdtipolocal not in (18, 19, 1, 8, 9)
                  then '659 - Ag. Contrarrazões'
              when remetente.cdtipolocal = 12 and local.cdtipolocal in (18, 19, 1)
            or remetente.cdtipolocal = 9 and local.cdtipolocal <> 8
                then '267 - Encaminhados pelo DAJ'
              when local.cdtipolocal = 7
                then '3 - Recebido'
              when local.cdtipolocal = 1
                then '338 - Encaminhado por Outras Lotações'
              else '6 - Recebido Outras Lotações'
          end 													as "fila_destino",
          date(DIST.DTDISTRIBUICAO)								as "data_distribuicao"
      FROM SAJ.EFMPPROCESSO PROC
      LEFT JOIN SAJ.EFMPDISTPROCESSO DIST ON DIST.CDPROCESSO = PROC.CDPROCESSO
        AND DIST.NUSEQDISTRIB = (
          SELECT MAX(DIST2.NUSEQDISTRIB)
          FROM SAJ.EFMPDISTPROCESSO DIST2
          WHERE DIST2.CDPROCESSO = DIST.CDPROCESSO
        )
      join saj.efmptipodistrib tpdistrib on tpdistrib.cdtipodistrib = dist.cdtipodistrib
      LEFT JOIN SAJ.ESAJLOCAL REMETENTE ON REMETENTE.CDLOCAL = DIST.CDLOCALORIGEM
      JOIN SAJ.ESAJLOCAL LOCAL ON LOCAL.CDLOCAL = PROC.CDLOCAL
      JOIN SAJ.ESAJSITPROCESSO SIT ON SIT.CDSITUACAOPROCESSO = PROC.CDSITUACAOPROCESSO
        AND SIT.CDSITUACAOPROCESSO <> 'C' AND SIT.DESITUACAOPROCESSO NOT IN ('Migrado') 
      JOIN SAJ.EFMPTIPOPROCESSO TIPOPROC ON TIPOPROC.CDTIPOPROCESSO = PROC.CDTIPOPROCESSO
      LEFT JOIN SAJ.EWFLOBJETOFILA OBJETOFILA ON OBJETOFILA.CDOBJETO = PROC.CDOBJETO
        AND OBJETOFILA.CDOBJETOPAI IS null 
      LEFT JOIN SAJ.EWFLFLUXOTRABALHO FLUXO ON FLUXO.CDFLUXOTRABALHO = OBJETOFILA.CDFLUXOTRABALHO
      join saj.esajobjeto obj on obj.cdobjeto = objetofila.cdobjeto
      left join saj.efmpfilainicial filainicial on filainicial.cdtipolocal = local.cdtipolocal
          and filainicial.cdtipoobjeto = obj.cdtipoobjeto
      where obj.nufluxoparalelo = 0 
      and proc.cdprocesso not in (
        select p.cdprocesso 
        from saj.efmpprocesso p
        join saj.ewflobjetofila ob on p.cdprocesso = ob.cdprocesso 
        join saj.esajlocal loc on loc.cdlocal = p.cdlocal 
        where (ob.cdfluxotrabalho in ('947','948','972','973') and loc.cdlocal = '13001' or loc.cdlocal = '12101') or (loc.cdlocal = '999999')
      ) and OBJETOFILA.CDFLUXOTRABALHO NOT IN (
        SELECT INICIAL.CDFLUXOTRABALHO 
        FROM SAJ.EFMPFILAINICIAL INICIAL 
        WHERE INICIAL.CDTIPOLOCAL = OBJETOFILA.CDTIPOLOCAL
      ) OR OBJETOFILA.CDFILA IS null 
      ORDER BY date(DIST.DTDISTRIBUICAO);
    `;
    
    const result = await dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, query);
    res.json({ rows: result.rows, count: result.rows.length, executedAt: new Date() });
  } catch (error) {
    console.error('Erro na query fora-fluxo:', error);
    res.status(500).json({ error: 'Erro ao executar consulta' });
  }
});

app.get('/api/monitoramento/portal-ouvidoria', verifyToken, async (req, res) => {
  try {
    const sigpaUser = req.headers['x-sigpa-user'];
    const sigpaPassword = req.headers['x-sigpa-password'];
    const query = `
      SELECT  
          proc.nuprocesso,  
          tpproc.detipoprocesso as tipo_processo,    
          e2.detipoatendimento as tipo_atendimento,  
          loc.delocal,  
          proc.dtusuinclusao,
          proc.cdusuinclusao
      FROM saj.efmpprocesso proc
      JOIN saj.efmptipoatendimento e2  
          ON e2.cdtipoatendimento = proc.cdtipoatendimento
      JOIN saj.esajlocal loc  
          ON loc.cdlocal = proc.cdlocal
      JOIN saj.efmptipoprocesso tpproc  
          ON tpproc.cdtipoprocesso = proc.cdtipoprocesso
      WHERE
        loc.cdlocal = '6001'  
        AND proc.dtusuinclusao >= CURRENT_DATE - INTERVAL '5 days'
        AND e2.detipoatendimento = 'Formulário Eletrônico'
        order by dtusuinclusao desc
    `;
    
    const result = await dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, query);
    res.json({ rows: result.rows, count: result.rows.length, executedAt: new Date() });
  } catch (error) {
    console.error('Erro na query portal-ouvidoria:', error);
    res.status(500).json({ error: 'Erro ao executar consulta' });
  }
});

app.post('/api/monitoramento/cadastros-alocados', verifyToken, async (req, res) => {
  try {
    const sigpaUser = req.headers['x-sigpa-user'];
    const sigpaPassword = req.headers['x-sigpa-password'];
    const { usuarios } = req.body;
    if (!usuarios || !Array.isArray(usuarios) || usuarios.length === 0) {
      return res.status(400).json({ error: 'Lista de usuários é obrigatória' });
    }

    const query = `
      SELECT	loc.delocal,
        processo.nuprocesso,
        objfila.cdusuario,
        objfila.cdfluxotrabalho as subfluxo,
        objfila.cdfila as fila
      from saj.ewflobjetofila objfila
      INNER JOIN saj.efmpprocesso processo ON processo.cdprocesso = objfila.cdprocesso
      INNER JOIN saj.esajlocal loc ON loc.cdlocal = objfila.cdlocal
      INNER JOIN saj.ewflfluxotrabalho subfluxo on subfluxo.cdfluxotrabalho = objfila.cdfluxotrabalho
      where objfila.cdusuario = ANY($1::text[])
        and loc.cdtipolocal <> 30 
        and subfluxo.cdtipoobjeto <> 6;
    `;
    
    const result = await dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, query, [usuarios]);
    res.json({ rows: result.rows, count: result.rows.length, executedAt: new Date() });
  } catch (error) {
    console.error('Erro na query cadastros-alocados:', error);
    res.status(500).json({ error: 'Erro ao executar consulta' });
  }
});

app.get('/api/monitoramento/intimacoes-vencidas', verifyToken, async (req, res) => {
  try {
    const sigpaUser = req.headers['x-sigpa-user'];
    const sigpaPassword = req.headers['x-sigpa-password'];
    const query = `
      select proc.nuprocesso, loc.delocal, e.dependencia, e.dtvenctoprazo, e.dtcumprimento
      from saj.esajpendenciaprazo e 
      join saj.efmpprocesso proc on proc.cdprocesso = e.cdprocesso 
      join saj.esajlocal loc on loc.cdlocal = proc.cdlocal
      where e.dependencia = 'Intimação'
        and current_date > e.dtvenctoprazo
        and (e.dtcumprimento is null or e.flpendfinalizada = 'N')
    `;
    
    const result = await dbSigpa.runSigpaQuery(sigpaUser, sigpaPassword, query);
    res.json({ rows: result.rows, count: result.rows.length, executedAt: new Date() });
  } catch (error) {
    console.error('Erro na query intimacoes-vencidas:', error);
    res.status(500).json({ error: 'Erro ao executar consulta' });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse na rede local via: http://192.168.250.135:${PORT}`);
});
