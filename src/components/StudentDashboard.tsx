import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Quiz, QuizResult } from '../types';
import { 
  Trophy, BookOpen, Clock, ChevronRight, 
  Search, LayoutDashboard, LogOut, Loader2, Sparkles, History
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quizzes' | 'history' | 'leaderboard'>('dashboard');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    // Quizzes listener
    const qQuizzes = query(collection(db, 'quizzes'));
    const unsubscribeQuizzes = onSnapshot(qQuizzes, (snapshot) => {
      const quizList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
      setQuizzes(quizList);
    }, (error) => {
      console.error(error);
    });

    // Results listener
    const qResults = query(collection(db, 'results'), where('studentId', '==', profile.uid));
    const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
      const resList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
      setResults(resList);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => {
      unsubscribeQuizzes();
      unsubscribeResults();
    };
  }, [profile]);

  const fetchData = async () => {
    // Handled by onSnapshot
  };

  const avgScore = results.length > 0 
    ? Math.round(results.reduce((acc, res) => acc + (res.score / res.totalQuestions * 100), 0) / results.length)
    : 0;

  return (
    <div className="flex h-screen bg-[#FDFDFB]">
      {/* Sidebar */}
      <aside className="w-72 border-r border-neutral-100 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 bg-black rounded-lg">
            <Sparkles className="text-white w-5 h-5" />
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
            label="All Quizzes" 
            active={activeTab === 'quizzes'} 
            onClick={() => setActiveTab('quizzes')}
          />
          <NavItem 
            icon={<History size={18} />} 
            label="My History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
          />
          <NavItem 
            icon={<Trophy size={18} />} 
            label="Leaderboard" 
            active={activeTab === 'leaderboard'} 
            onClick={() => setActiveTab('leaderboard')}
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
              {activeTab === 'dashboard' ? `Hi, ${profile?.displayName?.split(' ')[0]} 👋` : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <p className="text-neutral-400">
               {activeTab === 'dashboard' && "Ready to test your knowledge today?"}
               {activeTab === 'quizzes' && "Browse and take any available quiz."}
               {activeTab === 'history' && "Review your past performances and scores."}
               {activeTab === 'leaderboard' && "See how you rank against other students."}
            </p>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <StatCard icon={<History className="text-blue-500" />} label="Quizzes Completed" value={results.length} />
              <StatCard icon={<Trophy className="text-amber-500" />} label="Avg. Accuracy" value={`${avgScore}%`} />
              <StatCard icon={<Clock className="text-emerald-500" />} label="Learning Time" value="--" />
            </div>

            {/* Quiz Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <section className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Recommended Quizzes</h2>
                  <button onClick={() => setActiveTab('quizzes')} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-black transition-all cursor-pointer">
                    View all <ChevronRight size={14} />
                  </button>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <Loader2 className="animate-spin mb-4" />
                    <p className="text-sm font-mono">LOADING_QUIZZES...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quizzes.slice(0, 4).map(quiz => (
                      <StudentQuizCard key={quiz.id} quiz={quiz} hasAttempted={results.some(r => r.quizId === quiz.id)} />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
                <div className="space-y-4">
                  {results.length === 0 ? (
                    <div className="p-8 text-center bg-neutral-50 rounded-3xl border border-neutral-100">
                      <p className="text-sm text-neutral-400">No attempts yet. Start a quiz!</p>
                    </div>
                  ) : (
                    results.slice(0, 5).map(result => (
                      <ActivityItem key={result.id} result={result} />
                    ))
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {activeTab === 'quizzes' && (
          <section>
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-2xl font-bold">All Available Quizzes</h2>
               <div className="flex items-center gap-2 p-3 bg-neutral-100 rounded-2xl border border-neutral-200/50 w-72">
                  <Search size={18} className="text-neutral-400" />
                  <input type="text" placeholder="Search a topic..." className="bg-transparent border-none text-sm outline-none w-full" />
               </div>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Loader2 className="animate-spin mb-4" />
                <p className="text-sm font-mono uppercase tracking-widest">Initialising_Bank...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map(quiz => (
                  <StudentQuizCard key={quiz.id} quiz={quiz} hasAttempted={results.some(r => r.quizId === quiz.id)} />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'history' && (
          <section className="bg-white rounded-[3rem] border border-neutral-100 p-10">
             <h2 className="text-2xl font-bold mb-8">Performance History</h2>
             <div className="space-y-4">
                {results.map(result => (
                  <ActivityItem key={result.id} result={result} />
                ))}
                {results.length === 0 && (
                   <div className="text-center py-20 text-neutral-400 font-medium">You haven't attempted any quizzes yet.</div>
                )}
             </div>
          </section>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-8">
            <div className="bg-white rounded-[3rem] border border-neutral-100 p-8 shadow-sm overflow-hidden">
               <div className="flex items-center gap-4 mb-8 px-4">
                  <div className="p-3 bg-amber-50 rounded-2xl">
                    <Trophy className="text-amber-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Hall of Fame</h3>
                    <p className="text-neutral-400 text-sm">Top performers based on overall quiz accuracy.</p>
                  </div>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-neutral-50/50">
                        <th className="px-8 py-4 text-xs font-bold uppercase text-neutral-400">Rank</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase text-neutral-400">Student</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase text-neutral-400">Avg. Accuracy</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase text-neutral-400">Quizzes Done</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-neutral-50">
                     {/* We only have local results here, but we can simulate a global check or just show top peers */}
                     {/* For a real app, this would query a global 'leaderboard' collection */}
                     {(() => {
                        const students = Array.from(new Set(results.map(r => r.studentId))).map(sid => {
                          const sRes = results.filter(r => r.studentId === sid);
                          const avg = sRes.reduce((acc, r) => acc + (r.score/r.totalQuestions), 0) / sRes.length;
                          return { name: sRes[0].studentName, avg, count: sRes.length };
                        }).sort((a, b) => b.avg - a.avg);

                        if (students.length === 0) {
                          return <tr><td colSpan={4} className="px-8 py-20 text-center text-neutral-400 font-medium">Be the first to feature on the leaderboard! Take a quiz.</td></tr>
                        }

                        return students.map((s, idx) => (
                           <tr key={idx} className={`hover:bg-neutral-50/50 transition-all ${idx === 0 ? 'bg-amber-50/30' : ''}`}>
                              <td className="px-8 py-4">
                                {idx < 3 ? (
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-neutral-300 text-white' : 'bg-orange-300 text-white'}`}>
                                    {idx + 1}
                                  </div>
                                ) : (
                                  <span className="text-sm font-bold text-neutral-400 ml-2">{idx + 1}</span>
                                )}
                              </td>
                              <td className="px-8 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-[10px]">{s.name[0]}</div>
                                    <span className="font-bold text-sm">{s.name}</span>
                                    {idx === 0 && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">EXPERT</span>}
                                 </div>
                              </td>
                              <td className="px-8 py-4 font-bold text-sm text-black">{Math.round(s.avg * 100)}%</td>
                              <td className="px-8 py-4 text-sm text-neutral-500">{s.count} quizzes</td>
                           </tr>
                        ));
                     })()}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </main>
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
      <div className="flex items-center mb-4 gap-3">
        <div className="p-3 bg-neutral-50 rounded-2xl">{icon}</div>
        <p className="text-neutral-400 text-sm font-medium">{label}</p>
      </div>
      <h3 className="text-3xl font-bold text-black">{value}</h3>
    </div>
  );
}

function StudentQuizCard({ quiz, hasAttempted }: { quiz: Quiz, hasAttempted: boolean, key?: React.Key }) {
  return (
    <div className="p-6 bg-white border border-neutral-100 rounded-3xl hover:border-black/10 transition-all flex flex-col group">
      <div className="flex justify-between items-start mb-4">
        <div className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] uppercase font-bold rounded-full tracking-wider">
          New
        </div>
        {hasAttempted && (
          <div className="px-3 py-1 bg-green-50 text-green-700 text-[10px] uppercase font-bold rounded-full tracking-wider">
            Completed
          </div>
        )}
      </div>

      <h3 className="text-lg font-bold mb-1 line-clamp-1">{quiz.title}</h3>
      <p className="text-xs text-neutral-400 mb-4 font-medium italic">By {quiz.teacherName}</p>

      <div className="flex items-center gap-4 text-xs text-neutral-400 mb-6">
        <div className="flex items-center gap-1"><Clock size={12} /> {quiz.timeLimit / 60}m</div>
        <div className="flex items-center gap-1"><BookOpen size={12} /> {quiz.questionCount} Qs</div>
      </div>

      <Link 
        to={`/quiz/${quiz.id}`}
        className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${hasAttempted ? 'bg-neutral-50 text-neutral-400 cursor-not-allowed' : 'bg-black text-white hover:opacity-90'}`}
        onClick={(e) => hasAttempted && e.preventDefault()}
      >
        <span className="font-bold text-sm">{hasAttempted ? 'Attempted' : 'Start Quiz'}</span>
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}

function ActivityItem({ result }: { result: QuizResult, key?: React.Key }) {
  const percentage = Math.round((result.score / result.totalQuestions) * 100);
  return (
    <div className="p-4 bg-white border border-neutral-100 rounded-2xl flex items-center gap-4">
      <div className={`p-2 rounded-xl ${percentage >= 80 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
        <Trophy size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{result.quizTitle}</p>
        <p className="text-xs text-neutral-400">{new Date(result.attemptedAt).toLocaleDateString()}</p>
      </div>
      <div className="text-right">
        <p className={`font-bold text-sm ${percentage >= 80 ? 'text-green-600' : 'text-orange-600'}`}>{percentage}%</p>
        <p className="text-[10px] text-neutral-400 uppercase font-bold">{result.score}/{result.totalQuestions}</p>
      </div>
    </div>
  );
}
