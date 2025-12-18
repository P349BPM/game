import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, set, get } from "firebase/database";
import questions from "../data/questions.json";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBQVmXvWcRAYLldc7oLikpyL36kcIjSqsM",
  authDomain: "quiz-f1a95.firebaseapp.com",
  projectId: "quiz-f1a95",
  storageBucket: "quiz-f1a95.appspot.com",
  messagingSenderId: "386800486337",
  appId: "1:386800486337:web:76a37bcc90c11758e81140",
  measurementId: "G-W34BLGM0Z4",
  databaseURL: "https://quiz-f1a95-default-rtdb.firebaseio.com/",
};

// Ranking ao vivo: computa acertos cumulativos por participante até a pergunta atual
export const useLiveLeaderboard = (currentQuestionIndex) => {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (typeof currentQuestionIndex !== 'number') return;
    const answersRef = ref(db, "answers");
    const unsub = onValue(answersRef, (snapshot) => {
      const all = snapshot.val() || {};
      const lastQ = Math.min(currentQuestionIndex, questions.length - 1);
      const totals = {}; // clientId -> {name,email,phone,correct,answered,points,lastTs}

      for (let q = 0; q <= lastQ; q++) {
        const byClient = all[q] || {};
        Object.keys(byClient).forEach((clientId) => {
          const ans = byClient[clientId];
          if (!totals[clientId]) {
            totals[clientId] = {
              clientId,
              name: ans.name || '',
              email: ans.email || '',
              phone: ans.phone || '',
              correct: 0,
              answered: 0,
              points: 0,
              lastTs: 0,
            };
          }
          const t = totals[clientId];
          t.answered += 1;
          if (typeof ans.ts === 'number') t.lastTs = Math.max(t.lastTs, ans.ts);
          if (typeof ans.optionIndex === 'number' && questions[q] && ans.optionIndex === questions[q].correctAnswer) {
            t.correct += 1;
            const dur = (typeof ans.timerDuration === 'number' && ans.timerDuration > 0) ? ans.timerDuration : 20;
            const tl = (typeof ans.timeLeft === 'number' && ans.timeLeft >= 0) ? ans.timeLeft : 0;
            const timeBonus = Math.max(0, Math.min(1, tl / dur));
            t.points += 1 + timeBonus; // mesma regra do App: 1 ponto + bônus proporcional ao tempo restante
          }
        });
      }

      const released = lastQ + 1; // número de perguntas liberadas
      const list = Object.values(totals).map((t) => ({
        ...t,
        percentage: released > 0 ? (t.correct / released) * 100 : 0,
        points: Number(t.points.toFixed(2)),
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.correct !== a.correct) return b.correct - a.correct;
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return (a.lastTs || 0) - (b.lastTs || 0);
      });

      setLeaderboard(list);
    });
    return () => unsub();
  }, [currentQuestionIndex]);

  return leaderboard;
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Hook customizado para usar o ranking
export const useRanking = () => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rankingRef = ref(db, "rankings");

    const unsubscribe = onValue(rankingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedRanking = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
          }))
          .sort((a, b) => b.score - a.score);
        setRanking(loadedRanking);
      } else {
        setRanking([]); // evita mostrar ranking antigo
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Salva a pontuação no ranking
  const saveScore = async (playerData) => {
    try {
      console.log('1. Iniciando salvamento da pontuação...');
      console.log('2. Dados recebidos:', JSON.stringify(playerData, null, 2));
      
      const newScore = {
        ...playerData,
        date: new Date().toLocaleString("pt-BR"),
        timestamp: Date.now(),
      };
      
      console.log('3. Dados formatados para salvar:', JSON.stringify(newScore, null, 2));
      
      const dbRef = ref(db, "rankings");
      console.log('4. Referência do banco de dados criada');
      
      console.log('5. Tentando enviar dados para o Firebase...');
      const result = await push(dbRef, newScore);
      
      if (result && result.key) {
        console.log('6. Pontuação salva com sucesso! ID:', result.key);
        return true;
      } else {
        console.error('6. Erro: Não foi possível obter a chave do registro salvo');
        throw new Error('Não foi possível obter a chave do registro salvo');
      }
    } catch (error) {
      console.error('Erro ao salvar pontuação:', error);
      if (error.code) {
        console.error('Código do erro:', error.code);
        console.error('Mensagem do erro:', error.message);
        console.error('Detalhes do erro:', error.details);
      }
      throw error;
    }
  };

  return { ranking, loading, saveScore };
};

