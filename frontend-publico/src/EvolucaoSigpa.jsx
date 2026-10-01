import { useEffect, useState } from 'react';
import { Activity, ArrowLeft, CheckCircle, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import PageHeader from './components/PageHeader';

const BLOB_BASE_URL = 'https://j38yizihjj4fbhb0.public.blob.vercel-storage.com';

// Usada se o snapshot publicado não trouxer a data (publicações antigas)
const DATA_IMPLANTACAO_PADRAO = '2022-09-12';

const NOMES_MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Uma série por gráfico: as escalas dos indicadores são muito diferentes entre si
const INDICADORES = [
  { key: 'documentosEmitidos', titulo: 'Documentos Emitidos', cor: '#3b82f6' },
  { key: 'novosExtrajudiciais', titulo: 'Novos Extrajudiciais', cor: '#6366f1' },
  { key: 'movimentosTaxonomicos', titulo: 'Movimentos Taxonômicos', cor: '#3b82f6' },
  { key: 'evolucaoPeticionamento', titulo: 'Evolução de Peticionamento', cor: '#6366f1' }
];

const TOOLTIP_STYLE = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' };

const fmt = (n) => Number(n).toLocaleString('pt-BR');
const fmtMes = (ano, mes) => `${NOMES_MESES_ABREV[mes - 1]}/${String(ano).slice(2)}`;

// Monta a série mensal contínua (meses sem registro entram como 0) e os agregados
const prepararIndicador = (rows, inicio, ate) => {
  if (!rows || rows.length === 0) return null;

  const porChave = new Map(rows.map(r => [`${Number(r.ano)}-${Number(r.mes)}`, Number(r.quantidade)]));
  const primeiro = inicio.ano * 12 + inicio.mes - 1;
  const ultimo = ate.ano * 12 + ate.mes - 1;

  const serie = [];
  for (let v = primeiro; v <= ultimo; v++) {
    const ano = Math.floor(v / 12);
    const mes = (v % 12) + 1;
    serie.push({ ano, mes, rotulo: fmtMes(ano, mes), quantidade: porChave.get(`${ano}-${mes}`) || 0 });
  }

  const total = serie.reduce((acc, p) => acc + p.quantidade, 0);
  const pico = serie.reduce((max, p) => (p.quantidade > max.quantidade ? p : max), serie[0]);

  const anosMap = new Map();
  serie.forEach(p => anosMap.set(p.ano, (anosMap.get(p.ano) || 0) + p.quantidade));
  const anual = [...anosMap.entries()].map(([ano, totalAno]) => ({
    ano,
    // Ano corrente (ou o de início) incompleto ganha asterisco
    rotulo: (ano === ate.ano && ate.mes < 12) || (ano === serie[0].ano && serie[0].mes > 1) ? `${ano}*` : String(ano),
    total: totalAno
  }));

  return { serie, total, pico, anual, media: Math.round(total / serie.length), inicio: serie[0] };
};

export default function EvolucaoSigpa() {
  // { [painel]: snapshot } — cada painel é publicado separadamente
  const [paineis, setPaineis] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvolucao = async () => {
      const resultados = await Promise.allSettled(INDICADORES.map(async ({ key }) => {
        const res = await fetch(`${BLOB_BASE_URL}/snapshot/evolucao-sigpa/${key}.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Painel ${key} não publicado`);
        return [key, await res.json()];
      }));
      const carregados = Object.fromEntries(resultados.filter(r => r.status === 'fulfilled').map(r => r.value));
      if (Object.keys(carregados).length === 0) {
        setError('A evolução total do SIGPA ainda não foi publicada ou está indisponível no momento.');
      }
      setPaineis(carregados);
      setLoading(false);
    };
    fetchEvolucao();
  }, []);

  const linkVoltar = (
    <a href="#/" className="link-evolucao">
      <ArrowLeft size={18} /> Voltar aos indicadores mensais
    </a>
  );

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Activity size={48} style={{ marginBottom: '16px' }} />
        <h2>Carregando Evolução Total...</h2>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-danger)' }}>Indisponível</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 24px' }}>{error}</p>
        {linkVoltar}
      </div>
    </div>
  );

  const snapshots = Object.values(paineis);
  const implantacao = snapshots[0].implantacao || DATA_IMPLANTACAO_PADRAO;
  const [anoImpl, mesImpl, diaImpl] = implantacao.split('-').map(Number);
  const inicioGeral = { ano: anoImpl, mes: mesImpl };
  const dataImplantacaoFmt = `${String(diaImpl).padStart(2, '0')}/${String(mesImpl).padStart(2, '0')}/${anoImpl}`;
  // Cabeçalho: mês final e atualização mais recentes entre os painéis
  const ate = snapshots.reduce((max, s) => (s.ate.ano * 12 + s.ate.mes > max.ano * 12 + max.mes ? s.ate : max), snapshots[0].ate);
  const publicadoEm = snapshots.reduce((max, s) => (s.publicadoEm > max ? s.publicadoEm : max), snapshots[0].publicadoEm);

  const indicadores = INDICADORES.map(ind => {
    const snap = paineis[ind.key];
    if (!snap) return { ...ind, pendente: true };
    return { ...ind, ate: snap.ate, publicadoEm: snap.publicadoEm, ...prepararIndicador(snap.dados, inicioGeral, snap.ate) };
  });
  const comDados = indicadores.filter(ind => ind.serie);

  return (
    <div className="app-container" style={{ display: 'block', height: 'auto', overflow: 'visible' }}>
      <main className="main-content" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', overflowY: 'visible' }}>

        <PageHeader title="Evolução Total SIGPA">
          <div style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '12px 24px', borderRadius: '16px' }}>
            <div>
              <span style={{ fontSize: '0.9rem', opacity: 0.8, display: 'block' }}>Período</span>
              <strong style={{ fontSize: '1.2rem' }}>
                {fmtMes(inicioGeral.ano, inicioGeral.mes)} a {fmtMes(ate.ano, ate.mes)}
              </strong>
            </div>
            <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' }}></div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.8rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={14} /> Atualizado em
              </span>
              <strong style={{ fontSize: '1rem' }}>{new Date(publicadoEm).toLocaleString('pt-BR')}</strong>
            </div>
          </div>
        </PageHeader>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', marginBottom: '24px', flexWrap: 'wrap' }}>
          <TrendingUp size={24} />
          <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '800' }}>Desde a implantação do sistema ({dataImplantacaoFmt})</h2>
          <div style={{ marginLeft: 'auto' }}>{linkVoltar}</div>
        </div>

        {/* Totais acumulados */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {comDados.map(ind => (
            <div key={ind.key} className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>{ind.titulo}</h3>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {fmt(ind.total)}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>
                total acumulado desde a implantação
              </div>
            </div>
          ))}
        </div>

        {/* Um bloco por indicador: série mensal completa + totais por ano */}
        {indicadores.map(ind => {
          if (!ind.serie) return (
            <section key={ind.key} className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                {ind.titulo}
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>
                {ind.pendente ? 'Evolução deste painel ainda não publicada.' : 'Sem registros no período.'}
              </p>
            </section>
          );

          const ultimoIdx = ind.serie.length - 1;
          const picoIdx = ind.serie.indexOf(ind.pico);
          // Rótulos seletivos: só no pico e no último mês (este omitido se colado ao pico)
          const rotularUltimo = ultimoIdx - picoIdx > 3;
          const renderRotulo = ({ x, y, index, value }) => {
            if (index !== picoIdx && !(index === ultimoIdx && rotularUltimo)) return null;
            return (
              <text key={`rot-${index}`} x={x} y={y - 12} fill="var(--text-primary)" fontSize={11} fontWeight="bold" textAnchor={index === ultimoIdx ? 'end' : 'middle'}>
                {fmt(value)}
              </text>
            );
          };

          return (
            <section key={ind.key} className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <h3 style={{ textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                  {ind.titulo}
                </h3>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span>Média mensal: <strong style={{ color: 'var(--text-primary)' }}>{fmt(ind.media)}</strong></span>
                  <span>Pico: <strong style={{ color: 'var(--text-primary)' }}>{fmt(ind.pico.quantidade)}</strong> em {ind.pico.rotulo}</span>
                  <span>Dados até {fmtMes(ind.ate.ano, ind.ate.mes)} · atualizado em {new Date(ind.publicadoEm).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="evolucao-grid">
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Por mês</div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={ind.serie} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="rotulo" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} minTickGap={24} axisLine={{ stroke: 'var(--chart-grid)' }} />
                      <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} tickFormatter={fmt} axisLine={false} tickLine={false} width={60} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmt(v), ind.titulo]} />
                      <Line type="linear" dataKey="quantidade" stroke={ind.cor} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--bg-secondary)' }} label={renderRotulo} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Total por ano</div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ind.anual} margin={{ top: 30, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="rotulo" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={{ stroke: 'var(--chart-grid)' }} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'var(--hover-overlay)' }} contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmt(v), 'Total no ano']} />
                      <Bar dataKey="total" fill={ind.cor} radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'var(--text-primary)', fontSize: 11, fontWeight: 600, formatter: fmt }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          );
        })}

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
          * Ano parcial: não contempla os 12 meses (ano da implantação ou ano corrente). O mês da implantação conta a partir de {dataImplantacaoFmt}. Cada painel traz dados até o último mês completo na data da sua atualização.
        </p>
      </main>
    </div>
  );
}
