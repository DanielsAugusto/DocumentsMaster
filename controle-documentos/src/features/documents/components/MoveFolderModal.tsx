import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { X, FolderOutput } from 'lucide-react';
import { useMoveFolder, useAllFolders } from '../hooks/useFolders';

interface MoveFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    folderId: string | null;
    folderName: string;
    currentParentId: string | null;
}

export function MoveFolderModal({ isOpen, onClose, folderId, folderName, currentParentId }: MoveFolderModalProps) {
    const { data: allFolders = [], isLoading } = useAllFolders();
    const moveFolder = useMoveFolder();
    const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Set form base value when opening
    useEffect(() => {
        if (isOpen) {
            setSelectedFolderId(currentParentId || 'root');
            setError(null);
        }
    }, [isOpen, currentParentId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !mounted || !folderId) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const targetId = selectedFolderId === 'root' ? null : selectedFolderId;

        if (targetId === currentParentId) {
            onClose(); // No changes
            return;
        }

        try {
            await moveFolder.mutateAsync({ folderId, targetParentId: targetId });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao mover a pasta.');
        }
    };

    // Prevent selecting itself or its current parent
    // A robust solution would also prevent selecting children, but for a flat dropdown we at least prevent itself.
    const validFolders = allFolders.filter(f => f.id !== folderId);

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <button type="button" className="fixed inset-0 bg-transparent border-none cursor-default" tabIndex={-1} onClick={onClose} aria-label="Fechar modal" />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <FolderOutput className="h-5 w-5 text-gray-500" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Mover Pasta
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Movendo a pasta <strong>{folderName}</strong>. Para onde deseja enviá-la?
                    </p>

                    <div className="mb-6 space-y-4">
                        <div>
                            <label htmlFor="folderSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Pasta de Destino
                            </label>
                            {isLoading ? (
                                <div className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded"></div>
                            ) : (
                                <Select
                                    id="folderSelect"
                                    value={selectedFolderId}
                                    onChange={(e) => setSelectedFolderId(e.target.value)}
                                    className="w-full text-gray-900 dark:text-white bg-white dark:bg-gray-950"
                                >
                                    <option value="root">Raiz (Tela Inicial)</option>
                                    {validFolders.map(folder => (
                                        <option key={folder.id} value={folder.id} disabled={folder.id === currentParentId}>
                                            {folder.name} {folder.id === currentParentId ? '(Atual)' : ''}
                                        </option>
                                    ))}
                                </Select>
                            )}
                            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-slate-800"
                            disabled={moveFolder.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="w-full sm:w-auto"
                            disabled={moveFolder.isPending || isLoading}
                        >
                            {moveFolder.isPending ? 'Movendo...' : 'Mover'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
