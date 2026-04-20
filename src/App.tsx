import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './lib/firebase';
import { UserProfile, UserRole } from './types';
import { Toaster, toast } from 'react-hot-toast';
import { LogOut, LayoutDashboard, BookOpen, Users, Trophy, Settings, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Context
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isLoggingIn: boolean;
  login: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// Components (Placeholders for now) - I'll implement them in separate files
import Landing from './components/Landing';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import QuizSession from './components/QuizSession';
import AdminQuizView from './components/AdminQuizView';

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async (role: UserRole) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      let userProfile: UserProfile;
      if (!docSnap.exists()) {
        userProfile = {
          uid: user.uid,
          email: user.email || '',
          role,
          displayName: user.displayName || 'Anonymous',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, userProfile);
      } else {
        userProfile = docSnap.data() as UserProfile;
        if (userProfile.role !== role) {
          toast.error(`You are registered as a ${userProfile.role}. Logging you in accordingly.`);
        }
      }
      setProfile(userProfile);
      toast.success("Logged in successfully!");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-blocked') {
        toast.error("Sign-in popup blocked. Please allow popups for this site.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // This is usually benign, means a previous request was cancelled
        console.warn("Cancelled popup request.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error("Login window was closed.");
      } else if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
        toast.error("Authentication internal error. Please try again.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setUser(null);
    toast.success("Signed out");
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isLoggingIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode, role?: UserRole }> = ({ children, role }) => {
  const { profile, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center font-mono">LOADING_SESSION...</div>;
  if (!profile) return <Navigate to="/" />;
  if (role && profile.role !== role) return <Navigate to={`/${profile.role}-dashboard`} />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#FDFDFB] text-[#1A1A1A]">
          <Toaster position="top-center" />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/teacher-dashboard" element={
              <ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>
            } />
            <Route path="/student-dashboard" element={
              <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
            } />
            <Route path="/quiz/:quizId" element={
              <ProtectedRoute role="student"><QuizSession /></ProtectedRoute>
            } />
            <Route path="/admin/quiz/:quizId" element={
              <ProtectedRoute role="teacher"><AdminQuizView /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
