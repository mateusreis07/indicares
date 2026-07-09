import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, LayoutDashboard, BarChart3, Users, LogOut, Play, RefreshCw, Plus, X, Server, Settings, Database } from 'lucide-react';
import SigpaConfigModal from './SigpaConfigModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export default function Equipe() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});
  const [dataInicio, setDataInicio] = useState('2025-08-11');
  const [usuarios, setUsuarios] = useState(['JAN.RAMOS', 'BRUNA.CASTOR', 'FABRICIO.CUNHA', 'THIAGO.ROCHA', 'MATEUS.REIS']);
  const [novoUsuario, setNovoUsuario] = useState('');
  const [selectedScriptForModal, setSelectedScriptForModal] = useState(null);
  const [showConfig, setShowConfig] = useState({});
  const [isSigpaModalOpen, setIsSigpaModalOpen] = useState(false);

  const toggleConfig = (id) => {
    setShowConfig(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { 
      'Authorization': `Bearer ${token}`,
      'x-sigpa-user': localStorage.getItem('sigpa_user') || '',
      'x-sigpa-password': localStorage.getItem('sigpa_password') || ''
    };
  };

  const scripts = [
    {
      id: 'peticionamento-erro',
      title: 'Peticionamento com Erro',
      desc: 'Peticionamentos com erro de comunicação TJPA.',
      url: `/api/monitoramento/peticionamento-erro?dataInicio=${dataInicio}`,
      method: 'GET',
      columns: ['tpsistema', 'delocal', 'nuprocessoexterno', 'demsgerro', 'dtusuinclusao']
    },
    {
      id: 'intimacao-problema',
      title: 'Intimações com Problema',
      desc: 'Intimações com problema nos últimos 15 dias.',
      url: '/api/monitoramento/intimacao-problema',
      method: 'GET',
      columns: ['delocal', 'nuprocesso', 'nuprocessoexterno', 'tpsistema', 'deobservacao', 'dtusuinclusao']
    },
    {
      id: 'peticionamento-travado',
      title: 'Peticionamentos Travados',
      desc: 'Peticionamentos travados há mais de 5 minutos.',
      url: '/api/monitoramento/peticionamento-travado',
      method: 'GET',
      columns: ['nuprocessoexterno', 'dtusuinclusao', 'cdusuinclusao', 'demsgerro']
    },
    {
      id: 'fora-fluxo',
      title: 'Fora de Fluxo',
      desc: 'Processos encaminhados e recebidos fora de fluxo.',
      url: '/api/monitoramento/fora-fluxo',
      method: 'GET',
      columns: ['numero_mp', 'tipo', 'remetente', 'destino', 'fila_destino', 'data_distribuicao']
    },
    {
      id: 'portal-ouvidoria',
      title: 'Portal da Ouvidoria',
      desc: 'Processos da Ouvidoria (últimos 5 dias).',
      url: '/api/monitoramento/portal-ouvidoria',
      method: 'GET',
      columns: ['nuprocesso', 'tipo_processo', 'tipo_atendimento', 'delocal', 'cdusuinclusao', 'dtusuinclusao']
    },
    {
      id: 'cadastros-alocados',
      title: 'Cadastros Alocados',
      desc: 'Cadastros alocados para a equipe.',
      url: '/api/monitoramento/cadastros-alocados',
      method: 'POST',
      body: { usuarios },
      columns: ['delocal', 'nuprocesso', 'cdusuario', 'subfluxo', 'fila']
    },
    {
      id: 'intimacoes-vencidas',
      title: 'Intimações Vencidas',
      desc: 'Intimações vencidas com pendência aberta.',
      url: '/api/monitoramento/intimacoes-vencidas',
      method: 'GET',
      columns: ['delocal', 'nuprocesso', 'dependencia', 'dtvenctoprazo', 'dtcumprimento']
    }
  ];

  const handleExecute = async (script) => {
    setLoading(prev => ({ ...prev, [script.id]: true }));
    try {
      const options = {
        method: script.method,
        headers: {
          ...getHeaders(),
          ...(script.method === 'POST' ? { 'Content-Type': 'application/json' } : {})
        }
      };
      
      if (script.method === 'POST') {
        options.body = JSON.stringify(script.body);
      }
      
      const res = await fetch(`${API_BASE_URL}${script.url}`, options);
      const data = await res.json();
      
      if (res.ok) {
        setResults(prev => ({ ...prev, [script.id]: data }));
      } else if (res.status === 401 && data.error && data.error.includes('autenticação')) {
        setIsSigpaModalOpen(true);
        alert('Por favor, informe suas credenciais do banco SIGPA.');
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (e) {
      alert(`Falha ao executar script: ${e.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [script.id]: false }));
    }
  };

  const handleExecuteAll = () => {
    scripts.forEach(script => handleExecute(script));
  };

  const getStatusClass = (count) => {
    if (count === undefined) return 'status-none';
    if (count === 0) return 'status-ok';
    if (count < 10) return 'status-warning';
    return 'status-danger';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return String(dateString);
      return d.toLocaleString('pt-BR');
    } catch (e) {
      return String(dateString);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar idêntica a Dashboard/Relatorios */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Activity color="var(--accent-primary)" />
          <span>Indicadores</span>
        </div>
        <ul className="nav-menu">
          <Link to="/" className="nav-item" style={{ textDecoration: 'none' }}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link to="/relatorios" className="nav-item" style={{ textDecoration: 'none' }}>
            <BarChart3 size={20} /> Relatórios
          </Link>
          <Link to="/equipe" className="nav-item active" style={{ textDecoration: 'none' }}>
            <Users size={20} /> Equipe
          </Link>
        </ul>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', color: 'inherit' }}>
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1>Monitoramento Diário</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Painel da equipe para acompanhamento de scripts operacionais.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => setIsSigpaModalOpen(true)}>
              <Database size={18} /> Credenciais SIGPA
            </button>
            <button className="btn-primary" onClick={handleExecuteAll}>
              <Play size={18} /> Executar Todos
            </button>
          </div>
        </header>

        {/* Grid de Monitoramento */}
        <div className="monitor-grid">
          {scripts.map(script => {
            const isExecuting = loading[script.id];
            const result = results[script.id];
            const hasData = result && result.rows && result.rows.length > 0;

            return (
              <div key={script.id} className="glass-panel monitor-card">
                <div className="monitor-card-header">
                  <h3 className="monitor-card-title">{script.title}</h3>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {(script.id === 'peticionamento-erro' || script.id === 'cadastros-alocados') && (
                      <button 
                        onClick={() => toggleConfig(script.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Configurações deste script"
                      >
                        <Settings size={18} />
                      </button>
                    )}
                    <div className={`monitor-badge ${getStatusClass(result?.count)}`}>
                      {result?.count !== undefined ? result.count : '-'}
                    </div>
                  </div>
                </div>
                <p className="monitor-card-desc">{script.desc}</p>
                
                {showConfig[script.id] && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {script.id === 'peticionamento-erro' && (
                      <div className="settings-group">
                        <label>Data Inicial</label>
                        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                      </div>
                    )}
                    {script.id === 'cadastros-alocados' && (
                      <div className="settings-group">
                        <label>Membros da Equipe</label>
                        <div className="add-user-input" style={{ marginBottom: '0.5rem' }}>
                          <input 
                            type="text" 
                            value={novoUsuario} 
                            onChange={(e) => setNovoUsuario(e.target.value)} 
                            placeholder="Ex: JOAO.SILVA" 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && novoUsuario.trim()) {
                                setUsuarios([...usuarios, novoUsuario.trim()]);
                                setNovoUsuario('');
                              }
                            }}
                          />
                          <button onClick={() => {
                            if (novoUsuario.trim()) {
                              setUsuarios([...usuarios, novoUsuario.trim()]);
                              setNovoUsuario('');
                            }
                          }}>
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="user-chips">
                          {usuarios.map(u => (
                            <div key={u} className="user-chip">
                              {u}
                              <button onClick={() => setUsuarios(usuarios.filter(user => user !== u))}>
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {hasData && (
                  <div style={{ marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => setSelectedScriptForModal(script)}
                      style={{ 
                        background: 'rgba(79, 70, 229, 0.1)', 
                        border: '1px solid rgba(79, 70, 229, 0.3)', 
                        color: 'var(--accent-primary)', 
                        padding: '0.6rem 1rem', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.1)'}
                    >
                      Visualizar {result.count} registro{result.count !== 1 ? 's' : ''}
                    </button>
                  </div>
                )}

                <div className="monitor-card-footer">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {result ? `Última execução: ${new Date(result.executedAt).toLocaleTimeString('pt-BR')}` : 'Nunca executado'}
                  </span>
                  <button className="monitor-btn" disabled={isExecuting} onClick={() => handleExecute(script)}>
                    {isExecuting ? <RefreshCw size={16} className="spinner" /> : <Play size={16} />} 
                    {isExecuting ? 'Executando...' : 'Executar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal de Detalhes */}
        {selectedScriptForModal && (
          <div className="modal-overlay" onClick={() => setSelectedScriptForModal(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedScriptForModal.title} - Resultados</h2>
                <button className="close-btn" onClick={() => setSelectedScriptForModal(null)}>
                  <X size={24} />
                </button>
              </div>
              <div className="modal-body">
                {results[selectedScriptForModal.id] && results[selectedScriptForModal.id].rows.length > 0 ? (
                  <div className="monitor-table-container" style={{ gridColumn: 'auto', marginTop: 0 }}>
                    <table className="monitor-table">
                      <thead>
                        <tr>
                          {selectedScriptForModal.columns.map(col => <th key={col}>{col}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {results[selectedScriptForModal.id].rows.slice(0, 100).map((row, i) => (
                          <tr key={i}>
                            {selectedScriptForModal.columns.map(col => (
                              <td key={col}>
                                {col.includes('dt') || col.includes('data') 
                                  ? formatDate(row[col]) 
                                  : String(row[col] ?? '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {results[selectedScriptForModal.id].count > 100 && (
                      <p style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Mostrando apenas os 100 primeiros registros.
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>Nenhum dado encontrado.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <SigpaConfigModal isOpen={isSigpaModalOpen} onClose={() => setIsSigpaModalOpen(false)} />
    </div>
  );
}
