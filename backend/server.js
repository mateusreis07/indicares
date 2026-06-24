const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const dbSigpa = require('./db-sigpa');
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

    // Calcula as datas de início e fim no JavaScript para passar para o SQL de forma segura
    // endDate: último dia do mês selecionado
    const endDate = new Date(ano, mes, 0, 23, 59, 59);
    // startDate: 1º dia do mês, 11 meses atrás (totalizando 12 meses)
    const startDate = new Date(ano, mes - 12, 1, 0, 0, 0); 
    
    const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')} 23:59:59`;

    let query = `
      SELECT 
        YEAR(\`Data de abertura\`) as ano, 
        MONTH(\`Data de abertura\`) as mes, 
        COUNT(DISTINCT ID) as total 
      FROM glpi.vw_dados_glpi_v2 
      WHERE \`Atribuído - Grupo técnico\` = 'residentes_SAJMP'
        AND \`Data de abertura\` BETWEEN ? AND ?
    `;
    query += ' GROUP BY ano, mes ORDER BY ano ASC, mes ASC';
    
    const [rows] = await db.query(query, [startStr, endStr]);
    res.json(rows);
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

// Nova Rota para Banco SIGPA
app.get('/api/sigpa/dados', verifyToken, async (req, res) => {
  try {
    const { ano, mes } = req.query;
    if (!ano || !mes) return res.status(400).json({ error: 'Ano e mês são obrigatórios' });

    // Período: do mês selecionado do ano anterior até o último dia do mês selecionado no ano atual
    const startDate = new Date(ano - 1, mes - 1, 1, 0, 0, 0);
    const endDate = new Date(ano, mes, 0, 23, 59, 59);

    const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')} 23:59:59`;

    const queries = {
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

    // Execute todas as queries em paralelo
    const [docs, novos, movs, evos] = await Promise.all([
      dbSigpa.query(queries.documentosEmitidos, [startStr, endStr]),
      dbSigpa.query(queries.novosExtrajudiciais, [startStr, endStr]),
      dbSigpa.query(queries.movimentosTaxonomicos, [startStr, endStr]),
      dbSigpa.query(queries.evolucaoPeticionamento, [startStr, endStr])
    ]);

    res.json({
      documentosEmitidos: docs.rows,
      novosExtrajudiciais: novos.rows,
      movimentosTaxonomicos: movs.rows,
      evolucaoPeticionamento: evos.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dados do SIGPA:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do SIGPA' });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
// Reiniciando o servidor para adicionar rota de categorias
