import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, limit, onSnapshot } from 'firebase/firestore';
import { Quiz, Question, QuizResult } from '../types';
import { 
  Plus, Brain, Trash2, ChevronRight, Clock, 
  BarChart3, Users, BookOpen, Search, X, Loader2, Sparkles, Wand2,
  LayoutDashboard, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { generateQuizQuestions } from '../services/geminiService';
import { Link } from 'react-router-dom';

export default function TeacherDashboard() {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quizzes' | 'students' | 'analytics'>('dashboard');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');
  const [manualQuestions, setManualQuestions] = useState<Question[]>([
    { text: '', options: ['', '', '', ''], correctIndex: 0 }
  ]);
  
  // Create Quiz Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(600); // Default 10 min
  const [aiTopic, setAiTopic] = useState('');
  const [qCount, setQCount] = useState(5);

  useEffect(() => {
    if (!profile) return;

    // Quizzes listener
    const qQuizzes = query(collection(db, 'quizzes'), where('teacherId', '==', profile.uid));
    const unsubscribeQuizzes = onSnapshot(qQuizzes, (snapshot) => {
      const quizList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
      setQuizzes(quizList);
      setLoading(false);
    }, (error) => {
      console.error("Quizzes listener error:", error);
      toast.error("Failed to sync quizzes");
    });

    // Results listener
    const qResults = query(collection(db, 'results'), where('teacherId', '==', profile.uid));
    const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
      const resultList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
      setAllResults(resultList);
    }, (error) => {
      console.error("Results listener error:", error);
    });

    return () => {
      unsubscribeQuizzes();
      unsubscribeResults();
    };
  }, [profile]);

  const fetchQuizzes = async () => {
    // This is now handled by onSnapshot
  };

  const avgDashboardScore = allResults.length > 0 
    ? Math.round((allResults.reduce((acc, r) => acc + (r.score / (r.totalQuestions || 1)), 0) / allResults.length) * 100)
    : 0;

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (creationMode === 'ai') {
      if (!aiTopic) return toast.error("Topic is required");
      setIsGenerating(true);
      try {
        const generatedQuestions = await generateQuizQuestions(aiTopic, qCount);
        await saveQuizToDb(generatedQuestions, title || `AI Quiz: ${aiTopic}`, description || `Generated about ${aiTopic}`);
        toast.success("AI Quiz generated successfully!");
        setShowCreateModal(false);
        resetForm();
        fetchQuizzes();
      } catch (error) {
        toast.error("AI Generation failed");
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Manual Mode
      if (!title) return toast.error("Title is required");
      if (manualQuestions.some(q => !q.text || q.options.some(o => !o))) {
        return toast.error("Please fill all question fields");
      }
      setIsGenerating(true);
      try {
        await saveQuizToDb(manualQuestions, title, description);
        toast.success("Quiz created successfully!");
        setShowCreateModal(false);
        resetForm();
        fetchQuizzes();
      } catch (error) {
        toast.error("Failed to save quiz");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const saveQuizToDb = async (questions: Question[], quizTitle: string, quizDesc: string) => {
    const quizData = {
      title: quizTitle,
      description: quizDesc,
      teacherId: profile?.uid,
      teacherName: profile?.displayName,
      timeLimit: Number(timeLimit),
      createdAt: new Date().toISOString(),
      questionCount: questions.length,
    };

    const quizRef = await addDoc(collection(db, 'quizzes'), quizData);
    const batchRequests = questions.map(q => 
      addDoc(collection(db, `quizzes/${quizRef.id}/questions`), q)
    );
    await Promise.all(batchRequests);
  };

  const addManualQuestion = () => {
    setManualQuestions([...manualQuestions, { text: '', options: ['', '', '', ''], correctIndex: 0 }]);
  };

  const updateManualQuestion = (index: number, field: keyof Question, value: any) => {
    const newQs = [...manualQuestions];
    if (field === 'options') {
      // handled separately by sub-input
    } else {
      (newQs[index] as any)[field] = value;
    }
    setManualQuestions(newQs);
  };

  const updateManualOption = (qIndex: number, oIndex: number, value: string) => {
    const newQs = [...manualQuestions];
    newQs[qIndex].options[oIndex] = value;
    setManualQuestions(newQs);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTimeLimit(600);
    setAiTopic('');
    setQCount(5);
    setManualQuestions([{ text: '', options: ['', '', '', ''], correctIndex: 0 }]);
    setCreationMode('ai');
  };

  const deleteQuiz = async (id: string) => {
    const loadingToast = toast.loading("Deleting quiz...");
    try {
      await deleteDoc(doc(db, 'quizzes', id));
      toast.success("Quiz deleted", { id: loadingToast });
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Delete failed", { id: loadingToast });
    }
  };

  return (
    <div className="flex h-screen bg-[#FDFDFB]">
      {/* Sidebar */}
      <aside className="w-72 border-r border-neutral-100 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 bg-black rounded-lg">
            <Brain className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Webxy</span>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
          />
          <NavItem 
            icon={<BookOpen size={18} />} 
            label="My Quizzes" 
            active={activeTab === 'quizzes'} 
            onClick={() => setActiveTab('quizzes')}
          />
          <NavItem 
            icon={<Users size={18} />} 
            label="Students" 
            active={activeTab === 'students'} 
            onClick={() => setActiveTab('students')}
          />
          <NavItem 
            icon={<BarChart3 size={18} />} 
            label="Analytics" 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
          />
        </nav>

        <div className="mt-auto pt-6 border-top border-neutral-100">
          <div className="flex items-center gap-3 mb-6">
            <img src={profile?.photoURL} className="w-10 h-10 rounded-full border border-neutral-200" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{profile?.displayName}</p>
              <p className="text-xs text-neutral-400 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-red-500 text-sm font-medium hover:opacity-80 transition-all p-2 w-full text-left">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              {activeTab === 'dashboard' ? `Welcome back, ${profile?.displayName?.split(' ')[0]}` : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <p className="text-neutral-400">
              {activeTab === 'dashboard' && "Manage your quizzes and monitor student performance."}
              {activeTab === 'quizzes' && "Full list of your created assessments."}
              {activeTab === 'students' && "View and manage your student roster."}
              {activeTab === 'analytics' && "Detailed insights into overall performance across all quizzes."}
            </p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Create New Quiz
          </button>
        </header>

        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <StatCard icon={<BookOpen className="text-blue-500" />} label="Total Quizzes" value={quizzes.length} />
              <StatCard icon={<Users className="text-purple-500" />} label="Total Attempts" value={allResults.length} />
              <StatCard icon={<BarChart3 className="text-emerald-500" />} label="Avg. Score" value={`${avgDashboardScore}%`} />
            </div>

            {/* Quiz List (Mini) */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Recently Created</h2>
                <button onClick={() => setActiveTab('quizzes')} className="text-sm font-bold text-neutral-400 hover:text-black">View All</button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="animate-spin opacity-20" />
                </div>
              ) : quizzes.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-neutral-100 rounded-3xl">
                  <p className="text-neutral-400">No quizzes yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quizzes.slice(0, 3).map((quiz) => (
                    <QuizCard key={quiz.id} quiz={quiz} onDelete={() => deleteQuiz(quiz.id!)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'quizzes' && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">All Active Quizzes</h2>
              <div className="flex items-center gap-2 p-2 bg-neutral-100/50 rounded-xl px-4 border border-neutral-200/50">
                <Search size={16} className="text-neutral-400" />
                <input type="text" placeholder="Search quizzes..." className="bg-transparent border-none text-sm outline-none" />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Loader2 className="animate-spin mb-4" />
                <p className="text-sm font-mono tracking-widest">FETCHING_DATA...</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-neutral-100 rounded-3xl bg-neutral-50/50">
                <p className="text-neutral-400 mb-4">No quizzes found.</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="text-black font-semibold hover:underline"
                >
                  Create your first quiz
                </button>
              </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quizzes.map((quiz) => (
                    <QuizCard key={quiz.id} quiz={quiz} onDelete={() => deleteQuiz(quiz.id!)} />
                  ))}
                </div>
            )}
          </section>
        )}

        {activeTab === 'students' && (
          <div className="bg-white rounded-[3rem] border border-neutral-100 p-20 flex flex-col items-center justify-center text-center">
            <div className="p-6 bg-neutral-50 rounded-full mb-6">
              <Users size={48} className="text-neutral-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Student Directory</h2>
            <p className="text-neutral-400 max-w-md">The student management list is being prepared. Soon you'll be able to see individual student performances across all categories.</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-[3rem] border border-neutral-100 p-20 flex flex-col items-center justify-center text-center">
            <div className="p-6 bg-neutral-50 rounded-full mb-6">
              <BarChart3 size={48} className="text-neutral-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Advanced Analytics</h2>
            <p className="text-neutral-400 max-w-md">We're building deep-dive reports to help you identify learning gaps and track class progress over time.</p>
          </div>
        )}
      </main>

      {/* Create Quiz Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                    <Sparkles className="text-amber-500 fill-amber-500" size={24} /> 
                    {creationMode === 'ai' ? 'Create Smart Quiz' : 'Assemble Manual Quiz'}
                  </h2>
                  <p className="text-neutral-400">Choose your preferred way to build the assessment.</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                  <X />
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="flex p-1 bg-neutral-100 rounded-2xl mb-8">
                <button 
                  onClick={() => setCreationMode('ai')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${creationMode === 'ai' ? 'bg-white shadow-sm' : 'text-neutral-400'}`}
                >
                  <Brain size={16} /> AI Generator
                </button>
                <button 
                  onClick={() => setCreationMode('manual')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${creationMode === 'manual' ? 'bg-white shadow-sm' : 'text-neutral-400'}`}
                >
                  <Plus size={16} /> Manual Entry
                </button>
              </div>

              <form onSubmit={handleCreateQuiz} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Quiz Title</label>
                    <input 
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Modern Architecture 101"
                      className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:border-black outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Time Limit (mins)</label>
                    <input 
                      type="number"
                      value={timeLimit / 60}
                      onChange={(e) => setTimeLimit(Number(e.target.value) * 60)}
                      className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:border-black outline-none"
                    />
                  </div>
                </div>

                {creationMode === 'ai' ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">AI Topic</label>
                      <div className="relative">
                        <input 
                          required
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          placeholder="e.g. React Hooks and Lifecycle"
                          className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:border-black outline-none transition-all pl-12"
                        />
                        <Wand2 className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Question Count</label>
                       <select 
                         value={qCount}
                         onChange={(e) => setQCount(Number(e.target.value))}
                         className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:border-black outline-none"
                       >
                         <option value={5}>5 Questions</option>
                         <option value={10}>10 Questions</option>
                         <option value={20}>20 Questions</option>
                       </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Questions ({manualQuestions.length})</label>
                       <button 
                         type="button" 
                         onClick={addManualQuestion}
                         className="text-xs font-bold text-black border-b border-black pb-0.5"
                       >
                         + Add Another
                       </button>
                    </div>

                    <div className="space-y-10 max-h-[400px] overflow-y-auto px-1">
                      {manualQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 space-y-4">
                           <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">{qIdx + 1}</span>
                              <input 
                                required
                                value={q.text}
                                onChange={(e) => updateManualQuestion(qIdx, 'text', e.target.value)}
                                placeholder="Question text..."
                                className="flex-1 bg-transparent border-b border-neutral-200 focus:border-black p-2 outline-none font-bold"
                              />
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-2">
                                   <input 
                                     type="radio" 
                                     name={`correct-${qIdx}`}
                                     checked={q.correctIndex === oIdx}
                                     onChange={() => updateManualQuestion(qIdx, 'correctIndex', oIdx)}
                                     className="w-4 h-4 accent-black"
                                   />
                                   <input 
                                     required
                                     value={opt}
                                     onChange={(e) => updateManualOption(qIdx, oIdx, e.target.value)}
                                     placeholder={`Option ${oIdx + 1}`}
                                     className="flex-1 bg-white border border-neutral-200 rounded-xl p-3 text-sm outline-none focus:border-black"
                                   />
                                </div>
                              ))}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  <button 
                    disabled={isGenerating}
                    type="submit" 
                    className="w-full btn-primary h-14 text-lg flex items-center justify-center gap-2 disabled:bg-neutral-200"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {creationMode === 'ai' ? 'Generating AI Questions...' : 'Saving Quiz...'}
                      </>
                    ) : (
                      <>
                        {creationMode === 'ai' ? <Brain size={20} /> : <Plus size={20} />} 
                        {creationMode === 'ai' ? 'Generate AI Quiz' : 'Finish & Save Quiz'}
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-neutral-400">
                    {creationMode === 'ai' ? 'AI will generate MCQ questions based on your topic.' : 'Your manual quiz will be available to all students.'}
                  </p>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium text-sm ${active ? 'bg-black text-white shadow-lg shadow-black/20' : 'text-neutral-500 hover:bg-neutral-50 hover:text-black'}`}
    >
      {icon} {label}
    </button>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: any }) {
  return (
    <div className="p-6 bg-white border border-neutral-100 rounded-[2rem] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-neutral-50 rounded-2xl">{icon}</div>
        <span className="text-xs font-bold text-neutral-300 uppercase letter-spacing-1">Updated</span>
      </div>
      <p className="text-neutral-400 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-3xl font-bold text-black">{value}</h3>
    </div>
  );
}

function QuizCard({ quiz, onDelete }: { quiz: Quiz, onDelete: () => Promise<void> | void, key?: React.Key }) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <motion.div 
      layout
      className="group p-6 bg-white border border-neutral-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-black/5 transition-all flex flex-col relative overflow-hidden"
    >
      <AnimatePresence>
        {isConfirming && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
          >
            <p className="font-bold mb-4 text-sm">Delete this quiz permanently?</p>
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => setIsConfirming(false)}
                className="flex-1 py-3 bg-neutral-100 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDelete();
                  setIsConfirming(false);
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-neutral-50 rounded-2xl group-hover:bg-amber-50 transition-colors">
          <BookOpen size={20} className="group-hover:text-amber-600" />
        </div>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsConfirming(true);
          }} 
          className="p-2 opacity-0 group-hover:opacity-100 max-md:opacity-100 text-neutral-300 hover:text-red-500 transition-all z-20"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <h3 className="text-xl font-bold mb-2 line-clamp-1">{quiz.title}</h3>
      <p className="text-neutral-400 text-sm mb-6 line-clamp-2 flex-1">{quiz.description}</p>


      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
          <Clock size={14} /> {Math.round(quiz.timeLimit / 60)}m
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
          <Users size={14} /> {quiz.questionCount} Questions
        </div>
      </div>

      <Link 
        to={`/admin/quiz/${quiz.id}`}
        className="w-full p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-between group-hover:bg-black group-hover:text-white transition-all"
      >
        <span className="font-bold text-sm">View Analytics</span>
        <ChevronRight size={16} />
      </Link>
    </motion.div>
  );
}
