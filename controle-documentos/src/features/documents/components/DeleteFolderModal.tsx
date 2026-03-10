import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';
import { useDeleteFolder } from '../hooks/useFolders';

interface DeleteFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    folderId: string | null;
    folderName: string;
}

export function DeleteFolderModal({ isOpen, onClose, folderId, folderName }: DeleteFolderModalProps) {
    const [deleteDocuments, setDeleteDocuments] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const removeFolder = useDeleteFolder();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setDeleteDocuments(false);
            setIsConfirmed(false);
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen || !mounted || !folderId) return null;

    const handleDelete = async () => {
        if (!isConfirmed) return;
        setError(null);
        try {
            await removeFolder.mutateAsync({ id: folderId, deleteDocuments });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao excluir a pasta.');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <button type="button" className="fixed inset-0 bg-transparent border-none cursor-default" tabIndex={-1} onClick={onClose} aria-label="Fechar modal" />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Excluir Pasta
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Tem certeza que deseja excluir a pasta <strong>{folderName}</strong>?
                    </p>

                    <div className="space-y-4 mb-8">
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/30">
                            <div className="flex items-start gap-3 group cursor-pointer" onClick={() => setIsConfirmed(!isConfirmed)}>
                                <input
                                    id="confirm-delete-checkbox"
                                    type="checkbox"
                                    aria-label="Confirmar exclusão da pasta"
                                    className="w-4 h-4 mt-1 shrink-0 text-red-600 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                    checked={isConfirmed}
                                    onChange={(e) => setIsConfirmed(e.target.checked)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <label
                                    htmlFor="confirm-delete-checkbox"
                                    className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer select-none"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Confirmo que desejo excluir esta pasta e estou ciente das consequências.
                                </label>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-3 group cursor-pointer" onClick={() => setDeleteDocuments(!deleteDocuments)}>
                                <input
                                    id="delete-contents-checkbox"
                                    type="checkbox"
                                    aria-label="Excluir também os arquivos contidos na pasta"
                                    className="w-4 h-4 mt-1 shrink-0 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                    checked={deleteDocuments}
                                    onChange={(e) => setDeleteDocuments(e.target.checked)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <label
                                    htmlFor="delete-contents-checkbox"
                                    className="flex flex-col cursor-pointer select-none"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        Excluir também os arquivos contidos nela?
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Se desmarcado, os arquivos voltarão para a pasta inicial. Subpastas serão excluídas de qualquer forma.
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-slate-800"
                            disabled={removeFolder.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="w-full sm:w-auto text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={removeFolder.isPending || !isConfirmed}
                        >
                            {removeFolder.isPending ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
