import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Quiz, QuizResult } from '../types';
import { 
  ChevronLeft, Users, BarChart3, Clock, Trophy, 
  ArrowUpRight, Download, Share2, Loader2, Calendar
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function AdminQuizView() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'latest' | 'top'>('latest');

  useEffect(() => {
    if (!quizId || !profile) return;

    // Fetch quiz once
    const fetchQuiz = async () => {
      try {
        const qDoc = await getDoc(doc(db, 'quizzes', quizId!));
        if (qDoc.exists()) {
          setQuiz({ id: qDoc.id, ...qDoc.data() } as Quiz);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchQuiz();

    // Stats listener
    const qResults = query(
      collection(db, 'results'), 
      where('quizId', '==', quizId),
      where('teacherId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(qResults, (snapshot) => {
      const rList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
      setResults(rList);
      setLoading(false);
    }, (error) => {
      console.error("Analytics sync error:", error);
      toast.error("Failed to sync live results");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [quizId, profile]);

  const handleShare = () => {
    const studentLink = `${window.location.origin}/student-dashboard`; // Or a direct link if we had one
    navigator.clipboard.writeText(studentLink);
    toast.success("Student entry link copied to clipboard!");
  };

  const handleExportCSV = () => {
    if (results.length === 0) return toast.error("No results to export");
    
    const headers = ["Student Name", "Score", "Total", "Accuracy", "Time Taken (s)", "Date"];
    const rows = results.map(r => [
      r.studentName,
      r.score,
      r.totalQuestions,
      `${Math.round((r.score / r.totalQuestions) * 100)}%`,
      r.timeTaken,
      new Date(r.attemptedAt).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${quiz?.title || 'quiz'}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exporting CSV...");
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime();
    } else {
      return (b.score / b.totalQuestions) - (a.score / a.totalQuestions);
    }
  });

  const avgScore = results.length > 0 
    ? Math.round((results.reduce((acc, r) => acc + r.score, 0) / (results.length * (quiz?.questionCount || 1))) * 100)
    : 0;

  const scoreDistribution = [
    { name: '0-20%', count: results.filter(r => (r.score / r.totalQuestions) < 0.2).length },
    { name: '20-40%', count: results.filter(r => (r.score / r.totalQuestions) >= 0.2 && (r.score / r.totalQuestions) < 0.4).length },
    { name: '40-60%', count: results.filter(r => (r.score / r.totalQuestions) >= 0.4 && (r.score / r.totalQuestions) < 0.6).length },
    { name: '60-80%', count: results.filter(r => (r.score / r.totalQuestions) >= 0.6 && (r.score / r.totalQuestions) < 0.8).length },
    { name: '80-100%', count: results.filter(r => (r.score / r.totalQuestions) >= 0.8).length },
  ];

  const avgTimeTaken = results.length > 0 ? (results.reduce((acc, r) => acc + r.timeTaken, 0) / results.length) : 0;
  const formatSeconds = (s: number) => `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

  const totalTabSwitches = results.reduce((acc, r) => acc + (r.tabSwitches || 0), 0);
  const totalCopyAttempts = results.reduce((acc, r) => acc + (r.copyAttempts || 0), 0);
  const avgTabSwitches = results.length > 0 ? (totalTabSwitches / results.length).toFixed(1) : '0';

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#15803d'];

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#FDFDFB] p-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <Link to="/teacher-dashboard" className="flex items-center gap-2 text-neutral-400 hover:text-black transition-all mb-4 text-sm font-bold uppercase tracking-wider">
            <ChevronLeft size={16} /> Dashboard
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">{quiz?.title}</h1>
              <div className="flex items-center gap-4 text-sm text-neutral-400">
                <span className="flex items-center gap-1"><Calendar size={14} /> Created {new Date(quiz?.createdAt!).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Clock size={14} /> {quiz?.timeLimit! / 60}m Limit</span>
                <span className="flex items-center gap-1"><Users size={14} /> {results.length} Total Attempts</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleShare}
                className="btn-secondary flex items-center gap-2"
              >
                <Share2 size={16} /> Share Link
              </button>
              <button 
                onClick={handleExportCSV}
                className="btn-primary flex items-center gap-2"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>
        </header>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div className="col-span-1 lg:col-span-3 grid grid-cols-3 gap-6">
             <MetricCard label="Average Accuracy" value={`${avgScore}%`} trend="+5.2%" color="text-amber-500" />
             <MetricCard label="Completion Rate" value="100%" trend="Stable" color="text-emerald-500" />
             <MetricCard label="Top Performers" value={results.filter(r => (r.score / (r.totalQuestions || 1)) >= 0.9).length} trend="" color="text-blue-500" />
             
             {/* Charts Area */}
             <div className="col-span-3 bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm min-h-[400px]">
                <h3 className="text-xl font-bold mb-8">Score Distribution</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f8f8f8' }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {scoreDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>

          <div className="col-span-1 space-y-6">
             <div className="bg-black text-white p-8 rounded-[3rem] flex flex-col justify-between h-[300px]">
                <div>
                  <Trophy size={40} className="mb-6 opacity-30" />
                  <h3 className="text-xl font-bold mb-2">Quiz Performance</h3>
                  <p className="text-neutral-400 text-sm">Most students are mastering the subject matter. Great job!</p>
                </div>
                <button 
                  onClick={() => document.getElementById('student-results')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 transition-all rounded-2xl flex items-center justify-between px-6 font-bold text-sm"
                >
                   Full Report <ArrowUpRight size={18} />
                </button>
             </div>

             <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 h-fit">
                <h3 className="font-bold mb-4">Integrity Summary</h3>
                <div className="space-y-4">
                   <IntegrityStat label="Avg Focus Time" value={formatSeconds(avgTimeTaken)} />
                   <IntegrityStat label="Avg Tab Switches" value={`${avgTabSwitches}/user`} />
                   <IntegrityStat label="Total Copy Attempts" value={`${totalCopyAttempts} attempts`} />
                </div>
             </div>
          </div>
        </div>

        {/* Student Table */}
        <section id="student-results" className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden mb-10">
            <div className="p-8 border-b border-neutral-50 flex items-center justify-between">
              <h3 className="text-xl font-bold">Student Results</h3>
              <div className="flex gap-2">
                 <button 
                   onClick={() => setSortBy('latest')}
                   className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${sortBy === 'latest' ? 'bg-neutral-100 text-black' : 'text-neutral-400 hover:bg-neutral-50'}`}
                 >
                   Latest
                 </button>
                 <button 
                   onClick={() => setSortBy('top')}
                   className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${sortBy === 'top' ? 'bg-neutral-100 text-black' : 'text-neutral-400 hover:bg-neutral-50'}`}
                 >
                   Top Scorers
                 </button>
              </div>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-neutral-50/50">
                    <th className="px-8 py-4 text-xs font-bold uppercase text-neutral-400">Student Name</th>
                    <th className="px-8 py-4 text-xs font-bold uppercase text-neutral-400">Score</th>
                    <th className="px-8 py-4 text-xs font-bold uppercase text-neutral-400">Accuracy</th>
                    <th className="px-8 py-4 text-xs font-bold uppercase text-neutral-400">Time Taken</th>
                    <th className="px-8 py-4 text-xs font-bold uppercase text-neutral-400">Date</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-neutral-50">
                 {sortedResults.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-8 py-20 text-center text-neutral-400">No student has attempted this quiz yet.</td>
                   </tr>
                 ) : (
                   sortedResults.map(res => (
                     <tr key={res.id} className="hover:bg-neutral-50/50 transition-all cursor-pointer">
                        <td className="px-8 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-xs">
                                 {res.studentName[0]}
                              </div>
                              <span className="font-bold text-sm">{res.studentName}</span>
                           </div>
                        </td>
                        <td className="px-8 py-4 font-bold text-sm">{res.score}/{res.totalQuestions}</td>
                        <td className="px-8 py-4">
                           <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              (res.score/res.totalQuestions) >= 0.8 ? 'bg-green-100 text-green-700' :
                              (res.score/res.totalQuestions) >= 0.5 ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                           }`}>
                              {Math.round((res.score/res.totalQuestions)*100)}%
                           </span>
                        </td>
                        <td className="px-8 py-4 text-sm text-neutral-500">{Math.floor(res.timeTaken/60)}m {res.timeTaken%60}s</td>
                        <td className="px-8 py-4 text-sm text-neutral-400">{new Date(res.attemptedAt).toLocaleDateString()}</td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend, color }: { label: string, value: any, trend: string, color: string }) {
  return (
    <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm relative overflow-hidden group">
       <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">{label}</p>
       <div className="flex items-end justify-between">
          <h3 className={`text-4xl font-bold ${color}`}>{value}</h3>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{trend}</span>
       </div>
    </div>
  );
}

function IntegrityStat({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between">
       <span className="text-sm font-medium text-neutral-500">{label}</span>
       <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
