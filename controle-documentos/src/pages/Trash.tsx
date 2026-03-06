import { useState, useMemo } from 'react';
import { getTrashItems, TrashItem, restoreItemFromTrash, permanentlyDeleteFromTrash, emptyTrash } from '@/features/documents/api/folders';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, RefreshCw, Folder, File, AlertCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useWorkspace } from '@/contexts/WorkspaceContext';

function TrashItemRow({ item, isSelected, onSelect, onDeselect, onRestore, onDelete, onOpenFolder }: {
    item: TrashItem;
    isSelected: boolean;
    onSelect: () => void;
    onDeselect: () => void;
    onRestore: () => void;
    onDelete: () => void;
    onOpenFolder: () => void;
}) {
    return (
        <li
            className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${item.type === 'folder' ? 'cursor-pointer' : ''}`}
            role={item.type === 'folder' ? 'button' : undefined}
            tabIndex={item.type === 'folder' ? 0 : undefined}
            onClick={() => { if (item.type === 'folder') onOpenFolder(); }}
            onKeyDown={(e) => { if (item.type === 'folder' && (e.key === 'Enter' || e.key === ' ')) onOpenFolder(); }}
        >
            <div className="flex items-start gap-4 flex-1 overflow-hidden">
                <label className="mr-2 mt-3.5 flex items-start h-full cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => { if (e.target.checked) onSelect(); else onDeselect(); }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-900"
                    />
                </label>
                <div className="mt-1 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg shrink-0">
                    {item.type === 'folder'
                        ? <Folder className="h-6 w-6 text-gray-400" />
                        : <File className="h-6 w-6 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-lg font-medium text-gray-900 dark:text-white truncate" title={item.name}>
                        {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{item.type === 'folder' ? 'Pasta' : 'Documento'}</span>
                        <span>•</span>
                        <span>Excluído em {new Date(item.deleted_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <div
                className="flex items-center gap-2 shrink-0"
                role="toolbar"
                aria-label="Ações do item"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
            >
                <Button
                    variant="outline"
                    size="sm"
                    title="Restaurar"
                    onClick={onRestore}
                    className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-transform active:scale-95"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restaurar
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    title="Excluir Definitivamente"
                    onClick={onDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-transform active:scale-95"
                >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir</span>
                </Button>
            </div>
        </li>
    );
}

export default function Trash() {
    const queryClient = useQueryClient();
    const { currentWorkspace } = useWorkspace();
    const [isConfirmEmptyOpen, setIsConfirmEmptyOpen] = useState(false);
    const [itemToConfirmDelete, setItemToConfirmDelete] = useState<TrashItem | null>(null);
    const [itemToConfirmRestore, setItemToConfirmRestore] = useState<TrashItem | null>(null);



    // Multi-selection State
    const [selectedItems, setSelectedItems] = useState<TrashItem[]>([]);
    const [isMultiDeleteModalOpen, setIsMultiDeleteModalOpen] = useState(false);
    const [isMultiRestoreModalOpen, setIsMultiRestoreModalOpen] = useState(false);
    const [isMultiDeleting, setIsMultiDeleting] = useState(false);
    const [isMultiRestoring, setIsMultiRestoring] = useState(false);

    // Navigation State
    const [currentTrashFolderId, setCurrentTrashFolderId] = useState<string | null>(null);
    const [trashFolderPath, setTrashFolderPath] = useState<{ id: string, name: string }[]>([]);

    const { data: items, isLoading, error } = useQuery({
        queryKey: ['trash', currentWorkspace?.organization_id],
        queryFn: () => getTrashItems(currentWorkspace?.organization_id)
    });

    const restoreMutation = useMutation({
        mutationFn: (item: TrashItem) => restoreItemFromTrash(item.id, item.type),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            setItemToConfirmRestore(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (item: TrashItem) => permanentlyDeleteFromTrash(item.id, item.type),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            setItemToConfirmDelete(null);
        }
    });

    const emptyMutation = useMutation({
        mutationFn: emptyTrash,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            setIsConfirmEmptyOpen(false);
        }
    });

    const isEmpty = !isLoading && (!items || items.length === 0);

    const visibleItems = useMemo(() => {
        if (!items) return [];
        const trashFolderIds = new Set(items.filter(i => i.type === 'folder').map(i => i.id));
        return items.filter(item => {
            if (currentTrashFolderId === null) {
                // Raiz: o item nãopossui parent ou o parent não está na lixeira
                return !item.parent_id || !trashFolderIds.has(item.parent_id);
            } else {
                return item.parent_id === currentTrashFolderId;
            }
        });
    }, [items, currentTrashFolderId]);

    const addSelection = (item: TrashItem) => {
        setSelectedItems(prev => [...prev, item]);
    };

    const removeSelection = (item: TrashItem) => {
        setSelectedItems(prev => prev.filter(i => i.id !== item.id || i.type !== item.type));
    };

    const handleMultiRestore = async () => {
        setIsMultiRestoring(true);
        try {
            await Promise.all(selectedItems.map(item => restoreItemFromTrash(item.id, item.type).then(res => res)));
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            setSelectedItems([]);
            setIsMultiRestoreModalOpen(false);
        } catch {
            alert('Erro ao restaurar itens selecionados.');
        } finally {
            setIsMultiRestoring(false);
        }
    };

    const handleMultiDelete = async () => {
        setIsMultiDeleting(true);
        try {
            await Promise.all(selectedItems.map(item => permanentlyDeleteFromTrash(item.id, item.type).then(res => res)));
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            setSelectedItems([]);
            setIsMultiDeleteModalOpen(false);
        } catch {
            alert('Erro ao excluir itens definitivamente.');
        } finally {
            setIsMultiDeleting(false);
        }
    };


    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl my-8">
                <AlertCircle className="h-10 w-10 mb-4" />
                <p className="font-medium text-lg">Erro ao carregar lixeira</p>
                <p className="text-sm opacity-80 mt-2">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-baseline justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                    <Trash2 className="h-8 w-8 text-gray-500" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Lixeira</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Os itens aqui serão excluídos permanentemente após o tempo configurado.</p>
                    </div>
                </div>

                {!isEmpty && (
                    <Button
                        variant="destructive"
                        onClick={() => setIsConfirmEmptyOpen(true)}
                        className="shadow-sm"
                    >
                        Esvaziar Lixeira
                    </Button>
                )}
            </div>

            {items && items.length > 0 && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 font-medium overflow-x-auto whitespace-nowrap scrollbar-hide py-2 border-b border-gray-100 dark:border-gray-800 pb-4">
                    {currentTrashFolderId && (
                        <button
                            onClick={() => {
                                if (trashFolderPath.length > 1) {
                                    const prev = trashFolderPath[trashFolderPath.length - 2];
                                    setCurrentTrashFolderId(prev.id);
                                    setTrashFolderPath(p => p.slice(0, -1));
                                } else {
                                    setCurrentTrashFolderId(null);
                                    setTrashFolderPath([]);
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shrink-0 mr-3 px-2.5 py-1.5 rounded-md shadow-sm text-xs font-semibold"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setCurrentTrashFolderId(null);
                            setTrashFolderPath([]);
                        }}
                        className="hover:text-blue-600 transition-colors flex items-center gap-1 shrink-0"
                    >
                        <Trash2 className="h-4 w-4" /> Raiz da Lixeira
                    </button>
                    {trashFolderPath.map((folder, index) => (
                        <div key={folder.id} className="flex items-center shrink-0">
                            <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
                            <button
                                onClick={() => {
                                    setCurrentTrashFolderId(folder.id);
                                    setTrashFolderPath(p => p.slice(0, index + 1));
                                }}
                                className="hover:text-blue-600 transition-colors truncate max-w-[150px]"
                            >
                                {folder.name}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isLoading ? (
                <div className="bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                        {[1, 2, 3].map((i) => (
                            <li key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                                <div className="flex items-start gap-4 flex-1 overflow-hidden">
                                    <div className="bg-gray-200 dark:bg-gray-800 h-10 w-10 rounded-lg shrink-0"></div>
                                    <div className="flex-1 w-full space-y-2 mt-1">
                                        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-16"></div>
                                            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-md"></div>
                                    <div className="h-8 w-10 bg-gray-200 dark:bg-gray-800 rounded-md"></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (isEmpty ? (
                <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/20">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                        <Trash2 className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Lixeira vazia</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">Não há nenhum documento ou pasta aguardando exclusão permanente.</p>
                </div>
            ) : (visibleItems.length === 0 ? (
                <div className="text-center p-12 text-gray-500 dark:text-gray-400">
                    Esta pasta está vazia.
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                        {visibleItems.map((item) => (
                            <TrashItemRow
                                key={item.id}
                                item={item}
                                isSelected={selectedItems.some(i => i.id === item.id && i.type === item.type)}
                                onSelect={() => addSelection(item)}
                                onDeselect={() => removeSelection(item)}
                                onRestore={() => setItemToConfirmRestore(item)}
                                onDelete={() => setItemToConfirmDelete(item)}
                                onOpenFolder={() => {
                                    setCurrentTrashFolderId(item.id);
                                    setTrashFolderPath(p => [...p, { id: item.id, name: item.name }]);
                                }}
                            />
                        ))}
                    </ul>
                </div>
            )))}

            <ConfirmModal
                isOpen={isConfirmEmptyOpen}
                title="Esvaziar lixeira"
                description="Tem certeza? Todos os itens na lixeira serão excluídos PERMANENTEMENTE e não poderão ser recuperados."
                confirmText="Esvaziar"
                cancelText="Cancelar"
                onConfirm={() => emptyMutation.mutate()}
                onCancel={() => setIsConfirmEmptyOpen(false)}
                isDestructive
                isLoading={emptyMutation.isPending}
            />

            <ConfirmModal
                isOpen={!!itemToConfirmDelete}
                title="Excluir definitivamente"
                description={`O item "${itemToConfirmDelete?.name}" será excluído para sempre. Esta ação não pode ser desfeita.`}
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={() => itemToConfirmDelete && deleteMutation.mutate(itemToConfirmDelete)}
                onCancel={() => setItemToConfirmDelete(null)}
                isDestructive
                isLoading={deleteMutation.isPending}
            />

            <ConfirmModal
                isOpen={!!itemToConfirmRestore}
                title="Restaurar item"
                description={`Deseja restaurar "${itemToConfirmRestore?.name}"? O item será movido para uma pasta chamada "Restaurados" na página inicial, ou voltará para sua pasta raiz se era uma subpasta.`}
                confirmText="Restaurar"
                cancelText="Cancelar"
                onConfirm={() => itemToConfirmRestore && restoreMutation.mutate(itemToConfirmRestore)}
                onCancel={() => setItemToConfirmRestore(null)}
                isLoading={restoreMutation.isPending}
            />

            <ConfirmModal
                isOpen={isMultiDeleteModalOpen}
                title={`Excluir definitivamente ${selectedItems.length === 1 ? '1 item' : String(selectedItems.length) + ' itens'}`}
                description={`Tem certeza que deseja excluir permanentemente ${selectedItems.length === 1 ? 'o item selecionado' : 'os itens selecionados'}? Esta ação não pode ser desfeita.`}
                confirmText={isMultiDeleting ? "Excluindo..." : "Excluir para sempre"}
                cancelText="Cancelar"
                onConfirm={handleMultiDelete}
                onCancel={() => setIsMultiDeleteModalOpen(false)}
                isDestructive
            />

            <ConfirmModal
                isOpen={isMultiRestoreModalOpen}
                title={`Restaurar ${selectedItems.length === 1 ? '1 item' : String(selectedItems.length) + ' itens'}`}
                description={`Deseja restaurar ${selectedItems.length === 1 ? 'o item selecionado' : 'os itens selecionados'}? ${selectedItems.length === 1 ? 'Ele será recolocado' : 'Eles serão recolocados'} na estrutura de pastas ativa.`}
                confirmText={isMultiRestoring ? "Restaurando..." : "Restaurar itens"}
                cancelText="Cancelar"
                onConfirm={handleMultiRestore}
                onCancel={() => setIsMultiRestoreModalOpen(false)}
            />
        </div>
    );
}
