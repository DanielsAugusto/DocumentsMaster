import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';
import { X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    isDestructive = false,
    isLoading = false,
}: ConfirmModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            {/* Overlay click to close */}
            <button type="button" className="fixed inset-0 bg-transparent border-none cursor-default" tabIndex={-1} onClick={onCancel} aria-label="Fechar modal" />

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        {description}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            variant={isDestructive ? 'destructive' : 'default'}
                            disabled={isLoading}
                            onClick={() => {
                                onConfirm();
                                if (!isLoading) {
                                    // Wait for parent component to close modal when mutation is finished instead of auto closing immediately.
                                    // Actually, the parent component already manages isOpen via state. We don't strictly need to close here if loading.
                                }
                            }}
                            className={`w-full sm:w-auto ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700'
                                : ''
                                }`}
                        >
                            {isLoading ? 'Aguarde...' : confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
