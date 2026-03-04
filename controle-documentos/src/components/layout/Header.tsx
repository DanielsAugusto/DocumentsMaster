import { useLocation } from 'react-router-dom';
import { navItems } from './Sidebar';
import { ModeToggle } from '@/components/mode-toggle';

export function Header() {
    const location = useLocation();

    // Find current page name or default to Dashboard
    const currentPageName = navItems.find(i => i.path === location.pathname)?.name || 'Dashboard';

    return (
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 sm:px-12 shrink-0 transition-colors">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors">
                {currentPageName}
            </h1>
            <ModeToggle />
        </header>
    );
}
