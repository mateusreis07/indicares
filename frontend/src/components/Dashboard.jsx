import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, LogOut, LayoutDashboard, BarChart3, Settings, Users, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState({ ano: '', mes: '' });
  const [loading, setLoading] = useState(true);
  const [hiddenDash, setHiddenDash] = useState([]);

  const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981'];

  // 1. Busca os períodos disponíveis
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

  // Função manual para buscar os dados apenas quando o usuário quiser
  const fetchDashboardData = async () => {
    if (!selectedPeriod.ano || !selectedPeriod.mes) return;
    
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/chamados/resumo?ano=${selectedPeriod.ano}&mes=${selectedPeriod.mes}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const result = await res.json();
        const chartData = result.map(item => ({
          name: item.status,
          value: item.total
        }));
        setData(chartData.length ? chartData : []);
      } else {
        if (res.status === 401 || res.status === 403) handleLogout();
        setData([]);
      }
    } catch (e) {
      console.error('Erro ao buscar dados', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // (Removido o useEffect que fazia o fetch automático ao trocar o selectedPeriod)

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const totalChamados = data.reduce((acc, curr) => acc + curr.value, 0);

  const toggleDash = (e) => {
    const name = e.value;
    setHiddenDash(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const renderLegendDash = (value) => {
    const isHidden = hiddenDash.includes(value);
    return <span style={{
      color: isHidden ? '#666' : 'var(--text-primary)',
      textDecoration: isHidden ? 'line-through' : 'none',
      opacity: isHidden ? 0.5 : 1,
      transition: '0.2s',
      cursor: 'pointer'
    }}>{value}</span>;
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
          <Link to="/" className="nav-item active" style={{ textDecoration: 'none' }}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link to="/relatorios" className="nav-item" style={{ textDecoration: 'none' }}>
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
            Indicadores Globais
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
              onClick={fetchDashboardData}
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

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="glass-panel kpi-card">
            <div className="kpi-header">
              <span>Total de Chamados</span>
              <Activity size={16} color="var(--accent-primary)" />
            </div>
            <div className="kpi-value">{loading ? '...' : totalChamados}</div>
          </div>
          
          {data.map((item, index) => (
            <div className="glass-panel kpi-card" key={index}>
              <div className="kpi-header">
                <span>{item.name}</span>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
              </div>
              <div className="kpi-value">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="charts-grid">
          {/* Gráfico de Barras */}
          <div className="glass-panel chart-container">
            <div className="chart-header">Volume de Chamados por Status</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'var(--hover-overlay)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Pizza */}
          <div className="glass-panel chart-container">
            <div className="chart-header">Distribuição</div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.map(d => ({ ...d, value: hiddenDash.includes(d.name) ? 0 : d.value }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  onClick={toggleDash}
                  formatter={renderLegendDash}
                  wrapperStyle={{ cursor: 'pointer' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
