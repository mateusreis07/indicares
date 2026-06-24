const db = require('./db');
async function test() {
  try {
    const [rows] = await db.query("SELECT `Status`, COUNT(DISTINCT ID) FROM vw_dados_glpi_v2 WHERE `Atribuído - Grupo técnico` = 'residentes_SAJMP' GROUP BY `Status`");
    console.log('Status no banco:', rows);
  } catch (e) {
    console.error('Erro:', e);
  } finally {
    process.exit();
  }
}
test();
