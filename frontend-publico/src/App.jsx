import { useEffect, useState } from 'react';
import { Activity, Database, CheckCircle } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

export default function App() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [hiddenTipos, setHiddenTipos] = useState([]);
  const [hiddenStatus, setHiddenStatus] = useState([]);

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

  const toggleTipo = (e) => {
    const name = e.value;
    setHiddenTipos(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  const toggleStatus = (e) => {
    const name = e.value;
    setHiddenStatus(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

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

  let efetividade = null;
  if (efetividadeData && efetividadeData.length > 0) {
    const resolvidosList = ['fechado', 'fechado (com sucesso)', 'resolvido'];
    const totalStatus = efetividadeData.reduce((acc, curr) => acc + curr.total, 0);
    const resolvidos = efetividadeData
      .filter(i => resolvidosList.includes(i.status.toLowerCase()))
      .reduce((acc, curr) => acc + curr.total, 0);
    const pendentes = totalStatus - resolvidos;
    const percResolvidos = totalStatus > 0 ? ((resolvidos / totalStatus) * 100).toFixed(1) : 0;
    const percPendentes = totalStatus > 0 ? ((pendentes / totalStatus) * 100).toFixed(1) : 0;

    efetividade = {
      total: totalStatus,
      resolvidos,
      pendentes,
      percResolvidos,
      percPendentes
    };
  }

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

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value, name, fill }) => {
    if (value === 0) return null;

    const RADIAN = Math.PI / 180;
    const isVerySmall = percent < 0.05;
    const radiusMultiplier = isVerySmall ? 1.2 + (index * 0.25) : 1.4;
    const yOffset = isVerySmall ? (index * 18) - 30 : 0;

    const radius = innerRadius + (outerRadius - innerRadius) * radiusMultiplier;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN) + yOffset;

    return (
      <text x={x} y={y} fill={fill || "var(--text-primary)"} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="13" fontWeight="600">
        {`${name}: ${value} - (${(percent * 100).toFixed(1)}%)`}
      </text>
    );
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
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '600' }}>{item.name}s</h3>
                <Activity style={{ color: TYPE_COLORS[item.name] }} size={24} />
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

        {/* Charts Container - 2 por linha */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
          
          {/* 1. Gráfico de Pizza - Chamados por Tipo */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px' }}>Chamados por Tipo</div>
            {resumo.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={resumo.map(d => ({ ...d, value: hiddenTipos.includes(d.name) ? 0 : d.value }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={renderCustomizedLabel}
                    labelLine={true}
                  >
                    {resumo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name] || '#10b981'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} onClick={toggleTipo} formatter={renderLegendText} wrapperStyle={{ cursor: 'pointer' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Nenhum dado de chamados encontrado.
              </div>
            )}
          </div>

          {/* 2. Gráfico de Barras - Histórico */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800' }}>
              Histórico de Chamados
            </div>
            {historico && historico.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={historico} margin={{ top: 30, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" axisLine={{ stroke: 'var(--chart-grid)' }} tick={{ fontSize: 10 }} />
                  <YAxis stroke="var(--text-secondary)" axisLine={{ stroke: 'var(--chart-grid)' }} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--hover-overlay)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }}>
                    {historico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#60a5fa" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Sem dados de histórico.
              </div>
            )}
          </div>

          {/* 3. Top 10 Requerentes */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800' }}>
              Top 10 Requerentes
            </div>
            {topRequerentes && topRequerentes.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  layout="vertical" 
                  data={topRequerentes} 
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                  <XAxis type="number" stroke="var(--text-secondary)" axisLine={{ stroke: 'var(--chart-grid)' }} />
                  <YAxis 
                    dataKey="requerente" 
                    type="category" 
                    stroke="var(--text-secondary)" 
                    width={150} 
                    tick={{ fontSize: 9, fill: 'var(--text-primary)' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'var(--hover-overlay)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: 'var(--text-primary)', fontWeight: 600, fontSize: 11 }}>
                    {topRequerentes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TOP_COLORS[index % TOP_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Sem dados de requerentes.
              </div>
            )}
          </div>

          {/* 4. Top 5 Categorias */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800' }}>
              Top 5 Categorias
            </div>
            {topCategorias && topCategorias.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  layout="vertical" 
                  data={topCategorias} 
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                  <XAxis type="number" stroke="var(--text-secondary)" axisLine={{ stroke: 'var(--chart-grid)' }} />
                  <YAxis 
                    dataKey="categoria" 
                    type="category" 
                    stroke="var(--text-secondary)" 
                    width={190} 
                    tick={{ fontSize: 10, fill: 'var(--text-primary)' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'var(--hover-overlay)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: 'var(--text-primary)', fontWeight: 600, fontSize: 11 }}>
                    {topCategorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TOP_COLORS[index % TOP_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Sem dados de categorias.
              </div>
            )}
          </div>

        </div>

        {/* Linha 3: Índice de Efetividade e Status dos Chamados */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
          
          {/* Índice de Efetividade */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px' }}>
              Índice de Efetividade
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {efetividade ? (
                <div style={{ maxWidth: '800px', textAlign: 'center', fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                <p style={{ marginBottom: '24px' }}>
                  O índice de efetividade é a quantidade de chamados entrados/chamados fechados, 
                  resultado do mês de <strong>{periodo.mes ? nomesMeses[periodo.mes - 1] : ''} de {periodo.ano}</strong> foi 
                  <span style={{ color: '#6366f1', fontWeight: 'bold', marginLeft: '6px', marginRight: '6px' }}>{efetividade.percResolvidos}%</span> 
                  com a quantidade de <span style={{ fontWeight: 'bold' }}>{efetividade.resolvidos.toLocaleString('pt-BR')}</span> chamados <span style={{ color: '#10b981', fontWeight: 'bold' }}>RESOLVIDOS</span>.
                </p>
                
                <div style={{ display: 'inline-block', textAlign: 'left', background: 'var(--hover-overlay)', padding: '16px 32px', borderRadius: '12px', marginTop: '8px' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    - PENDENTES - {efetividade.pendentes.toLocaleString('pt-BR')} ({efetividade.percPendentes}%)
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>
                    - RESOLVIDOS - {efetividade.resolvidos.toLocaleString('pt-BR')} ({efetividade.percResolvidos}%)
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>
                Sem dados de efetividade.
              </div>
            )}
            </div>
          </div>

          {/* Status dos Chamados (Pizza) */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px' }}>
              Status dos Chamados
            </div>
            {efetividadeData && efetividadeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={efetividadeData.map(d => ({ name: d.status, value: hiddenStatus.includes(d.status) ? 0 : d.total }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={renderCustomizedLabel}
                    labelLine={true}
                  >
                    {efetividadeData.map((entry, index) => {
                      let color = TOP_COLORS[index % TOP_COLORS.length];
                      const s = entry.status.toLowerCase();
                      if (s.includes('fechado')) color = '#10b981';
                      if (s.includes('resolvido')) color = '#475569';
                      if (s.includes('pendente') || s.includes('novo') || s.includes('em andamento')) color = '#3b82f6';
                      
                      return <Cell key={`cell-${index}`} fill={color} />
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} onClick={toggleStatus} formatter={renderLegendText} wrapperStyle={{ cursor: 'pointer' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Sem dados de status.
              </div>
            )}
          </div>

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
