import { useEffect, useState } from 'react';
import { Activity, BarChart3, Users, CheckCircle, Database } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

export default function App() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const TYPE_COLORS = {
    'Incidente': '#3b82f6',
    'Requisição': '#475569'
  };

  const TOP_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57', '#8dd1e1'];

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const res = await fetch('https://j38yizihjj4fbhb0.public.blob.vercel-storage.com/snapshot/dados-publicos.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('Falha ao carregar snapshot público');
        const json = await res.json();
        setSnapshot(json);
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar os dados públicos no momento.');
      } finally {
        setLoading(false);
      }
    };
    fetchSnapshot();
  }, []);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Activity className="lucide lucide-activity" size={48} style={{ animation: 'spin 2s linear infinite', marginBottom: '16px' }} />
        <h2>Carregando Painel Público...</h2>
      </div>
    </div>
  );

  if (error || !snapshot) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center', color: 'var(--accent-danger)' }}>
        <h2>Erro</h2>
        <p>{error}</p>
      </div>
    </div>
  );

  const { periodo, publicadoEm, dados } = snapshot;
  const { resumo, historico, topRequerentes, topCategorias, efetividadeData, sigpa } = dados;

  // Calculos
  const totalGeral = resumo.reduce((acc, curr) => acc + curr.value, 0);

  const formatSigpaTick = (tickItem) => {
    if (!tickItem) return '';
    const [m, y] = tickItem.split('-');
    const nomeMes = nomesMeses[Number(m) - 1].substring(0, 3).toLowerCase();
    return `${nomeMes}/${y.substring(2)}`;
  };

  const renderSigpaLabel = (props) => {
    const { x, y, value } = props;
    return (
      <text x={x} y={y - 12} fill="var(--text-primary)" fontSize={11} textAnchor="middle" fontWeight="bold">
        {Number(value).toLocaleString('pt-BR')}
      </text>
    );
  };

  const renderLegendText = (value, entry) => {
    return <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{value}</span>;
  };

  return (
    <div className="app-container" style={{ gridTemplateColumns: '1fr' }}>
      <main className="main-content" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* Cabeçalho Premium */}
        <div style={{ backgroundColor: 'var(--accent-primary)', color: 'white', padding: '48px 20px', borderRadius: '0 0 32px 32px', textAlign: 'center', margin: '-32px -40px 32px -40px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '2px', margin: '0', textTransform: 'uppercase' }}>
            INDICADORES PÚBLICOS
          </h1>
          <p style={{ opacity: 0.8, fontSize: '1.1rem', marginTop: '8px' }}>
            Time de Experiência N1 - MPPA
          </p>
          <div style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '12px 24px', borderRadius: '16px' }}>
            <div>
              <span style={{ fontSize: '0.9rem', opacity: 0.8, display: 'block' }}>Período Base</span>
              <strong style={{ fontSize: '1.2rem' }}>{nomesMeses[periodo.mes - 1]} de {periodo.ano}</strong>
            </div>
            <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' }}></div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.8rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={14} /> Atualizado em
              </span>
              <strong style={{ fontSize: '1rem' }}>{new Date(publicadoEm).toLocaleString('pt-BR')}</strong>
            </div>
          </div>
        </div>

        {/* --- DADOS GLPI --- */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
          <Database size={24} />
          <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '800' }}>Dados GLPI</h2>
        </div>

        {/* Resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '600' }}>Total Geral</h3>
              <Activity style={{ color: '#6366f1' }} size={24} />
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {totalGeral}
            </div>
          </div>
          {resumo.map((item, index) => (
            <div key={index} className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '600' }}>{item.tipo}s</h3>
                <Activity style={{ color: TYPE_COLORS[item.tipo] }} size={24} />
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                {item.value}
                <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  ({totalGeral > 0 ? ((item.value / totalGeral) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* --- DADOS SIGPA --- */}
        {sigpa && (
          <div style={{ marginTop: '48px', borderTop: '1px solid var(--border-color)', paddingTop: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', marginBottom: '24px' }}>
              <Database size={24} />
              <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '800' }}>Indicadores SIGPA (PostgreSQL)</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Documentos Emitidos */}
              <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>
                  Documentos Emitidos
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sigpa.documentosEmitidos} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="mes_ano" tickFormatter={formatSigpaTick} stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={{ stroke: 'var(--chart-grid)' }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} labelFormatter={formatSigpaTick} />
                    <Line type="linear" dataKey="quantidade" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-secondary)' }} activeDot={{ r: 6 }} label={renderSigpaLabel} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Novos Extrajudiciais */}
              <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>
                  Novos Extrajudiciais
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sigpa.novosExtrajudiciais} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="mes_ano" tickFormatter={formatSigpaTick} stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={{ stroke: 'var(--chart-grid)' }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} labelFormatter={formatSigpaTick} />
                    <Line type="linear" dataKey="quantidade" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-secondary)' }} activeDot={{ r: 6 }} label={renderSigpaLabel} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Movimentos Taxonômicos */}
              <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>
                  Movimentos Taxonômicos
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sigpa.movimentosTaxonomicos} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="mes_ano" tickFormatter={formatSigpaTick} stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={{ stroke: 'var(--chart-grid)' }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} labelFormatter={formatSigpaTick} />
                    <Line type="linear" dataKey="quantidade" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-secondary)' }} activeDot={{ r: 6 }} label={renderSigpaLabel} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Evolução de Peticionamento */}
              <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>
                  Evolução de Peticionamento
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sigpa.evolucaoPeticionamento} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="mes_ano" tickFormatter={formatSigpaTick} stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={{ stroke: 'var(--chart-grid)' }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} labelFormatter={formatSigpaTick} />
                    <Line type="linear" dataKey="quantidade" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-secondary)' }} activeDot={{ r: 6 }} label={renderSigpaLabel} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
