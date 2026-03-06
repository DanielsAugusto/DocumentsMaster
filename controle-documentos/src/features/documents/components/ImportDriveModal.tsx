import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, CloudDownload, File, RefreshCw, AlertCircle, Folder, ChevronRight } from 'lucide-react';
import { extractDriveFolderId, fetchPublicDriveFiles, fetchDriveFolderInfo, isDriveFolder } from '../api/drive';
import { createDocument } from '../api/createDocument';
import { createFolder } from '../api/folders';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface ImportDriveModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFolderId: string | null;
}

export function ImportDriveModal({ isOpen, onClose, currentFolderId }: ImportDriveModalProps) {
    const queryClient = useQueryClient();
    const { currentWorkspace } = useWorkspace();
    const [mounted, setMounted] = useState(false);

    // States
    const [link, setLink] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [foundFiles, setFoundFiles] = useState<any[]>([]);
    const [drivePath, setDrivePath] = useState<{ id: string, name: string }[]>([]);

    // Progress
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setLink('');
            setFoundFiles([]);
            setDrivePath([]);
            setError(null);
            setProgress(0);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isValidating && !isImporting) {
                onClose();
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, isValidating, isImporting]);

    if (!isOpen || !mounted) return null;

    const loadFolder = async (folderId: string) => {
        setIsValidating(true);
        setError(null);
        setFoundFiles([]);
        try {
            const folderInfo = await fetchDriveFolderInfo(folderId);
            const files = await fetchPublicDriveFiles(folderId);

            // Re-order so folders appear first
            const sortedFiles = [...files].sort((a, b) => {
                const aIsFolder = isDriveFolder(a.mimeType);
                const bIsFolder = isDriveFolder(b.mimeType);
                if (aIsFolder && !bIsFolder) return -1;
                if (!aIsFolder && bIsFolder) return 1;
                return a.name.localeCompare(b.name);
            });

            setFoundFiles(sortedFiles);
            setDrivePath(prev => {
                const existingIndex = prev.findIndex(p => p.id === folderId);
                if (existingIndex >= 0) {
                    return prev.slice(0, existingIndex + 1);
                }
                return [...prev, folderInfo];
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsValidating(false);
        }
    };

    const handleValidateLink = async () => {
        if (!link.trim()) return;

        const folderId = extractDriveFolderId(link);

        if (!folderId) {
            setError("Link inválido. Certifique-se de copiar o link inteiro da pasta do Drive.");
            return;
        }

        setDrivePath([]);
        await loadFolder(folderId);
    };

    const handleImport = async () => {
        if (foundFiles.length === 0 || drivePath.length === 0) return;

        setIsImporting(true);
        setError(null);
        setProgress(0);
        let importedCount = 0;

        try {
            const currentDriveFolder = drivePath[drivePath.length - 1];

            const processFolder = async (folderName: string, folderFiles: any[], parentId: string | null) => {
                if (!currentWorkspace?.organization_id) throw new Error("Organização não carregada");

                const newLocalFolder = await createFolder({
                    name: folderName,
                    parent_id: parentId,
                    organization_id: currentWorkspace.organization_id
                });

                importedCount++;
                setProgress(importedCount);

                for (const file of folderFiles) {


                    if (isDriveFolder(file.mimeType)) {
                        const subFiles = await fetchPublicDriveFiles(file.id);
                        await processFolder(file.name, subFiles, newLocalFolder.id);
                    } else {
                        await createDocument({
                            title: file.name,
                            drive_url: file.webViewLink,
                            folder_id: newLocalFolder.id,
                            organization_id: currentWorkspace.organization_id
                        });
                        importedCount++;
                        setProgress(importedCount);
                    }
                }
            };

            await processFolder(currentDriveFolder.name, foundFiles, currentFolderId);

            queryClient.invalidateQueries({ queryKey: ['documents'] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });

            setTimeout(() => {
                onClose();
            }, 800);

        } catch (err: any) {
            setError('Um erro ocorreu durante o processo de importação: ' + err.message);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        } finally {
            setIsImporting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <button type="button" className="fixed inset-0 bg-transparent border-none cursor-default" tabIndex={-1} onClick={() => !isValidating && !isImporting && onClose()} aria-label="Fechar modal" />
            <div className={`relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 flex flex-col ${foundFiles.length > 0 ? 'h-[80vh]' : ''}`}>
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <CloudDownload className="h-5 w-5 text-blue-500" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Importar do Google Drive
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => !isValidating && !isImporting && onClose()}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                            disabled={isValidating || isImporting}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Cole o link de uma pasta do Drive para migrá-la automaticamente. Funciona com pastas públicas e restritas (compartilhadas com a conta de serviço). Todos os arquivos se transformarão em Documentos no sistema.
                    </p>
                </div>

                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                    <div className="space-y-3">
                        <Label htmlFor="driveLink">Link da Pasta do Drive</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                id="driveLink"
                                placeholder="https://drive.google.com/drive/folders/..."
                                value={link}
                                onChange={(e) => {
                                    setLink(e.target.value);
                                    setFoundFiles([]); // Reset
                                }}
                                disabled={isValidating || isImporting}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                onClick={handleValidateLink}
                                disabled={!link || isValidating || isImporting}
                                className="w-full sm:w-auto shrink-0"
                            >
                                {isValidating ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Buscando...
                                    </>
                                ) : (
                                    'Buscar Arquivos'
                                )}
                            </Button>
                        </div>
                        {error && (
                            <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}
                    </div>

                    {drivePath.length > 0 && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 overflow-x-auto pb-2 whitespace-nowrap bg-gray-50/50 dark:bg-slate-800/20 p-2 rounded-md border border-gray-100 dark:border-gray-800">
                            {drivePath.map((pathItem, idx) => (
                                <div key={pathItem.id} className="flex items-center shrink-0">
                                    {idx > 0 && <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />}
                                    <button
                                        onClick={() => !isValidating && !isImporting && loadFolder(pathItem.id)}
                                        disabled={isValidating || isImporting}
                                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                                    >
                                        {pathItem.name}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {foundFiles.length > 0 && (
                        <div className="flex-1 flex flex-col min-h-0 min-h-[200px]">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center justify-between">
                                <span>{foundFiles.length} {foundFiles.length === 1 ? 'item' : 'itens'} nesta pasta</span>
                                <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700">Pré-visualização</span>
                            </h4>
                            <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-y-auto flex-1">
                                <ul className="divide-y divide-gray-100 dark:divide-gray-800/60 p-1">
                                    {foundFiles.map((file, idx) => {
                                        const isFolderItem = isDriveFolder(file.mimeType);
                                        return (
                                            <li key={file.id || idx} className="px-3 py-2 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 transition-colors rounded-md group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {isFolderItem ? (
                                                        <Folder className="h-4 w-4 text-blue-500 shrink-0" fill="currentColor" fillOpacity={0.2} />
                                                    ) : (
                                                        <File className="h-4 w-4 text-gray-400 shrink-0" />
                                                    )}
                                                    <span className="text-sm truncate font-medium text-gray-700 dark:text-gray-300 transition-colors">
                                                        {file.name}
                                                    </span>
                                                </div>

                                                {isImporting && !isFolderItem && (
                                                    <RefreshCw className="h-3 w-3 text-blue-500 ml-2 shrink-0 animate-spin" />
                                                )}

                                                {!isImporting && isFolderItem && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 ml-2"
                                                        onClick={() => loadFolder(file.id)}
                                                        disabled={isValidating}
                                                    >
                                                        Entrar
                                                    </Button>
                                                )}
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}

                    {isImporting && (
                        <div className="space-y-2 mt-auto">
                            <div className="flex justify-between text-sm font-medium">
                                <span className="text-blue-600 dark:text-blue-400">Importando de forma recursiva...</span>
                                <span className="text-gray-600 dark:text-gray-400">{progress} itens criados</span>
                            </div>
                            <div className="h-2 w-full bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 animate-pulse w-full" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 shrink-0 flex flex-col sm:flex-row justify-end gap-3 bg-gray-50 dark:bg-slate-900/50">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isValidating || isImporting}
                        className="w-full sm:w-auto"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleImport}
                        disabled={foundFiles.length === 0 || isImporting}
                        className="w-full sm:w-auto"
                    >
                        {isImporting ? 'Processando...' : 'Confirmar Importação'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
