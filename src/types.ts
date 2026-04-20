export type UserRole = 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  photoURL: string;
  createdAt: string;
}

export interface Question {
  id?: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Quiz {
  id?: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  timeLimit: number; // in seconds
  createdAt: string;
  questionCount: number;
}

export interface QuizResult {
  id?: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  score: number;
  totalQuestions: number;
  timeTaken: number; // in seconds
  attemptedAt: string;
  tabSwitches: number;
  copyAttempts: number;
}
