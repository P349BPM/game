import React, { useState } from 'react';
import { registerParticipant } from '../firebase/RankingService';

const WelcomeScreen = ({ onRegistered }) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState(''); // '', 'success', 'error'
  const [message, setMessage] = useState('');
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setMessage('');
    try {
      await registerParticipant({ name });
      setStatus('success');
      setMessage('Cadastro realizado!');
      // guarda info mínima para UX
      localStorage.setItem('player_name', name.trim());
      setRegistered(true);
      try { onRegistered?.(name.trim()); } catch {}
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'Erro ao cadastrar. Verifique os campos.');
    }
  };

  if (registered) {
    return (
      <div style={{
        maxWidth: 760,
        margin: '2rem auto',
        padding: '2.5rem',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        color: '#e8f5e9',
        textAlign: 'center'
      }}>
        <h2 style={{ marginTop: 0, color: '#a5d6a7', fontSize: '2.2rem' }}>Game Adrenalina Policial</h2>
        <p style={{ fontSize: '1.3rem', marginTop: 8 }}>Cadastro concluído. Iniciando...</p>
        <p style={{ fontSize: '1.6rem', marginTop: 4, color: '#ffd54f', fontWeight: 700 }}>Vá e vença!</p>
        <div style={{
          marginTop: 24,
          padding: '12px 14px',
          borderRadius: 10,
          border: '1px dashed rgba(255,255,255,0.25)',
          color: '#c8e6c9'
        }}>
          Você já pode iniciar o quiz.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 760,
      margin: '2rem auto',
      padding: '2rem',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 14,
      color: '#e8f5e9'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: 8, color: '#a5d6a7', fontSize: '2rem' }}>Game Adrenalina Policial</h2>
      <p style={{ marginTop: 0, opacity: 0.9 }}>
        Informe seu nome para registrar no placar e iniciar.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
          style={inputStyle}
        />
        <button
          type="submit"
          style={btnPrimary}
          disabled={!name.trim()}
        >
          Iniciar
        </button>
      </form>

      {status && (
        <div style={{
          marginTop: 16,
          padding: '10px 12px',
          borderRadius: 8,
          background: status === 'success' ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
          border: `1px solid ${status === 'success' ? 'rgba(76,175,80,0.35)' : 'rgba(244,67,54,0.35)'}`,
          color: status === 'success' ? '#c8e6c9' : '#ffcdd2'
        }}>
          {message}
        </div>
      )}

      <div style={{
        marginTop: 20,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px dashed rgba(255,255,255,0.25)',
        color: '#c8e6c9'
      }}>
        O tempo máximo por questão é de 4 minutos.
      </div>
    </div>
  );
};

const inputStyle = {
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(0,0,0,0.25)',
  color: '#e8f5e9',
  outline: 'none',
};

const btnPrimary = {
  padding: '12px 16px',
  borderRadius: 8,
  border: '1px solid #1b5e20',
  background: '#2e7d32',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600
};

export default WelcomeScreen;
