import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, FolderPlus } from 'lucide-react';
import { useCreateFolder } from '../hooks/useFolders';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentId: string | null;
}

export function CreateFolderModal({ isOpen, onClose, parentId }: CreateFolderModalProps) {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const createFolder = useCreateFolder();
    const { currentWorkspace } = useWorkspace();
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

    if (!isOpen || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('O nome da pasta é obrigatório.');
            return;
        }

        try {
            if (!currentWorkspace?.organization_id) throw new Error("Organização não carregada");
            await createFolder.mutateAsync({
                name: name.trim(),
                parent_id: parentId,
                organization_id: currentWorkspace.organization_id
            });
            setName('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao criar a pasta.');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <button type="button" className="fixed inset-0 bg-transparent border-none cursor-default" tabIndex={-1} onClick={onClose} aria-label="Fechar modal" />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <FolderPlus className="h-5 w-5 text-gray-500" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Nova Pasta
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

                    <div className="mb-6 space-y-4">
                        <div>
                            <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nome da Pasta
                            </label>
                            <Input
                                id="folderName"
                                type="text"
                                placeholder="Ex: Contratos 2024"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-slate-800"
                            disabled={createFolder.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="w-full sm:w-auto"
                            disabled={createFolder.isPending}
                        >
                            {createFolder.isPending ? 'Criando...' : 'Criar Pasta'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
