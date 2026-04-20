import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { Quiz, Question, QuizResult } from '../types';
import { 
  Clock, AlertCircle, ChevronRight, ChevronLeft, 
  CheckCircle2, XCircle, Info, Loader2, Maximize2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';

export default function QuizSession() {
  const { quizId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [status, setStatus] = useState<'intro' | 'active' | 'submitting' | 'result'>('intro');
  const [finalResult, setFinalResult] = useState<QuizResult | null>(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (quizId) fetchQuizData();
  }, [quizId]);

  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 0) {
            clearInterval(timerRef.current!);
            handleSubmit();
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }

    const preventBack = (e: BeforeUnloadEvent) => {
      if (status === 'active') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', preventBack);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('beforeunload', preventBack);
    };
  }, [status]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && status === 'active') {
        setTabSwitches(prev => {
          const next = prev + 1;
          toast.error(`Warning: Tab switched (${next}). This event is logged.`, { duration: 4000 });
          return next;
        });
      }
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      if (status === 'active') {
        e.preventDefault();
        setCopyAttempts(prev => prev + 1);
        toast.error("Copy-paste is disabled during the test.");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
    };
  }, [status]);

  const fetchQuizData = async () => {
    if (!quizId) return;
    try {
      const qDoc = await getDoc(doc(db, 'quizzes', quizId));
      if (!qDoc.exists()) {
        toast.error("Quiz not found");
        navigate('/student-dashboard');
        return;
      }
      const data = qDoc.data();
      setQuiz({ id: qDoc.id, ...data } as Quiz);

      const qsSnap = await getDocs(collection(db, `quizzes/${quizId}/questions`));
      const qsList = qsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      setQuestions(qsList);
    } catch (error) {
      toast.error("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    if (!quiz) return;
    setStatus('active');
    setTimeLeft(quiz.timeLimit);
  };

  const handleSubmit = async () => {
    if (status === 'submitting' || status === 'result') return;
    setStatus('submitting');
    if (timerRef.current) clearInterval(timerRef.current);

    let score = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) score++;
    });

    const teacherId = quiz?.teacherId || 'unknown';
    if (teacherId === 'unknown') {
      console.error("Critical: teacherId missing from quiz doc", quiz);
    }

    const resultData: QuizResult = {
      quizId: quizId!,
      quizTitle: quiz!.title,
      studentId: profile!.uid,
      studentName: profile!.displayName,
      teacherId: teacherId,
      score,
      totalQuestions: questions.length,
      timeTaken: quiz!.timeLimit - (timeLeft || 0),
      attemptedAt: new Date().toISOString(),
      tabSwitches,
      copyAttempts
    };

    try {
      const docRef = await addDoc(collection(db, 'results'), resultData);
      setFinalResult({ ...resultData, id: docRef.id });
      setStatus('result');
      if (score / questions.length >= 0.7) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
    } catch (error) {
      toast.error("Failed to submit result");
      setStatus('active');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <FullScreenLoader />;

  if (status === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-[3rem] shadow-xl max-w-xl w-full text-center border border-neutral-100">
          <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-black/10">
            <Info className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">{quiz?.title}</h1>
          <p className="text-neutral-500 mb-10 text-lg leading-relaxed">{quiz?.description}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-10 text-left">
            <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
              <span className="block text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1">Time Limit</span>
              <span className="text-xl font-bold">{quiz ? formatTime(quiz.timeLimit) : '--'}</span>
            </div>
            <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
              <span className="block text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1">Questions</span>
              <span className="text-xl font-bold">{questions.length} Items</span>
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-amber-800 text-sm mb-10 flex gap-4 items-start text-left">
            <AlertCircle className="shrink-0" />
            <p>Anti-cheating is active. Tab switching and copy-pasting are monitored and recorded.</p>
          </div>

          <button onClick={startQuiz} className="w-full btn-primary h-16 text-xl shadow-lg shadow-black/20">
            Start Assessment
          </button>
        </motion.div>
      </div>
    );
  }

  if (status === 'result') {
    const percentage = Math.round((finalResult!.score / finalResult!.totalQuestions) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 rounded-[3rem] shadow-xl max-w-2xl w-full text-center border border-neutral-100">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${percentage >= 70 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {percentage >= 70 ? <CheckCircle2 size={60} /> : <XCircle size={60} />}
          </div>
          
          <h1 className="text-4xl font-bold mb-2 tracking-tight">Quiz Complete!</h1>
          <p className="text-neutral-500 mb-10 text-lg">You've successfully completed the assessment.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="p-6 bg-neutral-50 rounded-3xl text-center">
              <span className="block text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1">Score</span>
              <span className="text-3xl font-bold">{finalResult?.score}/{finalResult?.totalQuestions}</span>
            </div>
            <div className="p-6 bg-neutral-50 rounded-3xl text-center">
              <span className="block text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1">Accuracy</span>
              <span className="text-3xl font-bold">{percentage}%</span>
            </div>
            <div className="p-6 bg-neutral-50 rounded-3xl text-center">
              <span className="block text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1">Time Taken</span>
              <span className="text-3xl font-bold text-neutral-800">{finalResult ? formatTime(finalResult.timeTaken) : '--'}</span>
            </div>
          </div>

          <div className="space-y-4">
             {percentage >= 70 && (
               <button className="w-full h-16 rounded-3xl border-2 border-black text-black font-bold text-lg hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2">
                 Download Certificate
               </button>
             )}
             <button onClick={() => navigate('/student-dashboard')} className="w-full btn-primary h-16 text-xl">
               Back to Dashboard
             </button>
          </div>
          
          {tabSwitches > 0 && (
            <p className="mt-6 text-xs text-red-400 italic">Notice: {tabSwitches} integrity warnings were recorded during this session.</p>
          )}
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Quiz Header */}
      <header className="h-20 border-b border-neutral-100 px-10 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-black rounded-lg text-white">
            <Clock size={20} className={timeLeft && timeLeft < 60 ? 'text-red-400 animate-pulse' : ''} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Time Remaining</p>
            <p className={`text-xl font-mono font-bold ${timeLeft && timeLeft < 60 ? 'text-red-500' : 'text-black'}`}>
              {timeLeft !== null ? formatTime(timeLeft) : '00:00'}
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-10">
          <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
             <motion.div 
               initial={false}
               animate={{ width: `${(currentIndex / questions.length) * 100}%` }}
               className="h-full bg-black" 
             />
          </div>
          <p className="text-center text-[10px] font-bold text-neutral-400 mt-2 uppercase tracking-tight">Question {currentIndex + 1} of {questions.length}</p>
        </div>

        <div className="w-10" /> {/* Spacer instead of exit button */}
      </header>

      {/* Quiz Body */}
      <main className="flex-1 flex max-w-5xl mx-auto w-full p-10 gap-10">
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-neutral-800">
                {currentQuestion?.text}
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {currentQuestion?.options.map((option, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setAnswers({ ...answers, [currentIndex]: idx })}
                    className={`group flex items-center p-6 rounded-3xl border-2 transition-all text-left ${
                      answers[currentIndex] === idx 
                        ? 'border-black bg-black text-white shadow-lg' 
                        : 'border-neutral-100 hover:border-black/20 hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full border flex items-center justify-center mr-4 font-bold text-xs ${
                      answers[currentIndex] === idx ? 'border-white/30 bg-white/10' : 'border-neutral-200 bg-neutral-50 text-neutral-400'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-semibold text-lg">{option}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Side Panel: Progress Grid */}
        <aside className="w-72 hidden lg:block">
           <div className="sticky top-32 p-6 bg-neutral-50 rounded-[2.5rem] border border-neutral-100">
              <h3 className="font-bold text-sm mb-6 uppercase tracking-wider text-neutral-400">Jump to</h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`aspect-square rounded-xl text-xs font-bold transition-all ${
                      currentIndex === idx ? 'bg-black text-white ring-4 ring-black/10' :
                      answers[idx] !== undefined ? 'bg-white border-2 border-green-500 text-green-500' :
                      'bg-white border border-neutral-200 text-neutral-400 hover:border-black'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <div className="mt-10 pt-6 border-t border-neutral-200 space-y-4">
                 <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase">
                    <div className="w-3 h-3 rounded-full bg-green-500" /> Answered
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase">
                    <div className="w-3 h-3 rounded-full bg-neutral-200" /> Pending
                 </div>
              </div>
           </div>
        </aside>
      </main>

      {/* Quiz Footer */}
      <footer className="h-24 border-t border-neutral-100 px-10 flex items-center justify-between bg-white/80 backdrop-blur-xl">
        <button 
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(prev => prev - 1)}
          className="flex items-center gap-2 p-3 px-6 rounded-2xl border border-neutral-200 font-bold hover:bg-neutral-50 disabled:opacity-30"
        >
          <ChevronLeft /> Back
        </button>

        <div className="flex gap-4">
          {currentIndex === questions.length - 1 ? (
            <button 
              onClick={handleSubmit} 
              className="px-10 h-14 bg-emerald-500 text-white rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              Finish & Submit <CheckCircle2 size={20} />
            </button>
          ) : (
            <button 
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="px-10 h-14 bg-black text-white rounded-2xl font-bold text-lg flex items-center gap-2 hover:opacity-90 transition-all"
            >
              Next Question <ChevronRight size={20} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white space-y-4">
      <Loader2 className="animate-spin text-neutral-800" size={40} />
      <p className="text-xs font-mono tracking-widest text-neutral-400 uppercase">SYNCHRONIZING_CORE...</p>
    </div>
  );
}
