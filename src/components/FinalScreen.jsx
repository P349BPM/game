import React, { useState, useEffect } from 'react';
import questions from '../data/questions.json';
import { useLiveLeaderboard, useRanking } from "../firebase/RankingService";

const FinalScreen = ({ score, total, answeredCount = 0, correctCount = 0, onRestart }) => {
  const [playerName, setPlayerName] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'success', 'error', ''
  const { saveScore } = useRanking();

  const leaderboard = useLiveLeaderboard(Math.max(0, questions.length - 1));

  const percentage = ((score / total) * 100).toFixed(1);
  const accuracy = total > 0 ? ((correctCount / total) * 100).toFixed(1) : '0.0';

  const getMessage = () => {
    if (percentage >= 150) return '🥇 Excelente! Você é um estrategista nato!';
    if (percentage >= 120) return '🥈 Muito bom! Continue treinando!';
    if (percentage >= 100) return '🥉 Bom esforço! A prática leva à perfeição!';
    return '🛡️ Continue tentando, soldado!';
  };

  const handleSave = async () => {
    if (!playerName.trim()) {
      setSaveStatus('error');
      return false;
    }

    try {
      console.log('Iniciando salvamento da pontuação...');
      const result = await saveScore({
        name: playerName.trim(),
        score: parseFloat(score.toFixed(2)),
        date: new Date().toLocaleString(),
        percentage: percentage
      });
      
      console.log('Resultado do salvamento:', result);
      setSaved(true);
      setSaveStatus('success');
      return true;
    } catch (error) {
      console.error("Erro ao salvar pontuação:", error);
      setSaveStatus('error');
      
      // Tenta obter mais detalhes do erro
      if (error.code) {
        console.error('Código do erro:', error.code);
        console.error('Mensagem do erro:', error.message);
      }

      return false;
    }
  };

  useEffect(() => {
    try {
      const storedName = (localStorage.getItem('player_name') || '').trim();
      if (storedName) setPlayerName(storedName);
    } catch {}
  }, []);

  const clientId = (() => {
    try { return localStorage.getItem('client_id') || ''; } catch { return ''; }
  })();

  const myRankIndex = (() => {
    if (!Array.isArray(leaderboard) || !leaderboard.length) return -1;
    if (clientId) {
      const i = leaderboard.findIndex((e) => e.clientId === clientId);
      if (i >= 0) return i;
    }
    if (playerName.trim()) {
      const i = leaderboard.findIndex((e) => (e.name || '').trim() === playerName.trim());
      if (i >= 0) return i;
    }
    return -1;
  })();

  const myEntry = myRankIndex >= 0 ? leaderboard[myRankIndex] : null;

  useEffect(() => {
    if (!playerName.trim()) return;
    if (saved) return;
    const scoreKey = `${playerName.trim()}|${Number(score).toFixed(2)}|${total}`;
    try {
      const lastSavedKey = localStorage.getItem('last_saved_score_key') || '';
      if (lastSavedKey === scoreKey) {
        setSaved(true);
        setSaveStatus('success');
        return;
      }
    } catch {}

    (async () => {
      try {
        const ok = await handleSave();
        if (ok) {
          try { localStorage.setItem('last_saved_score_key', scoreKey); } catch {}
        }
      } catch {}
    })();
  }, [playerName, saved, score, total]);

  useEffect(() => {
    if (saveStatus) {
      const timer = setTimeout(() => setSaveStatus(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Efeito para rolar para o topo quando o componente for montado
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="final-screen" style={{
      maxWidth: '980px',
      margin: '2rem auto',
      padding: '2rem',
      textAlign: 'center',
      background: 'radial-gradient(1200px circle at 20% 10%, rgba(212,175,55,0.10), transparent 55%), radial-gradient(900px circle at 80% 40%, rgba(80,200,120,0.10), transparent 60%), linear-gradient(180deg, #1b2e1b 0%, #0f1a0f 100%)',
      borderRadius: '15px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45)',
      border: '1px solid rgba(212,175,55,0.25)',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 className="final-title" style={{
        color: '#d4af37',
        marginBottom: '1.5rem',
        fontSize: '2.5rem',
        fontWeight: 'bold',
        textShadow: '0 6px 22px rgba(0,0,0,0.55)'
      }}>
        🏁 Fim do Quiz
      </h2>
      
      <div style={{
        padding: '2rem',
        borderRadius: '12px',
        margin: '1.5rem 0',
        boxShadow: '0 14px 40px rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(61, 92, 61, 0.65)',
        background: 'linear-gradient(180deg, rgba(42,71,42,0.92), rgba(27,46,27,0.92))'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '12px',
          marginBottom: '1.2rem'
        }}>
          <div style={statCard}>
            <div style={statLabel}>Pontuação</div>
            <div style={statValue}>{score.toFixed(2)}</div>
            <div style={statHint}>Com bônus de tempo</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Respondidas</div>
            <div style={statValue}>{answeredCount} <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.75 }}>/ {total}</span></div>
            <div style={statHint}>Questões respondidas</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Acertos</div>
            <div style={statValue}>{correctCount} <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.75 }}>/ {total}</span></div>
            <div style={statHint}>{accuracy}% de acerto</div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: '1.2rem'
        }}>
          <div style={pill}>Participantes no placar: <strong>{leaderboard?.length || 0}</strong></div>
          <div style={pill}>Sua posição: <strong>{myRankIndex >= 0 ? `${myRankIndex + 1}º` : '--'}</strong></div>
          <div style={pill}>% de pontuação: <strong>{percentage}%</strong></div>
        </div>

        <p className="final-message" style={{
          fontSize: '1.3rem',
          color: '#e8f5e9',
          marginBottom: '1.5rem',
          fontStyle: 'italic',
          fontWeight: '500'
        }}>
          {getMessage()}
        </p>
      </div>

      {saveStatus === 'success' && (
        <div style={{
          backgroundColor: 'rgba(80, 200, 120, 0.10)',
          color: '#c8e6c9',
          padding: '1rem',
          borderRadius: '8px',
          margin: '1rem auto',
          border: '1px solid rgba(80, 200, 120, 0.35)',
          fontSize: '1.1rem',
          fontWeight: '500',
          maxWidth: '80%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
        }}>
          ✅ Pontuação salva com sucesso!
        </div>
      )}
      {saveStatus === 'error' && (
        <div style={{
          backgroundColor: 'rgba(255, 107, 107, 0.10)',
          color: '#ffcdd2',
          padding: '1rem',
          borderRadius: '8px',
          margin: '1rem auto',
          border: '1px solid rgba(255, 107, 107, 0.35)',
          fontSize: '1.1rem',
          fontWeight: '500',
          maxWidth: '80%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
        }}>
          ❌ Erro ao salvar. Tente novamente.
        </div>
      )}

      {!saved ? (
        <div className="save-score">
          <p style={{
            margin: '1.5rem 0 0',
            color: '#2e7d32',
            fontWeight: 600
          }}>
            Salvando pontuação automaticamente...
          </p>
        </div>
      ) : (
        <>
          <h3 className="ranking-title" style={{
            color: '#d4af37',
            margin: '2rem 0 1rem',
            fontSize: '1.5rem'
          }}>
            🏆 Classificação dos Comandantes
          </h3>

          <div style={{
            margin: '0 auto 10px',
            maxWidth: 920,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(212,175,55,0.22)',
            background: 'rgba(0,0,0,0.18)',
            color: '#e8f5e9',
            fontWeight: 600,
            textAlign: 'left'
          }}>
            {myEntry ? (
              <>Você está em <strong>{myRankIndex + 1}º</strong> com <strong>{Number(myEntry.points || 0).toFixed(2)}</strong> pontos — {myEntry.correct}/{total} acertos</>
            ) : (
              <>Placar geral (todos os participantes)</>
            )}
          </div>

          <div style={{
            maxWidth: 920,
            margin: '0 auto',
            border: '1px solid rgba(61, 92, 61, 0.65)',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'rgba(0,0,0,0.22)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 140px 150px 140px',
              gap: 0,
              padding: '12px 14px',
              background: 'linear-gradient(90deg, rgba(212,175,55,0.18), rgba(46,125,50,0.25))',
              color: '#e8f5e9',
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: 0.6
            }}>
              <div>Pos.</div>
              <div>Nome</div>
              <div style={{ textAlign: 'right' }}>Pontos</div>
              <div style={{ textAlign: 'right' }}>Acertos</div>
              <div style={{ textAlign: 'right' }}>% acerto</div>
            </div>

            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {(leaderboard || []).length ? (
                leaderboard.map((entry, idx) => {
                  const isMe = (clientId && entry.clientId === clientId) || (playerName.trim() && (entry.name || '').trim() === playerName.trim());
                  const rowBg = isMe
                    ? 'linear-gradient(90deg, rgba(212,175,55,0.22), rgba(46,125,50,0.18))'
                    : idx % 2 === 0
                      ? 'rgba(0,0,0,0.18)'
                      : 'rgba(0,0,0,0.10)';
                  return (
                    <div
                      key={entry.clientId || idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '80px 1fr 140px 150px 140px',
                        padding: '11px 14px',
                        borderTop: '1px solid rgba(61, 92, 61, 0.55)',
                        background: rowBg,
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 900, color: '#d4af37' }}>{idx + 1}º</div>
                      <div style={{ textAlign: 'left', fontWeight: isMe ? 900 : 650, color: '#e8f5e9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.name || '—'} {isMe ? '(você)' : ''}
                      </div>
                      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 900, color: '#e8f5e9' }}>
                        {Number(entry.points || 0).toFixed(2)}
                      </div>
                      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'rgba(232,245,233,0.85)' }}>
                        {entry.correct}/{total}
                      </div>
                      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 900, color: '#50c878' }}>
                        {Number(entry.percentage || 0).toFixed(1)}%
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: 16, color: 'rgba(232,245,233,0.75)', fontStyle: 'italic' }}>Ainda não há respostas registradas.</div>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: '2rem' }}>
        <button 
          className="restart-btn" 
          onClick={onRestart}
          style={{
            padding: '0.9rem 2rem',
            fontSize: '1.2rem',
            backgroundColor: '#1b5e20',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontWeight: '600',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#0d4712';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#1b5e20';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
          }}
        >
          <span>🔄</span> Recomeçar Batalha
        </button>
      </div>
    </div>
  );

};

const statCard = {
  border: '1px solid rgba(212,175,55,0.18)',
  borderRadius: 12,
  padding: '14px 14px',
  background: 'rgba(0,0,0,0.18)',
};

const statLabel = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.7,
  color: '#d4af37',
  fontWeight: 800,
};

const statValue = {
  marginTop: 6,
  fontSize: 26,
  color: '#e8f5e9',
  fontWeight: 900,
};

const statHint = {
  marginTop: 4,
  fontSize: 12,
  color: 'rgba(232,245,233,0.75)',
  fontWeight: 600,
};

const pill = {
  padding: '8px 10px',
  borderRadius: 999,
  border: '1px solid rgba(212,175,55,0.25)',
  background: 'rgba(0,0,0,0.18)',
  color: '#e8f5e9',
  fontWeight: 600,
};

export default FinalScreen;