// ==========================
// Controle do jogo em tempo real (apresentador)
// ==========================

// Hook para acompanhar a pergunta atual liberada pelo apresentador
export const useGameControl = () => {
  const [currentQuestion, setCurrentQuestionState] = useState(0);
  const [roundOpen, setRoundOpen] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrlQuestionRef = ref(db, "gameControl/currentQuestion");
    const ctrlRoundRef = ref(db, "gameControl/roundOpen");
    const ctrlStartedRef = ref(db, "gameControl/gameStarted");
    const ctrlSessionRef = ref(db, "gameControl/sessionId");

    const unsubQ = onValue(ctrlQuestionRef, (snapshot) => {
      const value = snapshot.val();
      if (typeof value === 'number') {
        setCurrentQuestionState(value);
      } else {
        setCurrentQuestionState(0);
      }
      setLoading(false);
    });

    const unsubR = onValue(ctrlRoundRef, (snapshot) => {
      const value = snapshot.val();
      setRoundOpen(Boolean(value));
    });

    const unsubS = onValue(ctrlStartedRef, (snapshot) => {
      const value = snapshot.val();
      setGameStarted(Boolean(value));
    });

    const unsubSess = onValue(ctrlSessionRef, (snapshot) => {
      const value = snapshot.val();
      setSessionId(value || null);
    });

    return () => { unsubQ(); unsubR(); unsubS(); unsubSess(); };
  }, []);

  // Define explicitamente o índice da pergunta atual
  const setCurrentQuestion = async (index) => {
    const ctrlRef = ref(db, "gameControl/currentQuestion");
    await set(ctrlRef, Number(index) || 0);
  };

  // Incrementa para próxima pergunta (lê e grava)
  const incrementCurrentQuestion = async () => {
    const ctrlRef = ref(db, "gameControl/currentQuestion");
    const snap = await get(ctrlRef);
    const value = snap.exists() && typeof snap.val() === 'number' ? snap.val() : 0;
    await set(ctrlRef, value + 1);
  };

  // Reseta o controle para 0 (útil ao reiniciar o jogo)
  const resetControl = async () => {
    const ctrlRef = ref(db, "gameControl/currentQuestion");
    await set(ctrlRef, 0);
  };

  // Controle da rodada (aberta/fechada)
  const setRoundOpenFlag = async (flag) => {
    const ctrlRef = ref(db, "gameControl/roundOpen");
    await set(ctrlRef, !!flag);
  };

  const openRound = async () => setRoundOpenFlag(true);
  const closeRound = async () => setRoundOpenFlag(false);
  const toggleRound = async () => setRoundOpenFlag(!roundOpen);

  // Controle do início do jogo (tela de espera)
  const setGameStartedFlag = async (flag) => {
    const ctrlRef = ref(db, "gameControl/gameStarted");
    await set(ctrlRef, !!flag);
  };
  const startGame = async () => setGameStartedFlag(true);
  const stopGame = async () => setGameStartedFlag(false);

  // Nova partida: limpa respostas e participantes e reseta controle
  const startNewGame = async () => {
    const ts = Date.now();
    await Promise.all([
      set(ref(db, "answers"), null),
      set(ref(db, "participants"), null),
      set(ref(db, "gameControl/currentQuestion"), 0),
      set(ref(db, "gameControl/roundOpen"), false),
      set(ref(db, "gameControl/gameStarted"), false),
      set(ref(db, "gameControl/sessionId"), ts),
    ]);
    return ts;
  };

  return {
    currentQuestion,
    loading,
    roundOpen,
    gameStarted,
    sessionId,
    setCurrentQuestion,
    incrementCurrentQuestion,
    resetControl,
    openRound,
    closeRound,
    toggleRound,
    startGame,
    stopGame,
    startNewGame,
  };
};

