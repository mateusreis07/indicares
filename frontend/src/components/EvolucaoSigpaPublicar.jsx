import { useEffect, useState } from 'react';
import { TrendingUp, RefreshCw, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const BLOB_BASE_URL = 'https://j38yizihjj4fbhb0.public.blob.vercel-storage.com';

const PAINEIS = [
  { key: 'documentosEmitidos', titulo: 'Documentos Emitidos' },
  { key: 'novosExtrajudiciais', titulo: 'Novos Extrajudiciais' },
  { key: 'movimentosTaxonomicos', titulo: 'Movimentos Taxonômicos' },
  { key: 'evolucaoPeticionamento', titulo: 'Evolução de Peticionamento' }
];

// Publicação manual da Evolução Total do SIGPA, um painel por vez para não sobrecarregar a base
export default function EvolucaoSigpaPublicar({ onCredenciaisInvalidas }) {
  // { [painel]: { estado: 'idle' | 'fila' | 'executando' | 'ok' | 'erro', publicadoEm, duracao } }
  const [status, setStatus] = useState({});
  const [executando, setExecutando] = useState(false);

  const atualizarStatus = (painel, dados) => setStatus(prev => ({ ...prev, [painel]: { ...prev[painel], ...dados } }));

  // Carrega a data da última publicação de cada painel direto do Blob público
  useEffect(() => {
    PAINEIS.forEach(async ({ key }) => {
      try {
        const res = await fetch(`${BLOB_BASE_URL}/snapshot/evolucao-sigpa/${key}.json`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          atualizarStatus(key, { publicadoEm: json.publicadoEm });
        }
      } catch {
        // Painel ainda não publicado
      }
    });
  }, []);

  const publicarPainel = async (painel) => {
    atualizarStatus(painel, { estado: 'executando', duracao: null });
    const inicio = Date.now();
    try {
      const res = await fetch(`${API_BASE_URL}/api/publicar/evolucao-sigpa/${painel}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Sigpa-User': localStorage.getItem('sigpa_user') || '',
          'X-Sigpa-Password': localStorage.getItem('sigpa_password') || ''
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      atualizarStatus(painel, { estado: 'ok', publicadoEm: result.publicadoEm, duracao: (Date.now() - inicio) / 1000 });
      return true;
    } catch (e) {
      console.error(`Erro ao publicar evolução (${painel})`, e);
      atualizarStatus(painel, { estado: 'erro' });
      return false;
    }
  };

  const executar = async (paineis) => {
    if (!localStorage.getItem('sigpa_user') || !localStorage.getItem('sigpa_password')) {
      onCredenciaisInvalidas?.();
      return;
    }
    setExecutando(true);
    paineis.forEach(p => atualizarStatus(p, { estado: 'fila' }));
    // Sequencial de propósito: uma consulta pesada por vez no PostgreSQL
    for (const painel of paineis) {
      await publicarPainel(painel);
    }
    setExecutando(false);
  };

  const renderEstado = (s = {}) => {
    switch (s.estado) {
      case 'fila':
        return <span style={{ color: 'var(--text-secondary)' }}>Na fila...</span>;
      case 'executando':
        return <span style={{ color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}><Loader size={16} className="spin" /> Consultando...</span>;
      case 'erro':
        return <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={16} /> Erro na consulta</span>;
      case 'ok':
        return <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} /> Concluído ({s.duracao.toFixed(0)}s de consulta)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="glass-panel print-hide" style={{ padding: '24px', marginTop: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
          <TrendingUp size={22} />
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Evolução Total SIGPA (painel público)</h3>
        </div>
        <button
          onClick={() => executar(PAINEIS.map(p => p.key))}
          disabled={executando}
          className="monitor-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} /> Atualizar todos (um por vez)
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
        Consulta desde a implantação (12/09/2022) até o último mês completo. As consultas são longas: atualize apenas quando necessário.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {PAINEIS.map(({ key, titulo }) => {
          const s = status[key] || {};
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '12px 16px', borderRadius: '10px', background: 'var(--hover-overlay)' }}>
              <div style={{ flex: '1 1 220px' }}>
                <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{titulo}</div>
                {s.publicadoEm ? (
                  <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <CheckCircle size={14} /> Publicado pela última vez em {new Date(s.publicadoEm).toLocaleString('pt-BR')}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>
                    Ainda não publicado na nuvem.
                  </div>
                )}
              </div>
              <div style={{ flex: '0 0 auto', fontSize: '0.9rem', fontWeight: '600' }}>{renderEstado(s)}</div>
              <button
                onClick={() => executar([key])}
                disabled={executando}
                className="monitor-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
