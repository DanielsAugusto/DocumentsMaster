import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Home, FileText, LogOut, Layout, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
export const navItems = [
    { name: 'Início', path: '/', icon: Home },
    { name: 'Documentos', path: '/documentos', icon: FileText },
    { name: 'Configurações', path: '/settings', icon: Settings },
];

interface SidebarProps {
    isOpen?: boolean;
    setIsOpen?: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <aside className={cn(
            "min-w-[288px] w-max shrink-0 pr-4 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="h-[80px] shrink-0 flex items-center px-6 border-b border-gray-200 dark:border-gray-800 transition-colors">
                <Layout className="h-8 w-8 text-primary dark:text-primary mr-3" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">DocControl</span>
                <button
                    type="button"
                    onClick={() => setIsOpen?.(false)}
                    className="ml-auto lg:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200 transition-colors"
                    aria-label="Fechar menu"
                    title="Fechar menu"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setIsOpen?.(false)}
                            className={cn(
                                "flex items-center px-4 py-4 text-lg font-medium rounded-lg transition-colors group",
                                isActive
                                    ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "mr-4 h-6 w-6 shrink-0 transition-colors",
                                    isActive ? "text-primary dark:text-primary" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                                )}
                            />
                            <span className="min-w-0 break-words">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 transition-colors">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 text-lg py-6"
                    onClick={() => setIsLogoutOpen(true)}
                >
                    <LogOut className="mr-4 h-6 w-6" />
                    Sair
                </Button>
            </div>

            <ConfirmModal
                isOpen={isLogoutOpen}
                title="Sair do sistema"
                description="Tem certeza que deseja encerrar a sua sessão e sair do aplicativo?"
                confirmText="Sair"
                cancelText="Cancelar"
                onConfirm={handleLogout}
                onCancel={() => setIsLogoutOpen(false)}
                isDestructive
            />
        </aside>
    );
}
