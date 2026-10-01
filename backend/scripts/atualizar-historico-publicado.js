// Recalcula o "Histórico de Chamados" (13 meses) dos meses já publicados no Vercel Blob,
// sem republicar o restante dos dados (GLPI/SIGPA) nem alterar a data de publicação.
//
// Uso (na pasta backend):
//   node scripts/atualizar-historico-publicado.js            -> simulação, não grava nada
//   node scripts/atualizar-historico-publicado.js --aplicar  -> grava no Blob
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { put, list } = require('@vercel/blob');
const db = require('../db');
const { buscarHistorico, formatarHistorico } = require('../historico');

const APLICAR = process.argv.includes('--aplicar');
const token = process.env.BLOB_READ_WRITE_TOKEN;

const gravar = (pathname, snapshot) => put(pathname, JSON.stringify(snapshot), {
  access: 'public',
  allowOverwrite: true,
  token,
  contentType: 'application/json',
  cacheControlMaxAge: 60
});

const main = async () => {
  console.log(APLICAR ? '== Modo APLICAR: gravando no Blob ==' : '== Simulação (use --aplicar para gravar) ==');

  const blobs = [];
  let cursor;
  do {
    const result = await list({ prefix: 'snapshot/meses/', cursor, token });
    blobs.push(...result.blobs.filter(b => /\d{4}-\d{2}\.json$/.test(b.pathname)));
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));

  let maisRecente = null;
  for (const blob of blobs) {
    const res = await fetch(blob.url, { cache: 'no-store' });
    const snapshot = await res.json();
    const { ano, mes } = snapshot.periodo;

    const historico = formatarHistorico(await buscarHistorico(ano, mes));
    const antes = snapshot.dados.historico || [];
    console.log(`${blob.pathname}: ${antes.length} meses (${antes[0]?.name}..${antes.at(-1)?.name}) -> ${historico.length} meses (${historico[0]?.name}..${historico.at(-1)?.name})`);

    snapshot.dados.historico = historico;
    snapshot.historicoAtualizadoEm = new Date().toISOString();
    if (APLICAR) await gravar(blob.pathname, snapshot);
    maisRecente = snapshot;
  }

  // Arquivo legado espelha o mês mais recente
  if (maisRecente) {
    console.log('snapshot/dados-publicos.json: espelho do mês mais recente');
    if (APLICAR) await gravar('snapshot/dados-publicos.json', maisRecente);
  }

  console.log(APLICAR ? 'Concluído.' : 'Simulação concluída. Nada foi gravado.');
};

main()
  .catch(err => {
    console.error('Erro:', err);
    process.exitCode = 1;
  })
  .finally(() => db.end());
