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
    checkboxLabel?: string;
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
    checkboxLabel,
}: ConfirmModalProps) {
    const [mounted, setMounted] = useState(false);
    const [isChecked, setIsChecked] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset checkbox state when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsChecked(false);
        }
    }, [isOpen]);

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

    const isConfirmDisabled = isLoading || (checkboxLabel ? !isChecked : false);

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

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {description}
                    </p>

                    {checkboxLabel && (
                        <div className="mb-8 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-gray-800 flex items-start gap-3 group cursor-pointer" onClick={() => setIsChecked(!isChecked)}>
                            <input
                                type="checkbox"
                                id="modal-confirm-checkbox"
                                checked={isChecked}
                                onChange={(e) => setIsChecked(e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 dark:border-gray-700 dark:bg-slate-900"
                            />
                            <label
                                htmlFor="modal-confirm-checkbox"
                                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {checkboxLabel}
                            </label>
                        </div>
                    )}

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
                            disabled={isConfirmDisabled}
                            onClick={() => {
                                onConfirm();
                            }}
                            className={`w-full sm:w-auto ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
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
