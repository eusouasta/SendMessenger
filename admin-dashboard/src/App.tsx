
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { Loader } from 'lucide-react';

// Pages
import LandingPage from './pages/Landing';
import ClientLogin from './pages/Client/Login';
import ClientDashboard from './pages/Client/Dashboard';
import AdminLogin from './pages/Admin/Login';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminChatPanel from './components/AdminChatPanel';

function AppRoutes() {
    const [session, setSession] = useState<any>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [isAdmin, setIsAdmin] = useState(localStorage.getItem('adminAuth') === 'true');
    const navigate = useNavigate();

    useEffect(() => {
        // Supabase Session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSession(session);
            } else {
                // Check Local "Direct" Auth
                const localEmail = localStorage.getItem('client_email');
                if (localEmail && localStorage.getItem('client_auth') === 'true') {
                    setSession({ user: { email: localEmail, id: 'local-user' } });
                }
            }
            setLoadingSession(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleAdminLogin = () => {
        setIsAdmin(true);
        localStorage.setItem('adminAuth', 'true');
        navigate('/admin-panel');
    };

    const handleAdminLogout = () => {
        setIsAdmin(false);
        localStorage.removeItem('adminAuth');
        navigate('/admin');
    };

    if (loadingSession) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500"><Loader className="animate-spin" /></div>;
    }

    return (
        <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Client Auth Flow */}
            <Route path="/auth" element={session ? <Navigate to="/dashboard" /> : <ClientLogin />} />

            <Route
                path="/dashboard"
                element={session ? <ClientDashboard user={session.user} onLogout={() => {
                    supabase.auth.signOut();
                    localStorage.removeItem('client_auth');
                    localStorage.removeItem('client_email');
                    setSession(null);
                }} /> : <Navigate to="/auth" />}
            />

            {/* Admin Auth Flow */}
            <Route path="/admin" element={isAdmin ? <Navigate to="/admin-panel" /> : <AdminLogin onLogin={handleAdminLogin} />} />

            <Route
                path="/admin-panel"
                element={isAdmin ? <AdminDashboard session={null} onLogout={handleAdminLogout} /> : <Navigate to="/admin" />}
            />
            <Route
                path="/admin-panel/chat"
                element={isAdmin ? <AdminChatPanel /> : <Navigate to="/admin" />}
            />
        </Routes>
    );
}

export default function App() {
    return (
        <Router>
            <AppRoutes />
        </Router>
    );
}
