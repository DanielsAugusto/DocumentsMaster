import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ExternalLink, Trash2, File as FileIcon, FileText, FileSpreadsheet, FileImage, X, Search, Filter, Edit2, Folder, ChevronRight, ChevronDown, FolderPlus, FolderOutput, ArrowLeft, CloudDownload, MoreVertical } from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useDocuments } from './hooks/useDocuments';
import { useFolders, useAllFolders } from './hooks/useFolders';
import { useQueryClient } from '@tanstack/react-query';
import { Document } from './api/getDocuments';
import { Folder as FolderType } from './api/folders';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { CreateFolderModal } from './components/CreateFolderModal';
import { DeleteFolderModal } from './components/DeleteFolderModal';
import { MoveDocumentModal } from './components/MoveDocumentModal';
import { MoveFolderModal } from './components/MoveFolderModal';
import { MoveMultipleModal } from './components/MoveMultipleModal';
import { ImportDriveModal } from './components/ImportDriveModal';
import { DocumentModal } from './components/DocumentModal';
import { RenameFolderModal } from './components/RenameFolderModal';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface KeywordTagItemProps {
    tag: string;
    isChecked: boolean;
    onSelect: () => void;
    onDeselect: () => void;
}

function KeywordTagItem({ tag, isChecked, onSelect, onDeselect }: Readonly<KeywordTagItemProps>) {
    return (
        <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800 cursor-pointer">
            <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                    if (e.target.checked) onSelect();
                    else onDeselect();
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="truncate">{tag}</span>
        </label>
    );
}

