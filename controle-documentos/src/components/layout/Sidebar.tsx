import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FileText, Plus, LogOut, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const navItems = [
    { name: 'Documentos', path: '/', icon: FileText },
    { name: 'Novo Documento', path: '/new', icon: Plus },
];

export function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <aside className="w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen sticky top-0 transition-colors">
            <div className="h-20 flex items-center px-6 border-b border-gray-200 dark:border-gray-800 transition-colors">
                <Layout className="h-8 w-8 text-blue-600 dark:text-blue-500 mr-3" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">DocControl</span>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={cn(
                                "flex items-center px-4 py-4 text-lg font-medium rounded-lg transition-colors group",
                                isActive
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "mr-4 h-6 w-6 transition-colors",
                                    isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                                )}
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 transition-colors">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 text-lg py-6"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-4 h-6 w-6" />
                    Sair
                </Button>
            </div>
        </aside>
    );
}
