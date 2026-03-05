import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/DashboardLayout';
import Dashboard from './pages/Dashboard';
import DocumentList from './pages/DocumentList';
import NewDocument from './pages/NewDocument';
import EditDocument from './pages/EditDocument';
import SettingsFeature from './features/settings/SettingsFeature';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsProvider } from '@/contexts/SettingsContext';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes cache
        },
    },
});

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <SettingsProvider>
                <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                    <BrowserRouter>
                        <Routes>
                            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

                            {/* Rotas Protegidas */}
                            <Route path="/" element={user ? <DashboardLayout /> : <Navigate to="/login" />}>
                                <Route index element={<Dashboard />} />
                                <Route path="documentos" element={<DocumentList />} />
                                <Route path="new" element={<NewDocument />} />
                                <Route path="edit/:id" element={<EditDocument />} />
                                <Route path="settings" element={<SettingsFeature />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </ThemeProvider>
            </SettingsProvider>
        </QueryClientProvider>
    );
}

export default App;
