import { useEffect, useRef, useState } from 'react';
import questions from './data/questions.json';
import '../src/App.css';
import FinalScreen from './components/FinalScreen';
import { submitAnswer } from './firebase/RankingService';
import WelcomeScreen from './components/WelcomeScreen';


const TIMER_DURATION = 240;
const REVIEW_SECONDS = 15;

// Sons alternativos como fallback (caso os arquivos locais não sejam encontrados)
const DEFAULT_SOUNDS = {
  correct: 'https://www.soundjay.com/buttons/sounds/button-09.mp3',
  wrong: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3'
};

function App() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [playerReady, setPlayerReady] = useState(() => {
    try { return Boolean((localStorage.getItem('player_name') || '').trim()); } catch { return false; }
  });
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isDisabled, setIsDisabled] = useState(false);
  const [showContinue, setShowContinue] = useState(false); // Substitui o isPaused
  const [lastPointsEarned, setLastPointsEarned] = useState(null); // feedback da rodada
  const [justOpened, setJustOpened] = useState(false); // evita hover/click instantâneo ao abrir
  const [reviewLeft, setReviewLeft] = useState(null); // contagem regressiva (segundos) para ver a resposta correta
  const reviewIntervalRef = useRef(null);
  const reviewTimeoutRef = useRef(null);
  
  const question = questions[questionIndex] || null;

  // Função para tocar som (com fallback se o som local falhar)
  const playSound = (isCorrect) => {
    try {
      let soundUrl;

      if (isCorrect) {
        try {
          soundUrl = require('./assets/correct.mp3');
        } catch {
          soundUrl = DEFAULT_SOUNDS.correct;
        }
      } else {
        try {
          soundUrl = require('./assets/wrong.mp3');
        } catch {
          soundUrl = DEFAULT_SOUNDS.wrong;
        }
      }

      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Erro ao reproduzir som:", e));
    } catch (error) {
      console.log("Erro no sistema de áudio:", error);
    }
  };

  // Timer regressivo só quando a rodada está ABERTA
  useEffect(() => {
    if (!playerReady) return;
    if (isDisabled || showContinue || !question || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsDisabled(true);
          setShowContinue(true);
          playSound(false); // Som de tempo esgotado
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questionIndex, isDisabled, showContinue, question, playerReady, isFinished]);

  // Reset de estado ao abrir a rodada para a pergunta corrente
  useEffect(() => {
    if (!playerReady) return;
    if (question && !isFinished) {
      setTimeLeft(TIMER_DURATION);
      setSelectedOption(null);
      setIsDisabled(false);
      setShowContinue(false);
      setLastPointsEarned(null);
      setReviewLeft(null);
      // Janela curta para evitar realce/hover ao abrir nova pergunta
      setJustOpened(true);
      const t = setTimeout(() => setJustOpened(false), 350);
      return () => clearTimeout(t);
    }
  }, [questionIndex, question, playerReady, isFinished]);

  // Garante limpeza dos timers da revisão (interval/timeout) ao trocar de pergunta, reiniciar ou desmontar
  useEffect(() => {
    return () => {
      if (reviewIntervalRef.current) {
        clearInterval(reviewIntervalRef.current);
        reviewIntervalRef.current = null;
      }
      if (reviewTimeoutRef.current) {
        clearTimeout(reviewTimeoutRef.current);
        reviewTimeoutRef.current = null;
      }
    };
  }, [questionIndex, playerReady, isFinished]);

  // ao trocar de pergunta, sempre limpa a seleção para evitar "marcada" de rodada anterior
  useEffect(() => {
    setSelectedOption(null);
  }, [questionIndex]);

  // Finaliza quando o apresentador passar do total de perguntas
  useEffect(() => {
    setIsFinished(questionIndex >= questions.length);
  }, [questionIndex]);

  const goNextQuestion = () => {
    setQuestionIndex((prev) => prev + 1);
  };

  const beginReview = () => {
    setIsDisabled(true);
    setShowContinue(true);

    // Alguns navegadores/devices podem throttlar/pausar timeouts de forma estranha.
    // Aqui usamos um interval dedicado + um timeout de segurança para garantir avanço.
    const start = Number(REVIEW_SECONDS);
    setReviewLeft(start);

    if (reviewIntervalRef.current) {
      clearInterval(reviewIntervalRef.current);
      reviewIntervalRef.current = null;
    }
    if (reviewTimeoutRef.current) {
      clearTimeout(reviewTimeoutRef.current);
      reviewTimeoutRef.current = null;
    }

    reviewIntervalRef.current = setInterval(() => {
      setReviewLeft((prev) => {
        const n = Number(prev);
        if (!Number.isFinite(n)) return null;
        const next = n - 1;
        if (next <= 0) {
          if (reviewIntervalRef.current) {
            clearInterval(reviewIntervalRef.current);
            reviewIntervalRef.current = null;
          }
          if (reviewTimeoutRef.current) {
            clearTimeout(reviewTimeoutRef.current);
            reviewTimeoutRef.current = null;
          }
          setShowContinue(false);
          // Mantém o comportamento: avança para a próxima questão ao final da revisão
          setTimeout(() => {
            setReviewLeft(null);
            goNextQuestion();
          }, 0);
          return 0;
        }
        return next;
      });
    }, 1000);

    reviewTimeoutRef.current = setTimeout(() => {
      // fallback caso o interval seja interrompido
      if (reviewIntervalRef.current) {
        clearInterval(reviewIntervalRef.current);
        reviewIntervalRef.current = null;
      }
      if (reviewTimeoutRef.current) {
        clearTimeout(reviewTimeoutRef.current);
        reviewTimeoutRef.current = null;
      }
      setShowContinue(false);
      setReviewLeft(null);
      goNextQuestion();
    }, start * 1000 + 250);
  };

  // Quando o tempo acabar, o candidato perde a questão e avança automaticamente
  useEffect(() => {
    if (!playerReady) return;
    if (isFinished) return;
    if (!question) return;
    if (timeLeft !== 0) return;
    if (lastPointsEarned !== null) return;

    setLastPointsEarned(0);
    beginReview();
  }, [timeLeft, playerReady, isFinished, question, lastPointsEarned]);

  const handleOptionClick = (index) => {
    if (isDisabled || !question || isFinished) return;

    setSelectedOption(index);
    beginReview();

    // Envia a resposta para o placar da rodada ao vivo (com tempo para bônus)
    try { submitAnswer({ questionIndex, optionIndex: index, timeLeft, timerDuration: TIMER_DURATION }); } catch {}

    const isCorrect = index === question.correctAnswer;
    const timeBonus = Math.max(0, Math.min(1, timeLeft / TIMER_DURATION));
    const pointsEarned = isCorrect ? (1 + timeBonus) : 0;
    if (isCorrect) playSound(true);
    else playSound(false);
    setScore((prev) => prev + pointsEarned);
    setAnsweredCount((prev) => prev + 1);
    if (isCorrect) setCorrectCount((prev) => prev + 1);
    setLastPointsEarned(pointsEarned);
  };

  const handleRestart = () => {
    setScore(0);
    setAnsweredCount(0);
    setCorrectCount(0);
    setIsFinished(false);
    setShowContinue(false);
    setQuestionIndex(0);
    setTimeLeft(TIMER_DURATION);
    setSelectedOption(null);
    setIsDisabled(false);
    setLastPointsEarned(null);
  };

  const optionLetters = ['A', 'B', 'C', 'D', 'E'];

  // Tela de boas-vindas antes de o jogo iniciar
  if (!playerReady) {
    return (
      <div className="app-container">
        <h1 className="title">Quiz - Vá e vença, sem medo!</h1>
        <WelcomeScreen onRegistered={() => setPlayerReady(true)} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1 className="title">Quiz - Vá e vença, sem medo!</h1>

{isFinished ? (
  <FinalScreen 
    score={score} 
    total={questions.length} 
    answeredCount={answeredCount}
    correctCount={correctCount}
    onRestart={handleRestart}
  />
) : (
  // ... resto do código
        <>
          <div className="top-bar">
            <div className="score">🎯 Pontuação: {score.toFixed(2)}</div>
            <div className="timer">⏱️ {!question ? '--' : `${timeLeft}s`}</div>
          </div>

          <div className="question-box">
            <h2 className="question-text">{question ? question.question : 'Finalizando...'}</h2>
            <div className="options">
              {question && question.options.map((opt, index) => (
                <button
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  disabled={isDisabled}
                  className={`option-btn ${
                    showContinue && question && index === question.correctAnswer
                      ? 'correct'
                      : selectedOption === index
                        ? index === question.correctAnswer
                          ? 'correct'
                          : 'incorrect'
                        : ''
                  }`}
                  style={{ pointerEvents: justOpened ? 'none' : 'auto' }}
                >
                  <span className="letter">{optionLetters[index]}.</span> {opt}
                </button>
              ))}
            </div>
            
            {showContinue && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  fontSize: '1.1rem',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  ✅ Resposta correta: {question ? `${optionLetters[question.correctAnswer]}. ${question.options[question.correctAnswer]}` : '--'}
                </div>
                <div style={{ marginTop: 6, fontSize: '0.98rem', color: '#c8e6c9' }}>
                  Próxima questão em: <strong>{typeof reviewLeft === 'number' ? `${reviewLeft}s` : '--'}</strong>
                </div>
                {lastPointsEarned !== null && (
                  <div style={{ marginTop: 8, fontSize: '0.95rem', color: lastPointsEarned > 0 ? '#81c784' : '#ffcdd2' }}>
                    {lastPointsEarned > 0 ? `+${lastPointsEarned.toFixed(2)} pontos` : '+0.00 pontos'}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

}

export default App;