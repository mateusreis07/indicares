import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Aqui faríamos a chamada para nossa API Node.js (http://localhost:3333/api/login)
      const res = await fetch('http://localhost:3333/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        navigate('/');
      } else {
        setError(data.error || 'Erro no login');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-box">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ background: 'var(--accent-primary)', padding: '12px', borderRadius: '12px' }}>
            <Activity size={32} color="white" />
          </div>
        </div>
        <h2>Acesso ao Painel</h2>
        <p>Insira suas credenciais para continuar</p>
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Usuário</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Ex: admin"
              required 
            />
          </div>
          <div className="input-group">
            <label>Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Ex: admin"
              required 
            />
          </div>
          <button type="submit" className="btn-primary">Entrar</button>
          {error && <div className="error-msg">{error}</div>}
        </form>
      </div>
    </div>
  );
}
