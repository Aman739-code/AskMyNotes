import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './features/auth/LandingPage';
import { AppShell } from './components/layout/AppShell';
import { Library } from './features/documents/Library';
import { Chat } from './features/chat/Chat';
import { StudyTools } from './features/study/StudyTools';
import { AdminMetrics } from './features/admin/AdminMetrics';
import { useAuth } from './features/auth/AuthContext';

export function App() {
  const { user, signInWithGoogle } = useAuth();

  return (
    <Routes>
      {/* Public Landing Page */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/app/library" replace />
          ) : (
            <LandingPage onSignInSuccess={signInWithGoogle} />
          )
        }
      />

      {/* Protected App Shell and Sub-routes */}
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="/app/library" replace />} />
        <Route path="library" element={<Library />} />
        <Route path="chat" element={<Chat />} />
        <Route path="chat/:conversationId" element={<Chat />} />
        <Route path="study" element={<StudyTools />} />
        <Route path="admin" element={<AdminMetrics />} />
      </Route>

      {/* Catch-all 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-paper dark:bg-night flex flex-col items-center justify-center p-6 text-center">
            <h1 className="font-heading font-black text-6xl text-ink dark:text-paper">404</h1>
            <p className="font-body text-base text-ink/60 dark:text-paper/60 mt-2">
              That page doesn't exist in AskMyNotes.
            </p>
            <a href="/" className="btn-primary mt-6">
              Return Home
            </a>
          </div>
        }
      />
    </Routes>
  );
}
