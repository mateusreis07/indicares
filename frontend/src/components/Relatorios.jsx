import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, LogOut, LayoutDashboard, BarChart3, Users, Printer } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

export default function Relatorios() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [historicoData, setHistoricoData] = useState([]);
  const [topRequerentes, setTopRequerentes] = useState([]);
  const [topCategorias, setTopCategorias] = useState([]);
  const [efetividadeData, setEfetividadeData] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState({ ano: '', mes: '' });
  const [loading, setLoading] = useState(false);
  const [sigpaData, setSigpaData] = useState(null);
  const [loadingSigpa, setLoadingSigpa] = useState(false);

  // Estados para controle de fatias ocultas
  const [hiddenTipos, setHiddenTipos] = useState([]);
  const [hiddenStatus, setHiddenStatus] = useState([]);

  const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Cores personalizadas: Azul para Incidente, Cinza Escuro para Requisição
  const TYPE_COLORS = {
    'Incidente': '#3b82f6', // Azul
    'Requisição': '#475569' // Cinza
  };

  const TOP_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57', '#8dd1e1'];

  useEffect(() => {
    const fetchPeriodos = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('http://localhost:3333/api/chamados/periodos', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const result = await res.json();
          setPeriodos(result);
          if (result.length > 0) {
            setSelectedPeriod({ ano: result[0].ano, mes: result[0].mes });
          }
        } else if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } catch (e) {
        console.error('Erro ao buscar períodos', e);
      }
    };
    fetchPeriodos();
  }, []);

  const fetchReportData = async () => {
    if (!selectedPeriod.ano || !selectedPeriod.mes) return;
    
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const resPizza = await fetch(`http://localhost:3333/api/relatorios/tipo?ano=${selectedPeriod.ano}&mes=${selectedPeriod.mes}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resHistorico = await fetch(`http://localhost:3333/api/relatorios/historico?ano=${selectedPeriod.ano}&mes=${selectedPeriod.mes}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resTopReq = await fetch(`http://localhost:3333/api/chamados/top-requerentes?ano=${selectedPeriod.ano}&mes=${selectedPeriod.mes}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resTopCat = await fetch(`http://localhost:3333/api/relatorios/top-categorias?ano=${selectedPeriod.ano}&mes=${selectedPeriod.mes}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resResumo = await fetch(`http://localhost:3333/api/chamados/resumo?ano=${selectedPeriod.ano}&mes=${selectedPeriod.mes}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (resPizza.ok) {
        const resultPizza = await resPizza.json();
        const chartData = resultPizza
          .filter(item => item.tipo)
          .map(item => ({
            name: item.tipo,
            value: item.total
          }));
        setData(chartData);
      } else if (resPizza.status === 401 || resPizza.status === 403) {
        handleLogout();
      }

      if (resHistorico.ok) {
        const resultHistorico = await resHistorico.json();
        const nomesMesesAbrev = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
        const formatHistorico = resultHistorico.map(item => ({
          name: `${nomesMesesAbrev[item.mes - 1]}/${String(item.ano).slice(2)}`,
          total: item.total
        }));
        setHistoricoData(formatHistorico);
      }

      if (resTopReq.ok) {
        const resultTopReq = await resTopReq.json();
        setTopRequerentes(resultTopReq);
      } else {
        setTopRequerentes([]);
      }

      if (resTopCat.ok) {
        const resultTopCat = await resTopCat.json();
        setTopCategorias(resultTopCat);
      } else {
        setTopCategorias([]);
      }

      if (resResumo.ok) {
        const resultResumo = await resResumo.json();
        setEfetividadeData(resultResumo);
      } else {
        setEfetividadeData([]);
      }
    } catch (e) {
      console.error('Erro ao buscar dados', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSigpaData = async () => {
    if (!selectedPeriod.ano || !selectedPeriod.mes) return;
    setLoadingSigpa(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3333/api/sigpa/dados?ano=${selectedPeriod.ano}&mes=${selectedPeriod.mes}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setSigpaData(result);
      } else {
        setSigpaData(null);
      }
    } catch (e) {
      console.error('Erro ao buscar dados do SIGPA', e);
    } finally {
      setLoadingSigpa(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Calcula o total para as porcentagens
  const totalGeral = data.reduce((acc, curr) => acc + curr.value, 0);

  // Custom Label para o PieChart mostrar a %
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value, name, fill }) => {
    if (value === 0) return null; // Não renderiza nada se o item foi ocultado

    const RADIAN = Math.PI / 180;
    
    // ... restante da função ...
    // Lógica para evitar sobreposição quando as fatias são minúsculas (ex: 2 chamados vs 1400)
    // Multiplica o index de forma progressiva para criar uma "escada" garantida, independentemente de quantos itens pequenos existam
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

  const toggleTipo = (e) => {
    const name = e.value;
    setHiddenTipos(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleStatus = (e) => {
    const name = e.value;
    setHiddenStatus(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const renderLegendText = (value) => {
    const isHidden = hiddenTipos.includes(value) || hiddenStatus.includes(value);
    return <span style={{ 
      color: isHidden ? 'var(--text-secondary)' : 'var(--text-primary)', 
      textDecoration: isHidden ? 'line-through' : 'none',
      opacity: isHidden ? 0.5 : 1,
      transition: '0.2s',
      cursor: 'pointer'
    }}>{value}</span>;
  };

  const getEfetividade = () => {
    if (efetividadeData.length === 0) return null;
    let resolvidos = 0;
    let pendentes = 0;
    efetividadeData.forEach(item => {
      const s = item.status.toLowerCase();
      // Resolvido = Fechado + Resolvido
      if (s.includes('fechado') || s.includes('resolvido')) {
        resolvidos += item.total;
      } 
      // Pendente = Pendente + Em andamento
      else if (s.includes('pendente') || s.includes('em andamento')) {
        pendentes += item.total;
      }
    });
    const total = resolvidos + pendentes;
    if (total === 0) return null;
    
    const percResolvidos = ((resolvidos / total) * 100).toFixed(1).replace('.', ',');
    const percPendentes = ((pendentes / total) * 100).toFixed(1).replace('.', ',');
    
    return { resolvidos, pendentes, total, percResolvidos, percPendentes };
  };

  const efetividade = getEfetividade();

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

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Activity color="var(--accent-primary)" />
          <span>Indicadores</span>
        </div>
        
        <ul className="nav-menu">
          <Link to="/" className="nav-item" style={{ textDecoration: 'none' }}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link to="/relatorios" className="nav-item active" style={{ textDecoration: 'none' }}>
            <BarChart3 size={20} /> Relatórios
          </Link>
          <a href="#" className="nav-item" style={{ textDecoration: 'none' }}>
            <Users size={20} /> Equipe
          </a>
        </ul>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="nav-item" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'white',
          padding: '48px 20px',
          borderRadius: '0 0 32px 32px',
          textAlign: 'center',
          margin: '-32px -40px 32px -40px',
          position: 'relative',
          boxShadow: 'var(--glass-shadow)'
        }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Indicadores
          </h1>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '2px' }}>
            {selectedPeriod.mes && selectedPeriod.ano ? `${nomesMeses[selectedPeriod.mes - 1]} ${selectedPeriod.ano}` : 'Carregando...'}
          </h2>
          <p style={{ fontSize: '1.25rem', fontWeight: '500', opacity: 0.9 }}>
            Time de Experiência N1 - MPPA
          </p>

          <div className="print-hide" style={{ 
            position: 'absolute', 
            top: '24px', 
            right: '40px',
            padding: '8px 16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>Filtro de Mês:</span>
            <select 
              value={`${selectedPeriod.ano}-${selectedPeriod.mes}`}
              onChange={(e) => {
                const [ano, mes] = e.target.value.split('-');
                setSelectedPeriod({ ano: Number(ano), mes: Number(mes) });
              }}
              style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '4px 8px', color: 'white', outline: 'none', cursor: 'pointer' }}
            >
              {periodos.map(p => (
                <option key={`${p.ano}-${p.mes}`} value={`${p.ano}-${p.mes}`} style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                  {nomesMeses[p.mes - 1]} / {p.ano}
                </option>
              ))}
            </select>
            
            <button 
              onClick={() => window.print()}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '700',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)' }}
            >
              <Printer size={16} /> PDF
            </button>
            <button 
              onClick={fetchReportData}
              style={{
                background: 'white',
                color: 'var(--accent-primary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '700',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseOver={(e) => { e.target.style.opacity = '0.9'; e.target.style.transform = 'scale(1.02)' }}
              onMouseOut={(e) => { e.target.style.opacity = '1'; e.target.style.transform = 'scale(1)' }}
            >
              {loading ? 'Buscando...' : 'Buscar Dados'}
            </button>
          </div>
        </div>

        {/* Charts Container - 2 por linha */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
          
          {/* 1. Gráfico de Pizza - Chamados por Tipo */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px' }}>Chamados por Tipo</div>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={data.map(d => ({ ...d, value: hiddenTipos.includes(d.name) ? 0 : d.value }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={renderCustomizedLabel}
                    labelLine={true}
                  >
                    {data.map((entry, index) => (
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
                Nenhum dado carregado. Selecione o período.
              </div>
            )}
          </div>

          {/* 2. Gráfico de Barras - Histórico */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800' }}>
              Histórico de Chamados
            </div>
            {historicoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={historicoData} margin={{ top: 30, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="mes" stroke="var(--text-secondary)" axisLine={{ stroke: 'var(--chart-grid)' }} tick={{ fontSize: 10 }} />
                  <YAxis stroke="var(--text-secondary)" axisLine={{ stroke: 'var(--chart-grid)' }} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--hover-overlay)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }}>
                    {historicoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#60a5fa" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Aguardando busca de dados...
              </div>
            )}
          </div>

          {/* 3. Top 10 Requerentes */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800' }}>
              Top 10 Requerentes
            </div>
            {topRequerentes.length > 0 ? (
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
                Aguardando busca de dados...
              </div>
            )}
          </div>

          {/* 4. Top 5 Categorias */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800' }}>
              Top 5 Categorias
            </div>
            {topCategorias.length > 0 ? (
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
                Aguardando busca de dados...
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
                  resultado do mês de <strong>{selectedPeriod.mes ? nomesMeses[selectedPeriod.mes - 1] : ''} de {selectedPeriod.ano}</strong> foi 
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
                Aguardando busca de dados...
              </div>
            )}
            </div>
          </div>

          {/* Status dos Chamados (Pizza) */}
          <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px' }}>
              Status dos Chamados
            </div>
            {efetividadeData.length > 0 ? (
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
                      // Customiza algumas cores baseado no status comum
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
                Aguardando busca de dados...
              </div>
            )}
          </div>

        </div>

        {/* --- PAINÉIS SIGPA --- */}
        <div style={{ marginTop: '48px', borderTop: '1px solid var(--border-color)', paddingTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }} className="print-hide">
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>
              Indicadores SIGPA (PostgreSQL)
            </h2>
            <button 
              onClick={fetchSigpaData}
              disabled={loadingSigpa || !selectedPeriod.ano || !selectedPeriod.mes}
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: (loadingSigpa || !selectedPeriod.ano || !selectedPeriod.mes) ? 'not-allowed' : 'pointer',
                fontWeight: '700',
                transition: 'all 0.2s',
                opacity: (loadingSigpa || !selectedPeriod.ano || !selectedPeriod.mes) ? 0.6 : 1
              }}
            >
              {loadingSigpa ? 'Consultando...' : 'Consultar Dados SIGPA'}
            </button>
          </div>

          {!sigpaData ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Aguardando consulta manual para não sobrecarregar a produção.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Documentos Emitidos */}
              <div className="glass-panel chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="chart-header" style={{ textAlign: 'center', textTransform: 'uppercase', color: '#6366f1', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>
                  Documentos Emitidos
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sigpaData.documentosEmitidos} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
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
                  <LineChart data={sigpaData.novosExtrajudiciais} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
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
                  <LineChart data={sigpaData.movimentosTaxonomicos} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
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
                  <LineChart data={sigpaData.evolucaoPeticionamento} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="mes_ano" tickFormatter={formatSigpaTick} stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={{ stroke: 'var(--chart-grid)' }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} labelFormatter={formatSigpaTick} />
                    <Line type="linear" dataKey="quantidade" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-secondary)' }} activeDot={{ r: 6 }} label={renderSigpaLabel} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

            </div>
          )}
        </div>

      </main>
    </div>
  );
}
