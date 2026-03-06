import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayoutFeature() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="h-screen overflow-hidden bg-gray-50 dark:bg-slate-950 flex transition-colors relative">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Background overlay for mobile */}
            {isSidebarOpen && (
                <button
                    type="button"
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity border-none cursor-default"
                    tabIndex={-1}
                    onClick={() => setIsSidebarOpen(false)}
                    aria-label="Fechar menu lateral"
                />
            )}

            <div className="flex-1 flex flex-col overflow-hidden w-full">
                <Header onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
