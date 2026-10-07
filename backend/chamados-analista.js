const db = require('./db');

// Analistas da equipe (nome de exibição); a comparação com o GLPI ignora maiúsculas e acentos
const ANALISTAS = [
  'Mateus Pereira Reis',
  'Bruna Caroline Castor da Silva',
  'Thiago Silva da Rocha',
  'Jan Roberto de Souza Ramos',
  'Fabricio Andre Bonifacio Cunha'
];
const normalizarNome = (nome) => (nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const PARTICULAS = ['de', 'da', 'do', 'das', 'dos', 'e'];
const capitalizarNome = (nome) => nome.trim().toLowerCase().split(/\s+/)
  .map(p => PARTICULAS.includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))
  .join(' ');

// Chamados por analista no mês: os titulares (mesmo sem chamados) e os suplentes que atenderam no mês
const buscarChamadosPorAnalista = async (ano, mes) => {
  const query = `
    SELECT \`Atribuído - Técnico\` as tecnico, COUNT(DISTINCT ID) as total
    FROM glpi.vw_dados_glpi_v2
    WHERE \`Atribuído - Grupo técnico\` = 'residentes_SAJMP'
      AND YEAR(\`Data de abertura\`) = ? AND MONTH(\`Data de abertura\`) = ?
    GROUP BY \`Atribuído - Técnico\`
  `;
  const [rows] = await db.query(query, [Number(ano), Number(mes)]);

  const totais = new Map();
  for (const row of rows) {
    if (!row.tecnico) continue; // chamado sem técnico atribuído
    const chave = normalizarNome(row.tecnico);
    const atual = totais.get(chave) || { nome: row.tecnico, total: 0 };
    atual.total += row.total;
    totais.set(chave, atual);
  }

  const titulares = ANALISTAS.map(analista => ({ analista, total: totais.get(normalizarNome(analista))?.total || 0, suplente: false }));
  const chavesTitulares = ANALISTAS.map(normalizarNome);
  const suplentes = [...totais.entries()]
    .filter(([chave]) => !chavesTitulares.includes(chave))
    .map(([, { nome, total }]) => ({ analista: capitalizarNome(nome), total, suplente: true }))
    .sort((a, b) => b.total - a.total);

  return [...titulares, ...suplentes];
};

module.exports = { buscarChamadosPorAnalista };
