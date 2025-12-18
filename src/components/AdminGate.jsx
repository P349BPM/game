import React, { useEffect, useState } from 'react';

// Simple PIN gate for the Admin area. Use env var VITE_ADMIN_PIN.
// Stores a flag in localStorage to persist session until tab is closed or user logs out.
const AdminGate = ({ children }) => {
  const [ok, setOk] = useState(false);
  const [pin, setPin] = useState('');
  const adminPin = import.meta.env.VITE_ADMIN_PIN || '801112Pm@';

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('admin_ok') === '1';
      if (cached) setOk(true);
    } catch {}
  }, []);

  const tryLogin = (e) => {
    e.preventDefault();
    // adminPin sempre existe (env ou default)
    if (pin === String(adminPin)) {
      try { sessionStorage.setItem('admin_ok', '1'); } catch {}
      setOk(true);
    } else {
      alert('PIN incorreto.');
    }
  };

  const logout = () => {
    try { sessionStorage.removeItem('admin_ok'); } catch {}
    setOk(false);
  };

  if (!ok) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1f0d' }}>
        <form onSubmit={tryLogin} style={{
          width: 360,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          padding: 20,
          color: '#e8f5e9'
        }}>
          <h1 style={{ marginTop: 0, marginBottom: 10, color: '#a5d6a7', fontSize: 22 }}>Admin • Acesso restrito</h1>
          <div style={{ fontSize: 13, color: '#c8e6c9', marginBottom: 10 }}>Digite o PIN de administrador para entrar.</div>
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.25)', color: '#e8f5e9' }}
          />
          <button type="submit" style={{ marginTop: 12, width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1b5e20', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Entrar</button>
          {!adminPin && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#ffcdd2' }}>
              Aviso: VITE_ADMIN_PIN não está configurado. Em desenvolvimento, crie um arquivo .env com VITE_ADMIN_PIN=1234 (por exemplo) e reinicie o servidor.
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: 'fixed', right: 12, top: 12, zIndex: 20 }}>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.08)', color: '#e8f5e9', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Sair</button>
      </div>
      {children}
    </div>
  );
};

export default AdminGate;
