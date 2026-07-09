import { useState, useEffect } from 'react';
import { X, Save, Database, ShieldAlert } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export default function SigpaConfigModal({ isOpen, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsername(localStorage.getItem('sigpa_user') || '');
      setPassword(localStorage.getItem('sigpa_password') || '');
      setStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sigpa/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        localStorage.setItem('sigpa_user', username);
        localStorage.setItem('sigpa_password', password);
        setStatus('success');
        setTimeout(() => onClose(), 1500);
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Erro ao conectar');
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg('Falha na comunicação com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={20} /> Credenciais SIGPA
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Insira seu usuário e senha do banco de dados SIGPA para executar consultas.
          </p>

          {status === 'error' && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <ShieldAlert size={16} /> {errorMsg}
            </div>
          )}
          {status === 'success' && (
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              Conexão estabelecida e salva!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Usuário do Banco</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Ex: joao_silva"
                style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)' }}
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Senha</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Sua senha do banco"
                style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)' }}
              />
            </div>
          </div>
          
          <button 
            className="btn-primary" 
            style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={handleTestAndSave}
            disabled={loading || !username || !password}
          >
            {loading ? 'Conectando...' : <><Save size={18} /> Salvar e Testar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