export default function DocumentListFeature() {
    const { currentWorkspace } = useWorkspace();
    const location = useLocation();
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<FolderType[]>([]);

    const { data: allFoldersData = [] } = useAllFolders(currentWorkspace?.organization_id);
    const { data: folders = [], isLoading: loadingFolders } = useFolders(currentFolderId, currentWorkspace?.organization_id);
    const { data: documents = [], isLoading: loading } = useDocuments(currentFolderId, currentWorkspace?.organization_id);
    const { data: allDocuments = [] } = useDocuments('all', currentWorkspace?.organization_id);
    const queryClient = useQueryClient();

    const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
    const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

    // Modal states for folders
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
    const [folderToRename, setFolderToRename] = useState<FolderType | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
    const [folderToMove, setFolderToMove] = useState<FolderType | null>(null);
    const [documentToMove, setDocumentToMove] = useState<Document | null>(null);

    // Modal state for Documents
    const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
    const [documentToEditId, setDocumentToEditId] = useState<string | null>(null);
    const [isImportDriveModalOpen, setIsImportDriveModalOpen] = useState(false);

    // Multi-selection state
    type SelectedItem = { id: string, type: 'folder' | 'document', name: string };
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [isMultiDeleteModalOpen, setIsMultiDeleteModalOpen] = useState(false);
    const [isMultiDeleting, setIsMultiDeleting] = useState(false);
    const [isMultiMoveModalOpen, setIsMultiMoveModalOpen] = useState(false);
    const [openMobileActionMenu, setOpenMobileActionMenu] = useState<string | null>(null);

    // Effect for opening specific folders/focusing document based on location state (e.g. going from Dashboard)
    useEffect(() => {
        const targetFolderId = location.state?.folderId;
        const targetFocusDocumentId = location.state?.focusDocumentId;

        if (!targetFolderId && !targetFocusDocumentId) return;
        if (targetFolderId && allFoldersData.length === 0) return;

        if (targetFolderId) {
            setCurrentFolderId(targetFolderId);

            const buildPath = (id: string, currentPath: FolderType[] = []): FolderType[] => {
                const folder = allFoldersData.find(f => f.id === id);
                if (folder) {
                    const newPath = [folder, ...currentPath];
                    if (folder.parent_id) {
                        return buildPath(folder.parent_id, newPath);
                    }
                    return newPath;
                }
                return currentPath;
            };

            setFolderPath(buildPath(targetFolderId));
        }

        if (targetFocusDocumentId) {
            setPendingDocumentFocusId(targetFocusDocumentId);
        }

        // Clear location state to prevent running this again on subsequent renders
        globalThis.history.replaceState({}, document.title);
    }, [location.state?.folderId, location.state?.focusDocumentId, allFoldersData]);

    useEffect(() => {
        if (location.state?.openNewDocument) {
            setDocumentToEditId(null);
            setIsDocumentModalOpen(true);
            globalThis.history.replaceState({}, document.title);
        }
    }, [location.state?.openNewDocument]);

    // Filtros
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [selectedType, setSelectedType] = useState('Todos');
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
    const [isKeywordFilterOpen, setIsKeywordFilterOpen] = useState(false);
    const keywordFilterRef = useRef<HTMLDivElement | null>(null);
    const documentCardRefs = useRef<Record<string, HTMLLIElement | null>>({});
    const [pendingDocumentFocusId, setPendingDocumentFocusId] = useState<string | null>(null);
    const [focusedDocumentId, setFocusedDocumentId] = useState<string | null>(null);

    const handleTagSelect = useCallback((tag: string) => {
        setSelectedKeywords((prev) => [...prev, tag]);
    }, []);

    const handleTagDeselect = useCallback((tag: string) => {
        setSelectedKeywords((prev) => prev.filter((item) => item !== tag));
    }, []);

    const parseKeywordTags = (keywords?: string | null) => {
        if (!keywords) return [];
        return keywords
            .split(/[;,]/)
            .map((tag) => tag.trim())
            .filter(Boolean);
    };

    const hasActiveTextSearch = searchTerm.trim().length > 0;
    const hasActiveKeywordFilters = selectedKeywords.length > 0;
    const isGlobalDocumentSearch = hasActiveTextSearch || hasActiveKeywordFilters;

    const buildFolderPath = (id: string, currentPath: FolderType[] = []): FolderType[] => {
        const folder = allFoldersData.find((f) => f.id === id);
        if (folder) {
            const newPath = [folder, ...currentPath];
            if (folder.parent_id) {
                return buildFolderPath(folder.parent_id, newPath);
            }
            return newPath;
        }
        return currentPath;
    };

    const handleMobileFolderAction = (action: string, folder: FolderType) => {
        if (action === 'rename') {
            setFolderToRename(folder);
            setIsRenameFolderOpen(true);
            return;
        }

        if (action === 'move') {
            setFolderToMove(folder);
            return;
        }

        if (action === 'delete') {
            setFolderToDelete(folder);
        }
    };

    const handleMobileDocumentAction = (action: string, doc: Document) => {
        if (action === 'edit') {
            setDocumentToEditId(doc.id);
            setIsDocumentModalOpen(true);
            return;
        }

        if (action === 'drive') {
            globalThis.open(doc.drive_url, '_blank', 'noopener,noreferrer');
            return;
        }

        if (action === 'move') {
            setDocumentToMove(doc);
            return;
        }

        if (action === 'delete') {
            setDocumentToDelete(doc.id);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!keywordFilterRef.current) return;
            if (!keywordFilterRef.current.contains(event.target as Node)) {
                setIsKeywordFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleMobileMenuOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-mobile-action-menu-root="true"]')) return;
            setOpenMobileActionMenu(null);
        };

        document.addEventListener('mousedown', handleMobileMenuOutside);
        return () => document.removeEventListener('mousedown', handleMobileMenuOutside);
    }, []);

    const handleDelete = async (id: string) => {
        // Soft-delete for documents
        await supabase.from('documents').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        setDocumentToDelete(null);
    };

    const handleMultiDelete = async () => {
        setIsMultiDeleting(true);
        try {
            const folderIds = selectedItems.filter(i => i.type === 'folder').map(i => i.id);
            const docIds = selectedItems.filter(i => i.type === 'document').map(i => i.id);

            // Delete folders using the RPC SEQUENTIALLY to avoid tree-locking issues
            for (const id of folderIds) {
                const { error } = await supabase.rpc('delete_folder', { target_folder_id: id, delete_documents: true });
                if (error) { /* folder delete failed silently */ }
            }

            // Soft-delete documents in a single bulk push
            if (docIds.length > 0) {
                const { error } = await supabase
                    .from('documents')
                    .update({ deleted_at: new Date().toISOString() })
                    .in('id', docIds);

                if (error) { /* documents delete failed silently */ }
            }

            await queryClient.invalidateQueries({ queryKey: ['folders'] });
            await queryClient.invalidateQueries({ queryKey: ['documents'] });
            setSelectedItems([]);
            setIsMultiDeleteModalOpen(false);
        } catch (err) {
            console.error('Erro ao excluir itens selecionados:', err);
            alert('Um erro ocorreu ao excluir os itens selecionados.');
        } finally {
            setIsMultiDeleting(false);
        }
    };

    const addSelection = (item: SelectedItem) => {
        setSelectedItems(prev => [...prev, item]);
    };

    const removeSelection = (item: SelectedItem) => {
        setSelectedItems(prev => prev.filter(i => i.id !== item.id || i.type !== item.type));
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const foldersToSelect = visibleFolders.map(f => ({ id: f.id, type: 'folder' as const, name: f.name }));
            const docsToSelect = filteredDocuments.map(d => ({ id: d.id, type: 'document' as const, name: d.title }));
            setSelectedItems([...foldersToSelect, ...docsToSelect]);
        } else {
            setSelectedItems([]);
        }
    };

    const getEmbedUrl = (url: string) => {
        if (url.includes('/view')) {
            return url.replace('/view', '/preview');
        }
        return url;
    };

    const documentsSource = useMemo(
        () => (isGlobalDocumentSearch ? allDocuments : documents),
        [isGlobalDocumentSearch, allDocuments, documents]
    );

    const filteredDocuments = useMemo(() => {
        return documentsSource.filter((doc) => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                doc.title.toLowerCase().includes(searchLower) ||
                doc.entity_name?.toLowerCase().includes(searchLower) ||
                doc.subject?.toLowerCase().includes(searchLower) ||
                doc.keywords?.toLowerCase().includes(searchLower) ||
                doc.sender?.toLowerCase().includes(searchLower) ||
                doc.recipient?.toLowerCase().includes(searchLower);

            const matchesType =
                selectedType === 'Todos' ||
                (selectedType !== 'Pastas' && doc.type === selectedType);
            const docKeywordTags = parseKeywordTags(doc.keywords);
            const matchesKeyword =
                selectedKeywords.length === 0 ||
                selectedKeywords.some((selectedTag) => docKeywordTags.includes(selectedTag));

            return matchesSearch && matchesType && matchesKeyword;
        });
    }, [documentsSource, searchTerm, selectedType, selectedKeywords]);

    const uniqueTypes = useMemo(() => {
        const types = new Set(documents.map(d => d.type).filter(Boolean));
        return ['Todos', 'Pastas', ...Array.from(types)];
    }, [documents]);

    const uniqueKeywordTags = useMemo(() => {
        const tags = new Set(
            allDocuments.flatMap((doc) => parseKeywordTags(doc.keywords))
        );
        return Array.from(tags);
    }, [allDocuments]);

    const visibleFolders =
        !isGlobalDocumentSearch && (selectedType === 'Todos' || selectedType === 'Pastas')
            ? folders
            : [];

    useEffect(() => {
        if (!pendingDocumentFocusId) return;
        const targetElement = documentCardRefs.current[pendingDocumentFocusId];
        if (!targetElement) return;

        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setFocusedDocumentId(pendingDocumentFocusId);
        setPendingDocumentFocusId(null);

        const timeout = globalThis.setTimeout(() => {
            setFocusedDocumentId(null);
        }, 1800);

        return () => globalThis.clearTimeout(timeout);
    }, [pendingDocumentFocusId, filteredDocuments]);

    const isAllSelected = (visibleFolders.length > 0 || filteredDocuments.length > 0) &&
        selectedItems.length === visibleFolders.length + filteredDocuments.length;

    useEffect(() => {
        // Reset selection if changing folder or searching
        setSelectedItems([]);
    }, [currentFolderId, searchTerm, selectedType, selectedKeywords]);

    // No longer blocking the whole render with a simple text loading.
    // We will render the UI shell and show Skeletons inside the list instead.

    return (
        <>
            <div className="mb-6 flex flex-col gap-3 items-start">
                <div className="order-2 flex flex-wrap items-center gap-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium w-full max-w-full">
                    {currentFolderId && (
                        <button
                            onClick={() => {
                                if (folderPath.length > 1) {
                                    setCurrentFolderId(folderPath[folderPath.length - 2].id);
                                    setFolderPath(path => path.slice(0, -1));
                                } else {
                                    setCurrentFolderId(null);
                                    setFolderPath([]);
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 mr-3 px-2.5 py-1.5 rounded-md shadow-sm text-xs font-semibold"
                            title="Voltar ao nível anterior"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Voltar
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setCurrentFolderId(null);
                            setFolderPath([]);
                        }}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                    >
                        <Folder className="h-4 w-4" />
                        Acesso Rápido
                    </button>
                    {folderPath.map((folder, index) => (
                        <div key={folder.id} className="flex items-center">
                            <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
                            <button
                                onClick={() => {
                                    setCurrentFolderId(folder.id);
                                    setFolderPath(path => path.slice(0, index + 1));
                                    setSelectedType('Todos');
                                }}
                                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[150px]"
                                title={folder.name}
                            >
                                {folder.name}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="order-1 flex flex-col w-full gap-2 shrink-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 w-full">
                        <Button onClick={() => setIsCreateFolderOpen(true)} variant="outline" className="flex-1 min-w-0 bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700">
                            <FolderPlus className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                            <span className="text-xs sm:text-sm truncate">Nova Pasta</span>
                        </Button>
                        {currentWorkspace?.role === 'admin' && (
                            <Button
                                onClick={() => setIsImportDriveModalOpen(true)}
                                variant="outline"
                                className="flex-1 min-w-0 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400 dark:hover:bg-blue-800/60"
                                title="Importar arquivos de uma pasta pública do Google Drive"
                            >
                                <CloudDownload className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                                <span className="text-xs sm:text-sm truncate">Importar</span>
                            </Button>
                        )}
                        <Button
                            onClick={() => {
                                setDocumentToEditId(null);
                                setIsDocumentModalOpen(true);
                            }}
                            className="w-full sm:col-span-2 xl:col-span-1 bg-blue-600 hover:bg-blue-700 text-white min-w-0"
                        >
                            <FileIcon className="h-4 w-4 mr-2 shrink-0" />
                            <span className="truncate">Novo Arquivo</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
                <div className="px-4 sm:px-6 py-4 flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between border-b border-gray-100 dark:border-gray-800 gap-3 2xl:gap-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white shrink-0">Seus Documentos</h3>

                    <div className="flex flex-col gap-2 w-full 2xl:flex-1 justify-end items-stretch min-w-0">
                        <div className="relative w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            </div>
                            <Input
                                type="text"
                                placeholder="Buscar por título..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    if (e.target.value) {
                                        setSearchParams({ q: e.target.value });
                                    } else {
                                        setSearchParams({});
                                    }
                                }}
                                className="pl-10 h-[42px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                            <div className="relative min-w-0 group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Filter className="h-4 w-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200 transition-colors" />
                                </div>
                                <div ref={keywordFilterRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsKeywordFilterOpen((prev) => !prev)}
                                        className="flex w-full h-[42px] items-center justify-between rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 pl-8 sm:pl-9 text-sm sm:text-base text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:hover:bg-slate-900"
                                        title="Filtrar por Palavras-chave"
                                    >
                                        <span className="truncate text-left flex-1">
                                            {selectedKeywords.length === 0
                                                ? 'Palavras-chave'
                                                : `${selectedKeywords.length} tags`}
                                        </span>
                                        <ChevronDown className="h-4 w-4 ml-1 sm:ml-2 shrink-0 text-gray-500 dark:text-gray-400" />
                                    </button>

                                    {isKeywordFilterOpen && (
                                        <div className="absolute z-30 mt-2 w-[240px] sm:w-full -right-2 sm:right-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-slate-900">
                                            <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                                                <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedKeywords.length === 0}
                                                        onChange={() => setSelectedKeywords([])}
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    {' '}Todos
                                                </label>

                                                {uniqueKeywordTags.map((tag) => (
                                                    <KeywordTagItem
                                                        key={tag}
                                                        tag={tag}
                                                        isChecked={selectedKeywords.includes(tag)}
                                                        onSelect={() => handleTagSelect(tag)}
                                                        onDeselect={() => handleTagDeselect(tag)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="relative min-w-0 group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Filter className="h-4 w-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200 transition-colors" />
                                </div>
                                <Select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="pl-8 sm:pl-9 h-[42px] cursor-pointer text-sm sm:text-base text-gray-900 dark:text-white bg-white dark:bg-gray-950 truncate"
                                    title="Filtrar por Formato"
                                >
                                    <option value="Todos">Formato</option>
                                    {uniqueTypes.filter(t => t !== 'Todos').map(type => (
                                        <option key={type} value={type} className="text-gray-900 dark:text-white">{type}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {(!loading && !loadingFolders && (visibleFolders.length > 0 || filteredDocuments.length > 0)) && (
                    <div className="px-2 sm:px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/20 flex items-center gap-4">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={handleSelectAll}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-900"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Selecionar Todos</span>
                        </label>
                    </div>
                )}

                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {/* Skeleton Loading State */}
                    {(loading || loadingFolders) && Array.from({ length: 3 }).map((_, idx) => (
                        <li key={`skeleton-${String(idx)}`} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-pulse">
                            <div className="flex items-start flex-1 min-w-0">
                                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded mr-4 mt-1 flex-shrink-0"></div>
                                <div className="flex-1 space-y-3">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                                    <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                                </div>
                            </div>
                        </li>
                    ))}

                    {/* Rendering Folders */}
                    {!loading && !loadingFolders && visibleFolders.length > 0 && visibleFolders.map((folder, index) => (
                        <li
                            key={folder.id}
                            style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                            className="flex animate-in fade-in slide-in-from-bottom-4 group"
                        >
                            <label
                                className="flex items-start pt-6 sm:pt-10 px-2 sm:px-4 cursor-pointer touch-manipulation z-10 self-stretch"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const item = { id: folder.id, type: 'folder' as const, name: folder.name };
                                    if (selectedItems.some(i => i.id === folder.id && i.type === 'folder')) removeSelection(item); else addSelection(item);
                                }}
                            >
                                <input
                                    type="checkbox"
                                    aria-label={`Selecionar pasta ${folder.name}`}
                                    checked={selectedItems.some(i => i.id === folder.id && i.type === 'folder')}
                                    onChange={(e) => {
                                        const item = { id: folder.id, type: 'folder' as const, name: folder.name };
                                        if (e.target.checked) addSelection(item); else removeSelection(item);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-900"
                                />
                                <span className="sr-only">Selecionar {folder.name}</span>
                            </label>
                            <button
                                type="button"
                                className="relative flex-1 min-w-0 p-3 sm:p-6 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 flex flex-col lg:flex-row lg:items-center justify-between transition-all duration-300 ease-out hover:-translate-y-1 gap-3 sm:gap-4 cursor-pointer border-l-4 border-transparent hover:border-blue-500"
                                onClick={() => {
                                    setCurrentFolderId(folder.id);
                                    setFolderPath(path => [...path, folder]);
                                    setSelectedType('Todos');
                                }}
                            >
                                <div className="flex w-full flex-1 items-center min-w-0">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 mr-3 sm:mr-4 flex-shrink-0 shadow-sm">
                                        <Folder className="h-5 w-5 sm:h-6 sm:w-6 fill-current opacity-80" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                                            {folder.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden">
                                        <Button
                                            variant="outline"
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFolderToRename(folder);
                                                setIsRenameFolderOpen(true);
                                            }}
                                            className="transition-transform active:scale-95 hover:bg-gray-100 px-2 sm:px-3 h-8 sm:h-9"
                                            size="sm"
                                            title="Renomear Pasta"
                                        >
                                            <Edit2 className="h-4 w-4 sm:mr-2" />
                                            <span className="hidden sm:inline">Renomear</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFolderToMove(folder);
                                            }}
                                            className="transition-transform active:scale-95 hover:bg-gray-100 px-2 sm:px-3 h-8 sm:h-9"
                                            title="Mover de pasta"
                                            size="sm"
                                        >
                                            <FolderOutput className="h-4 w-4 sm:mr-2" />
                                            <span className="hidden sm:inline">Mover</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFolderToDelete(folder);
                                            }}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 px-2 sm:px-3 h-8 sm:h-9"
                                            size="sm"
                                            title="Excluir Pasta"
                                        >
                                            <Trash2 className="h-4 w-4 sm:mr-2" />
                                            <span className="hidden sm:inline">Excluir</span>
                                        </Button>
                                </div>
                            </button>
                            <div className="relative flex items-center pr-2 sm:pr-4 z-10 self-stretch" data-mobile-action-menu-root="true">
                                <button
                                    type="button"
                                    aria-label={`Ações da pasta ${folder.name}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMobileActionMenu((prev) => prev === `folder-${folder.id}` ? null : `folder-${folder.id}`);
                                    }}
                                    className="h-9 w-9 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-center"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                                {openMobileActionMenu === `folder-${folder.id}` && (
                                    <div className="absolute right-full mr-2 top-0 min-w-[160px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg p-1.5 flex flex-col gap-1">
                                        <button
                                            type="button"
                                            className="text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMobileFolderAction('rename', folder);
                                                setOpenMobileActionMenu(null);
                                            }}
                                        >
                                            Renomear
                                        </button>
                                        <button
                                            type="button"
                                            className="text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMobileFolderAction('move', folder);
                                                setOpenMobileActionMenu(null);
                                            }}
                                        >
                                            Mover
                                        </button>
                                        <button
                                            type="button"
                                            className="text-left px-3 py-2 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMobileFolderAction('delete', folder);
                                                setOpenMobileActionMenu(null);
                                            }}
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}

                    {/* Rendering Documents */}
                    {!loading && !loadingFolders && filteredDocuments.length === 0 && visibleFolders.length === 0 ? (
                        <li className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            {documents.length === 0 ? "Nenhum documento cadastrado. Adicione um novo." : "Nenhum documento encontrado na busca."}
                        </li>
                    ) : (
                        filteredDocuments.map((doc, index) => (
                            <li
                                key={doc.id}
                                ref={(element) => {
                                    documentCardRefs.current[doc.id] = element;
                                }}
                                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                                className={`flex animate-in fade-in slide-in-from-bottom-4 ${focusedDocumentId === doc.id ? 'ring-2 ring-blue-500/70 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                                <label
                                    className="flex items-start pt-6 sm:pt-10 px-2 sm:px-4 cursor-pointer touch-manipulation z-10 self-stretch"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        const item = { id: doc.id, type: 'document' as const, name: doc.title };
                                        if (selectedItems.some(i => i.id === doc.id && i.type === 'document')) removeSelection(item); else addSelection(item);
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        aria-label={`Selecionar documento ${doc.title}`}
                                        checked={selectedItems.some(i => i.id === doc.id && i.type === 'document')}
                                        onChange={(e) => {
                                            const item = { id: doc.id, type: 'document' as const, name: doc.title };
                                            if (e.target.checked) addSelection(item); else removeSelection(item);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-900"
                                    />
                                    <span className="sr-only">Selecionar {doc.title}</span>
                                </label>
                                <button
                                    type="button"
                                    className="relative flex-1 min-w-0 p-3 sm:p-6 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 flex flex-col lg:flex-row lg:items-center justify-between transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-1 gap-3 sm:gap-6 cursor-pointer border-l-4 border-transparent hover:border-blue-500"
                                    onClick={() => setPreviewDoc(doc)}
                                >
                                    <div className="flex items-start min-w-0 flex-1 w-full">
                                        {(() => {
                                            const type = doc.type?.toUpperCase() || '';
                                            if (type === 'PDF') {
                                                return (
                                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mr-4 flex-shrink-0 border border-red-200 dark:border-red-800/60 shadow-sm mt-1">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                );
                                            }
                                            if (type.includes('WORD') || type.includes('DOC')) {
                                                return (
                                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0 border border-blue-200 dark:border-blue-800/60 shadow-sm mt-1">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                );
                                            }
                                            if (type.includes('EXCEL') || type.includes('XLS') || type.includes('PLANILHA')) {
                                                return (
                                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mr-4 flex-shrink-0 border border-emerald-200 dark:border-emerald-800/60 shadow-sm mt-1">
                                                        <FileSpreadsheet className="h-6 w-6" />
                                                    </div>
                                                );
                                            }
                                            if (type.includes('IMAGEM') || type.includes('IMAGE') || type.includes('JPEG') || type.includes('PNG') || type.includes('JPG')) {
                                                return (
                                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 mr-4 flex-shrink-0 border border-purple-200 dark:border-purple-800/60 shadow-sm mt-1">
                                                        <FileImage className="h-6 w-6" />
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mr-4 flex-shrink-0 border border-gray-200 dark:border-gray-700 shadow-sm mt-1">
                                                    <FileIcon className="h-6 w-6" />
                                                </div>
                                            );
                                        })()}
                                        <div className="min-w-0 flex-1 lg:grid lg:grid-cols-2 lg:gap-4">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    {doc.keywords && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                                            {doc.keywords}
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                                        {doc.type}
                                                    </span>
                                                </div>

                                                <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                                    {doc.title}
                                                </p>

                                                {doc.subject && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                        Assunto: <span className="font-medium text-gray-900 dark:text-gray-200">{doc.subject}</span>
                                                    </p>
                                                )}

                                                {doc.entity_name && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                                                        Entidade principal: <span className="font-medium text-gray-900 dark:text-gray-200">{doc.entity_name}</span>
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-1">
                                                    {doc.sender && <p>De: <span className="font-medium text-gray-700 dark:text-gray-300">{doc.sender}</span></p>}
                                                    {doc.recipient && <p>Para: <span className="font-medium text-gray-700 dark:text-gray-300">{doc.recipient}</span></p>}
                                                </div>
                                            </div>

                                            <div
                                                className={`hidden lg:flex items-center w-full gap-3 ${!currentFolderId && doc.folder_id && allFoldersData.some((folder) => folder.id === doc.folder_id)
                                                    ? 'justify-between'
                                                    : 'justify-end'
                                                    }`}
                                            >
                                                {(isGlobalDocumentSearch || !currentFolderId) && doc.folder_id && allFoldersData.find((folder) => folder.id === doc.folder_id) && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!doc.folder_id) return;
                                                            setCurrentFolderId(doc.folder_id);
                                                            setFolderPath(buildFolderPath(doc.folder_id));
                                                            setSelectedType('Todos');
                                                            setPendingDocumentFocusId(doc.id);
                                                        }}
                                                        className="flex items-center gap-2.5 bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300 px-3.5 py-2 rounded-md text-base max-w-[260px] hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                                        title="Abrir pasta e localizar arquivo"
                                                    >
                                                        <Folder className="h-[18px] w-[18px] shrink-0 text-amber-500" />
                                                        <span className="truncate">{allFoldersData.find((folder) => folder.id === doc.folder_id)?.name}</span>
                                                    </button>
                                                )}
                                                <div className="text-right space-y-0.5">
                                                    {doc.document_date && (
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Data do Doc.</p>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
                                                                {new Date(doc.document_date + 'T12:00:00Z').toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                                        Salvo em <time>{new Date(doc.created_at).toLocaleDateString()}</time>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden">
                                            <Button
                                                variant="outline"
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDocumentToEditId(doc.id);
                                                    setIsDocumentModalOpen(true);
                                                }}
                                                title="Editar Documento"
                                                className="transition-transform active:scale-95 hover:bg-gray-100 px-2 sm:px-3 h-8 sm:h-9"
                                                size="sm"
                                            >
                                                <Edit2 className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">Editar</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                asChild
                                                title="Abrir no Google Drive"
                                                className="transition-transform active:scale-95 hover:bg-gray-100 px-2 sm:px-3 h-8 sm:h-9"
                                                size="sm"
                                            >
                                                <a href={doc.drive_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                                    <ExternalLink className="h-4 w-4 sm:mr-2" />
                                                    <span className="hidden sm:inline">Drive</span>
                                                </a>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDocumentToMove(doc);
                                                }}
                                                className="transition-transform active:scale-95 hover:bg-gray-100 px-2 sm:px-3 h-8 sm:h-9"
                                                title="Mover de pasta"
                                                size="sm"
                                            >
                                                <FolderOutput className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">Mover</span>
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDocumentToDelete(doc.id);
                                                }}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 transition-transform active:scale-95 px-2 sm:px-3 h-8 sm:h-9"
                                                title="Excluir"
                                                size="sm"
                                            >
                                                <Trash2 className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">Excluir</span>
                                            </Button>
                                    </div>
                                </button>
                                <div className="relative flex items-center pr-2 sm:pr-4 z-10 self-stretch" data-mobile-action-menu-root="true">
                                    <button
                                        type="button"
                                        aria-label={`Ações do documento ${doc.title}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMobileActionMenu((prev) => prev === `doc-${doc.id}` ? null : `doc-${doc.id}`);
                                        }}
                                        className="h-9 w-9 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-center"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                    {openMobileActionMenu === `doc-${doc.id}` && (
                                        <div className="absolute right-full mr-2 top-0 min-w-[160px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-lg p-1.5 flex flex-col gap-1">
                                            <button
                                                type="button"
                                                className="text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMobileDocumentAction('edit', doc);
                                                    setOpenMobileActionMenu(null);
                                                }}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                className="text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMobileDocumentAction('drive', doc);
                                                    setOpenMobileActionMenu(null);
                                                }}
                                            >
                                                Drive
                                            </button>
                                            <button
                                                type="button"
                                                className="text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMobileDocumentAction('move', doc);
                                                    setOpenMobileActionMenu(null);
                                                }}
                                            >
                                                Mover
                                            </button>
                                            <button
                                                type="button"
                                                className="text-left px-3 py-2 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMobileDocumentAction('delete', doc);
                                                    setOpenMobileActionMenu(null);
                                                }}
                                            >
                                                Excluir
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Floating Selection Action Bar */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 animate-in slide-in-from-bottom-8 duration-300">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {selectedItems.length} {selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'}
                        </span>
                        <button
                            onClick={() => setSelectedItems([])}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline text-left mt-0.5"
                        >
                            Limpar seleção
                        </button>
                    </div>

                    <div className="h-8 w-px bg-gray-200 dark:bg-gray-800" />

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsMultiMoveModalOpen(true)}
                            className="transition-transform active:scale-95"
                        >
                            <FolderOutput className="h-4 w-4 mr-2" />
                            Mover Selecionados
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsMultiDeleteModalOpen(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Selecionados
                        </Button>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <button
                        type="button"
                        className="fixed inset-0 bg-black/60 transition-opacity border-none cursor-default"
                        onClick={() => setPreviewDoc(null)}
                        aria-label="Fechar preview"
                    />
                    <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate pr-4">
                                {previewDoc.title}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" asChild size="sm">
                                    <a href={previewDoc.drive_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Nova Janela
                                    </a>
                                </Button>
                                <Button variant="ghost" onClick={() => setPreviewDoc(null)} size="sm" className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
                                    <X className="h-5 w-5 mr-1" />
                                    Fechar
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 w-full bg-gray-100 dark:bg-slate-950">
                            <iframe
                                src={getEmbedUrl(previewDoc.drive_url)}
                                className="w-full h-full border-0"
                                title={`Preview de ${previewDoc.title}`}
                                allow="autoplay; camera; microphone; fullscreen; picture-in-picture; display-capture; midi; geolocation; xr-spatial-tracking"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={!!documentToDelete}
                title="Excluir Documento"
                description="Tem certeza que deseja mover este documento para a lixeira? "
                confirmText="Mover para lixeira"
                cancelText="Cancelar"
                onConfirm={() => {
                    if (documentToDelete) {
                        handleDelete(documentToDelete);
                    }
                }}
                onCancel={() => setDocumentToDelete(null)}
                isDestructive
            />

            {/* Confirm Multi-Delete Modal */}
            <ConfirmModal
                isOpen={isMultiDeleteModalOpen}
                title={`Excluir ${selectedItems.length === 1 ? '1 item' : String(selectedItems.length) + ' itens'}`}
                description={`Tem certeza que deseja mover ${selectedItems.length === 1 ? 'o item selecionado' : 'os itens selecionados'} para a lixeira?`}
                confirmText={isMultiDeleting ? "Excluindo..." : "Mover para lixeira"}
                cancelText="Cancelar"
                onConfirm={handleMultiDelete}
                onCancel={() => setIsMultiDeleteModalOpen(false)}
                isDestructive
            />

            {/* Folder Modals */}
            <CreateFolderModal
                isOpen={isCreateFolderOpen}
                onClose={() => setIsCreateFolderOpen(false)}
                parentId={currentFolderId}
            />

            <ImportDriveModal
                isOpen={isImportDriveModalOpen}
                onClose={() => setIsImportDriveModalOpen(false)}
                currentFolderId={currentFolderId}
            />

            <DeleteFolderModal
                isOpen={!!folderToDelete}
                onClose={() => setFolderToDelete(null)}
                folderId={folderToDelete?.id || null}
                folderName={folderToDelete?.name || ''}
            />

            <RenameFolderModal
                isOpen={isRenameFolderOpen}
                onClose={() => {
                    setIsRenameFolderOpen(false);
                    setFolderToRename(null);
                }}
                folder={folderToRename}
            />

            <MoveFolderModal
                isOpen={!!folderToMove}
                onClose={() => setFolderToMove(null)}
                folderId={folderToMove?.id || null}
                folderName={folderToMove?.name || ''}
                currentParentId={folderToMove?.parent_id || null}
            />

            <MoveMultipleModal
                isOpen={isMultiMoveModalOpen}
                items={selectedItems}
                currentFolderId={currentFolderId}
                onClose={() => {
                    setIsMultiMoveModalOpen(false);
                    setSelectedItems([]); // Clear selection after moving
                }}
            />

            <MoveDocumentModal
                isOpen={!!documentToMove}
                onClose={() => setDocumentToMove(null)}
                documentId={documentToMove?.id || null}
                documentTitle={documentToMove?.title || ''}
                currentFolderId={documentToMove?.folder_id || null}
            />

            {/* Document Creation / Edit Modal */}
            <DocumentModal
                isOpen={isDocumentModalOpen}
                onClose={() => {
                    setIsDocumentModalOpen(false);
                    setDocumentToEditId(null);
                }}
                documentId={documentToEditId}
                initialFolderId={currentFolderId}
            />
        </>
    );
}
