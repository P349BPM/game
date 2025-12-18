import React, { useState } from 'react';
import { useRanking, useGameControl, useParticipants, useRoundStats, useLiveLeaderboard } from "../firebase/RankingService";

const AdminDashboard = () => {
  const { ranking, loading } = useRanking();
  const { participants } = useParticipants();
  const { currentQuestion, roundOpen, gameStarted, loading: loadingCtrl, incrementCurrentQuestion, resetControl, openRound, closeRound, startGame, stopGame, startNewGame } = useGameControl();
  const roundCounts = useRoundStats(currentQuestion);
  const liveBoard = useLiveLeaderboard(currentQuestion);
  const [showBoard, setShowBoard] = useState(false);
  const [tip, setTip] = useState('');

  const exportParticipantsCSV = () => {
    const rows = [
      ['Nome', 'Email', 'Telefone', 'Data/Hora (locale)'],
      ...((participants || []).map(p => [
        p.name || '',
        p.email || '',
        p.phone || '',
        p.timestamp ? new Date(p.timestamp).toLocaleString() : ''
      ]))
    ];
    const csv = rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes-${new Date().toISOString().slice(0,19)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      maxWidth: 1000,
      margin: '0 auto',
      padding: '24px',
    }}>
      <div style={{
        marginBottom: 12,
        padding: '10px 12px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#c8e6c9',
        fontSize: 14
      }}>
        Acesse como ADMIN por este endereço: <strong>.../admin.html</strong>. Jogadores acessam a página principal.
      </div>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#a5d6a7' }}>Placar ao Vivo • Quiz</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
            <span style={{ color: '#c8e6c9', fontSize: 14 }}>
              {loadingCtrl ? 'Sincronizando controle...' : `Pergunta liberada: ${currentQuestion + 1}`}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                display: 'inline-block',
                background: roundOpen ? '#66bb6a' : '#ef5350',
                boxShadow: roundOpen ? '0 0 6px #66bb6a' : '0 0 6px #ef5350',
              }} />
              <span style={{ color: '#c8e6c9', fontSize: 13 }}>{roundOpen ? 'Rodada ABERTA' : 'Rodada FECHADA'}</span>
            </span>
            <span style={{ color: '#c8e6c9', fontSize: 13 }}>• Participantes: <strong>{participants?.length || 0}</strong></span>
            <span style={{ color: gameStarted ? '#81c784' : '#ffab91', fontSize: 13 }}>• {gameStarted ? 'Jogo INICIADO' : 'Jogo NÃO iniciado'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={async () => { await startGame(); }}
            style={btnPrimary}
            title="Iniciar jogo (libera a tela do quiz)"
            disabled={gameStarted}
          >
            ▶️ Iniciar Jogo
          </button>
          <button
            onClick={async () => { await stopGame(); await closeRound(); }}
            style={btnWarn}
            title="Encerrar jogo (volta para tela de boas-vindas)"
            disabled={!gameStarted}
          >
            ■ Encerrar Jogo
          </button>
          <button
            onClick={async () => { await openRound(); }}
            style={btnPrimary}
            title="Abrir rodada (permitir respostas)"
            disabled={roundOpen}
          >
            🔓 Abrir Rodada
          </button>
          <button
            onClick={async () => { await closeRound(); }}
            style={btnWarn}
            title="Fechar rodada (bloquear respostas)"
            disabled={!roundOpen}
          >
            🔒 Fechar Rodada
          </button>
          <button
            onClick={async () => { 
              // Ao avançar, feche a rodada para que os jogadores aguardem até você abrir novamente
              await closeRound();
              await incrementCurrentQuestion();
            }}
            style={btnStyle}
            title="Ir para a próxima pergunta (rodada é fechada ao avançar)"
          >
            ▶️ Próxima Pergunta
          </button>
          <button
            onClick={() => document.documentElement.requestFullscreen?.()}
            style={btnStyle}
            title="Tela cheia"
          >
            ⛶ Tela Cheia
          </button>
          <button
            onClick={() => window.location.reload()}
            style={btnStyle}
            title="Atualizar"
          >
            ↻ Atualizar
          </button>
          <button
            onClick={async () => { 
              const ok = confirm('Você tem certeza? Isso vai zerar TUDO (respostas e participantes) e voltar para a questão 1.');
              if (!ok) return;
              const ts = await startNewGame();
              setTip(`Nova partida criada (${new Date(ts).toLocaleString()}). Peça para todos se cadastrarem de novo.`);
            }}
            style={btnWarn}
            title="Nova partida: zera respostas e participantes e volta para a questão 1"
          >
            🔄 Nova Partida
          </button>
          <button
            onClick={() => setShowBoard((v) => !v)}
            style={btnPrimary}
            title="Exibir/ocultar classificação ao vivo"
          >
            🏆 Placar ao Vivo
          </button>
        </div>
      </header>
      {tip && (
        <div style={{
          marginTop: -8,
          marginBottom: 12,
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#c8e6c9',
          fontSize: 13
        }}>
          {tip}
        </div>
      )}

      <></>

      {/* Placar da Rodada (ao vivo) */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: '#a5d6a7', fontSize: 18 }}>Placar da Rodada • Pergunta {currentQuestion + 1}</h2>
          <div style={{ color: '#c8e6c9' }}>Total respostas: <strong>{roundCounts.total || 0}</strong></div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}>
          {['A', 'B', 'C', 'D'].map((label, idx) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '12px 14px',
              color: '#e8f5e9',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>Opção {label}</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{roundCounts[idx] || 0}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, color: '#c8e6c9', fontSize: 12 }}>
          Atualiza em tempo real conforme os jogadores respondem. Cada jogador pode alterar sua resposta enquanto a rodada estiver ABERTA (contagem se ajusta automaticamente).
        </div>
      </div>

      {/* Participantes */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8
        }}>
          <h2 style={{ margin: 0, color: '#a5d6a7', fontSize: 18 }}>Participantes ({participants?.length || 0})</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportParticipantsCSV} style={btnStyle} title="Exportar CSV">⬇️ Exportar CSV</button>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr 0.8fr 200px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.06)',
            color: '#e8f5e9',
            fontWeight: 700,
          }}>
            <div>Nome</div>
            <div>Email</div>
            <div>Telefone</div>
            <div style={{ textAlign: 'right' }}>Quando</div>
          </div>
          <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
            {participants && participants.length > 0 ? (
              participants.map((p) => (
                <div key={p.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.2fr 0.8fr 200px',
                  padding: '10px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  color: '#c8e6c9',
                }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.phone}</div>
                  <div style={{ textAlign: 'right' }}>{p.timestamp ? new Date(p.timestamp).toLocaleString() : '-'}</div>
                </div>
              ))
            ) : (
              <div style={{ padding: 16, color: '#c8e6c9' }}>Nenhum participante cadastrado ainda.</div>
            )}
          </div>
        </div>
      </div>

      <footer style={{ marginTop: 16, opacity: 0.7, color: '#a5d6a7', fontSize: 12 }}>
        Atualiza em tempo real via Firebase Realtime Database
      </footer>

      {showBoard && (
        <div style={overlayStyle} onClick={() => setShowBoard(false)}>
          <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: '#e8f5e9', fontSize: 22 }}>Classificação ao Vivo</h2>
              <button onClick={() => setShowBoard(false)} style={btnPrimary}>✕ Fechar</button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr 140px 120px 140px',
              padding: '14px 18px',
              background: 'rgba(255,255,255,0.08)',
              color: '#e8f5e9',
              fontWeight: 700,
              borderRadius: 10,
              fontSize: 15
            }}>
              <div>#</div>
              <div>Nome</div>
              <div style={{ textAlign: 'right' }}>Acertos</div>
              <div style={{ textAlign: 'right' }}>%</div>
              <div style={{ textAlign: 'right' }}>Pontos</div>
            </div>
            <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {liveBoard && liveBoard.length > 0 ? (
                liveBoard.map((p, index) => (
                  <div key={p.clientId || index} style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr 140px 120px 140px',
                    padding: '12px 18px',
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                    color: index < 3 ? '#e8f5e9' : '#d5ecd6',
                    background: index < 3 ? 'rgba(46,125,50,0.25)' : 'rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ fontWeight: 700 }}>{index + 1}º</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || '(Sem nome)'}</div>
                    <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.correct}</div>
                    <div style={{ textAlign: 'right', color: '#81c784', fontVariantNumeric: 'tabular-nums' }}>{(p.percentage || 0).toFixed(1)}%</div>
                    <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{(p.points || 0).toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 16, color: '#c8e6c9' }}>Sem respostas ainda.</div>
              )}
            </div>
            <div style={{ marginTop: 10, color: '#c8e6c9', fontSize: 12 }}>
              Ordenação: Pontos (1 + bônus de tempo por acerto), depois Acertos, depois %, depois quem respondeu mais cedo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle = {
  background: 'rgba(255,255,255,0.08)',
  color: '#e8f5e9',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '8px 12px',
  cursor: 'pointer',
};

const btnPrimary = {
  background: '#2e7d32',
  color: '#ffffff',
  border: '1px solid #1b5e20',
  borderRadius: 8,
  padding: '8px 12px',
  cursor: 'pointer',
  fontWeight: 600,
};

const btnWarn = {
  background: '#8d6e63',
  color: '#ffffff',
  border: '1px solid #6d4c41',
  borderRadius: 8,
  padding: '8px 12px',
  cursor: 'pointer',
};

export default AdminDashboard;

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 1000,
};

const panelStyle = {
  width: 'min(1100px, 96vw)',
  background: '#112417',
  border: '2px solid #2e7d32',
  borderRadius: 14,
  padding: 18,
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
};
