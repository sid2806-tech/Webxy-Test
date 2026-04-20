import React from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { BrainCircuit, GraduationCap, School, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Landing() {
  const { login, profile, isLoggingIn } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (profile) {
      navigate(`/${profile.role}-dashboard`);
    }
  }, [profile, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-neutral-100 to-white overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center max-w-2xl"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="p-3 bg-black rounded-2xl">
            <BrainCircuit className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Webxy Tests</h1>
        </div>

        <h2 className="text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          Intelligence in <span className="text-neutral-500 italic">Every Quest.</span>
        </h2>
        
        <p className="text-neutral-500 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          The all-in-one ed-tech platform for generating AI-powered quizzes, secure proctoring, and insightful analytics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
          <motion.button 
            disabled={isLoggingIn}
            whileHover={isLoggingIn ? {} : { scale: 1.02 }}
            whileTap={isLoggingIn ? {} : { scale: 0.98 }}
            onClick={() => login('teacher')}
            className={`group flex flex-col items-center p-6 bg-white border border-neutral-200 rounded-3xl transition-all text-left ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : 'hover:border-black'}`}
          >
            <School className="w-10 h-10 mb-4" />
            <div className="w-full">
              <span className="block font-bold text-xl mb-1">Teacher</span>
              <span className="block text-sm text-neutral-400">Create, manage, and analyze quizzes for your students.</span>
            </div>
            <ArrowRight className="w-5 h-5 ml-auto mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>

          <motion.button 
            disabled={isLoggingIn}
            whileHover={isLoggingIn ? {} : { scale: 1.02 }}
            whileTap={isLoggingIn ? {} : { scale: 0.98 }}
            onClick={() => login('student')}
            className={`group flex flex-col items-center p-6 bg-black text-white rounded-3xl transition-all text-left ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <GraduationCap className="w-10 h-10 mb-4" />
            <div className="w-full">
              <span className="block font-bold text-xl mb-1 text-white">Student</span>
              <span className="block text-sm text-neutral-400">Join sessions, attempt tests, and track your progress.</span>
            </div>
            <ArrowRight className="w-5 h-5 ml-auto mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">AI Powered</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">Secure Proctoring</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">Live Analytics</span>
          </div>
        </div>
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-neutral-200 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-neutral-100 rounded-full blur-[100px] -z-10" />
    </div>
  );
}
