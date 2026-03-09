import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import Login from './pages/Login';

import DashboardLayout from './pages/DashboardLayout';
import Dashboard from './pages/Dashboard';
import DocumentList from './pages/DocumentList';
import Trash from './pages/Trash';
import SettingsFeature from './features/settings/SettingsFeature';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { ToastProvider } from '@/components/ui/toast';

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
                <WorkspaceProvider>
                    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                        <ToastProvider>
                            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                                <Routes>
                                    <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />


                                    {/* Rotas Protegidas */}
                                    <Route path="/" element={user ? <DashboardLayout /> : <Navigate to="/login" />}>
                                        <Route index element={<Dashboard />} />
                                        <Route path="documentos" element={<DocumentList />} />
                                        <Route path="lixeira" element={<Trash />} />
                                        <Route path="settings" element={<SettingsFeature />} />
                                    </Route>
                                </Routes>
                            </BrowserRouter>
                        </ToastProvider>
                    </ThemeProvider>
                </WorkspaceProvider>
            </SettingsProvider>
        </QueryClientProvider>
    );
}

export default App;
