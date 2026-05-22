import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Competitions from './pages/Competitions';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import DatabasePage from './pages/DatabasePage';
import Transfers from './pages/Transfers';
import Schedule from './pages/Schedule';
import Finances from './pages/Finances';
import Sponsors from './pages/Sponsors';
import Inbox from './pages/Inbox';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import CompetitionDetail from './pages/CompetitionDetail';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-xs text-muted-foreground font-medium tracking-wide">Carregando HUB...</span>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/competicoes" element={<Competitions />} />
        <Route path="/competicoes/:id" element={<CompetitionDetail />} />
        <Route path="/times" element={<Teams />} />
        <Route path="/times/:id" element={<TeamDetail />} />
        <Route path="/database" element={<DatabasePage />} />
        <Route path="/transferencias" element={<Transfers />} />
        <Route path="/agenda" element={<Schedule />} />
        <Route path="/financas" element={<Finances />} />
        <Route path="/patrocinadores" element={<Sponsors />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/perfil" element={<Profile />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