// ==========================
// Participantes (cadastro)
// ==========================
const PHONE_LENGTH = 11; // exige exatamente 11 dígitos numéricos (BR/WhatsApp)

export const registerParticipant = async ({ name, email, phone }) => {
  const participantsRef = ref(db, "participants");
  const rawName = String(name || '').trim();
  const rawEmail = String(email || '').trim();
  const rawPhone = String(phone || '');
  const digits = rawPhone.replace(/\D/g, '');
  const sanitizedPhone = digits.slice(0, PHONE_LENGTH);

  if (!rawName) {
    throw new Error('Preencha seu nome');
  }

  const cleaned = {
    name: rawName.slice(0, 60),
    email: rawEmail ? rawEmail.slice(0, 120) : '',
    phone: sanitizedPhone.length === PHONE_LENGTH ? sanitizedPhone : '',
    timestamp: Date.now(),
  };
  const res = await push(participantsRef, cleaned);
  if (res && res.key) {
    try { localStorage.setItem('participant_key', res.key); } catch {}
  }
  return res?.key || true;
};

export const useParticipants = () => {
  const [participants, setParticipants] = useState([]);
  useEffect(() => {
    const participantsRef = ref(db, "participants");
    const unsub = onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.keys(data).map(k => ({ id: k, ...data[k] }))
          .sort((a, b) => a.timestamp - b.timestamp);
        setParticipants(arr);
      } else {
        setParticipants([]);
      }
    });
    return () => unsub();
  }, []);
  return { participants };
};

// ==========================
// Respostas da rodada (ao vivo)
// ==========================

// Gera ou recupera um clientId estável para o navegador
const ensureClientId = () => {
  try {
    let id = localStorage.getItem('client_id');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('client_id', id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
};

// Envia/atualiza a resposta do cliente para a pergunta atual
export const submitAnswer = async ({ questionIndex, optionIndex, timeLeft, timerDuration }) => {
  const clientId = ensureClientId();
  const name = (() => { try { return localStorage.getItem('player_name') || ''; } catch { return ''; } })();
  const email = (() => { try { return localStorage.getItem('player_email') || ''; } catch { return ''; } })();
  const phone = (() => { try { return localStorage.getItem('player_phone') || ''; } catch { return ''; } })();

  const answerRef = ref(db, `answers/${questionIndex}/${clientId}`);
  await set(answerRef, {
    optionIndex: Number(optionIndex),
    name, email, phone,
    timeLeft: typeof timeLeft === 'number' ? timeLeft : null,
    timerDuration: typeof timerDuration === 'number' ? timerDuration : null,
    ts: Date.now(),
  });
};

// Hook para estatísticas ao vivo da rodada (contagem por alternativa)
export const useRoundStats = (questionIndex) => {
  const [counts, setCounts] = useState({ total: 0 });
  useEffect(() => {
    if (typeof questionIndex !== 'number') return;
    const ansRef = ref(db, `answers/${questionIndex}`);
    const unsub = onValue(ansRef, (snapshot) => {
      const data = snapshot.val() || {};
      const optionsLen = (questions?.[questionIndex]?.options?.length || 4);
      const c = { total: 0 };
      for (let i = 0; i < optionsLen; i++) c[i] = 0;
      Object.keys(data).forEach((k) => {
        const v = data[k];
        if (!v || typeof v.optionIndex !== 'number') return;
        if (v.optionIndex < 0 || v.optionIndex >= optionsLen) return;
        c[v.optionIndex] += 1;
        c.total += 1;
      });
      setCounts(c);
    });
    return () => unsub();
  }, [questionIndex]);
  return counts;
};