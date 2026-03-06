import { useLocation } from 'react-router-dom';
import { navItems } from './Sidebar';
import { ModeToggle } from '@/components/mode-toggle';
import { Menu } from 'lucide-react';

interface HeaderProps {
    onMenuClick?: () => void;
}

export function Header({ onMenuClick }: Readonly<HeaderProps>) {
    const location = useLocation();

    // Find current page name or default to Dashboard
    const currentPageName = navItems.find(i => i.path === location.pathname)?.name || 'Dashboard';

    return (
        <header className="h-[80px] bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-8 shrink-0 transition-colors">
            <div className="flex items-center">
                <button
                    onClick={onMenuClick}
                    className="shrink-0 p-2 mr-4 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 lg:hidden transition-colors"
                    aria-label="Open Mobile Menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white transition-colors truncate">
                    {currentPageName}
                </h1>
            </div>
            <ModeToggle />
        </header>
    );
}
