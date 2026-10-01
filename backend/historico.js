const db = require('./db');

const NOMES_MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Histórico de chamados: do mesmo mês no ano anterior até o mês selecionado (13 meses, ex.: set/25 a set/26)
const buscarHistorico = async (ano, mes) => {
  ano = Number(ano);
  mes = Number(mes);

  // Calcula as datas de início e fim no JavaScript para passar para o SQL de forma segura
  const startDate = new Date(ano - 1, mes - 1, 1, 0, 0, 0);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);

  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
  const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')} 23:59:59`;

  const query = `
    SELECT
      YEAR(\`Data de abertura\`) as ano,
      MONTH(\`Data de abertura\`) as mes,
      COUNT(DISTINCT ID) as total
    FROM glpi.vw_dados_glpi_v2
    WHERE \`Atribuído - Grupo técnico\` = 'residentes_SAJMP'
      AND \`Data de abertura\` BETWEEN ? AND ?
    GROUP BY ano, mes ORDER BY ano ASC, mes ASC
  `;

  const [rows] = await db.query(query, [startStr, endStr]);
  return rows;
};

// Mesmo formato que o frontend grava no snapshot publicado: [{ name: 'set/25', total }]
const formatarHistorico = (rows) => rows.map(item => ({
  name: `${NOMES_MESES_ABREV[item.mes - 1]}/${String(item.ano).slice(2)}`,
  total: item.total
}));

module.exports = { buscarHistorico, formatarHistorico };
