import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ExternalLink, Trash2, File as FileIcon, FileText, FileSpreadsheet, FileImage, Eye, X, Search, Filter, Edit2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useDocuments } from './hooks/useDocuments';
import { useQueryClient } from '@tanstack/react-query';
import { Document } from './api/getDocuments';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function DocumentListFeature() {
    const { data: documents = [], isLoading: loading } = useDocuments();
    const queryClient = useQueryClient();

    const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
    const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

    // Filtros
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [selectedType, setSelectedType] = useState('Todos');
    const [selectedEntity, setSelectedEntity] = useState('Todos');

    const handleDelete = async (id: string) => {
        // Optimistic UI updates could go here, but for simplicity we invalidate
        await supabase.from('documents').delete().eq('id', id);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        setDocumentToDelete(null);
    };

    const getEmbedUrl = (url: string) => {
        if (url.includes('/view')) {
            return url.replace('/view', '/preview');
        }
        return url;
    };

    const filteredDocuments = useMemo(() => {
        return documents.filter((doc) => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                doc.title.toLowerCase().includes(searchLower) ||
                (doc.entity_name && doc.entity_name.toLowerCase().includes(searchLower)) ||
                (doc.subject && doc.subject.toLowerCase().includes(searchLower)) ||
                (doc.keywords && doc.keywords.toLowerCase().includes(searchLower)) ||
                (doc.sender && doc.sender.toLowerCase().includes(searchLower)) ||
                (doc.recipient && doc.recipient.toLowerCase().includes(searchLower));

            const matchesType = selectedType === 'Todos' || doc.type === selectedType;
            const matchesEntity = selectedEntity === 'Todos' || doc.entity_name === selectedEntity;

            return matchesSearch && matchesType && matchesEntity;
        });
    }, [documents, searchTerm, selectedType, selectedEntity]);

    const uniqueTypes = useMemo(() => {
        const types = new Set(documents.map(d => d.type).filter(Boolean));
        return ['Todos', ...Array.from(types)];
    }, [documents]);

    const uniqueEntities = useMemo(() => {
        const entities = new Set(documents.map(d => d.entity_name).filter(Boolean));
        return ['Todos', ...Array.from(entities)] as string[];
    }, [documents]);

    // No longer blocking the whole render with a simple text loading.
    // We will render the UI shell and show Skeletons inside the list instead.

    return (
        <>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800 gap-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white w-full sm:w-1/3">Seus Documentos</h3>

                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto justify-end items-center flex-wrap xl:flex-nowrap">
                        <div className="relative w-full md:w-48 xl:w-56 shrink-0 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200 transition-colors" />
                            </div>
                            <Select
                                value={selectedEntity}
                                onChange={(e) => setSelectedEntity(e.target.value)}
                                className="pl-9 cursor-pointer text-gray-900 dark:text-white bg-white dark:bg-gray-950 truncate"
                                title="Filtrar por Título Identificador"
                            >
                                <option value="Todos">Todos</option>
                                {uniqueEntities.filter(e => e !== 'Todos').map(entity => (
                                    <option key={entity} value={entity} className="text-gray-900 dark:text-white">{entity}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="relative w-full md:w-80">
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
                                className="pl-10"
                            />
                        </div>

                        <div className="relative w-full md:w-40 shrink-0 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200 transition-colors" />
                            </div>
                            <Select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="pl-9 cursor-pointer text-gray-900 dark:text-white bg-white dark:bg-gray-950 truncate"
                                title="Filtrar por Formato"
                            >
                                <option value="Todos">Todos</option>
                                {uniqueTypes.filter(t => t !== 'Todos').map(type => (
                                    <option key={type} value={type} className="text-gray-900 dark:text-white">{type}</option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>

                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {loading ? (
                        // Skeleton Loader State
                        Array.from({ length: 3 }).map((_, idx) => (
                            <li key={idx} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-pulse">
                                <div className="flex items-start flex-1 min-w-0">
                                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded mr-4 mt-1 flex-shrink-0"></div>
                                    <div className="flex-1 space-y-3">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                                        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                                        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                                    </div>
                                </div>
                            </li>
                        ))
                    ) : filteredDocuments.length === 0 ? (
                        <li className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            {documents.length === 0 ? "Nenhum documento cadastrado. Adicione um novo." : "Nenhum documento encontrado na busca."}
                        </li>
                    ) : (
                        filteredDocuments.map((doc, index) => (
                            <li
                                key={doc.id}
                                className="p-6 hover:bg-gray-50 dark:hover:bg-slate-800/50 flex flex-col xl:flex-row xl:items-center justify-between transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-1 gap-6 animate-in fade-in slide-in-from-bottom-4 cursor-pointer"
                                onClick={() => setPreviewDoc(doc)}
                                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                            >
                                <div className="flex items-start min-w-0 flex-1">
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
                                                {doc.entity_name && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                                        {doc.entity_name}
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

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-1">
                                                {doc.sender && <p>De: <span className="font-medium text-gray-700 dark:text-gray-300">{doc.sender}</span></p>}
                                                {doc.recipient && <p>Para: <span className="font-medium text-gray-700 dark:text-gray-300">{doc.recipient}</span></p>}
                                            </div>
                                        </div>

                                        <div className="hidden lg:flex flex-col items-end justify-center space-y-1">
                                            {doc.document_date && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Data do Doc.</p>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
                                                        {new Date(doc.document_date + 'T12:00:00Z').toLocaleDateString()}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    Salvo em <time>{new Date(doc.created_at).toLocaleDateString()}</time>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full xl:w-auto mt-6 xl:mt-0" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="outline"
                                        asChild
                                        title="Editar Documento"
                                        className="flex-1 xl:flex-none transition-transform active:scale-95 hover:bg-gray-100 px-0 xl:px-3"
                                        size="sm"
                                    >
                                        <Link to={`/edit/${doc.id}`}>
                                            <Edit2 className="h-5 w-5 xl:h-4 xl:w-4 xl:mr-2" />
                                            <span className="hidden xl:inline">Editar</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        asChild
                                        title="Abrir no Google Drive"
                                        className="flex-1 xl:flex-none transition-transform active:scale-95 hover:bg-gray-100 px-0 xl:px-3"
                                        size="sm"
                                    >
                                        <a href={doc.drive_url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-5 w-5 xl:h-4 xl:w-4 xl:mr-2" />
                                            <span className="hidden xl:inline">Drive</span>
                                        </a>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setDocumentToDelete(doc.id)}
                                        className="flex-1 xl:flex-none text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 transition-transform active:scale-95 px-0 xl:px-3"
                                        title="Excluir"
                                        size="sm"
                                    >
                                        <Trash2 className="h-5 w-5 xl:mr-2" />
                                        <span className="hidden xl:inline">Excluir</span>
                                    </Button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="fixed inset-0 bg-black/60 transition-opacity"
                        onClick={() => setPreviewDoc(null)}
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
                description="Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={() => {
                    if (documentToDelete) {
                        handleDelete(documentToDelete);
                    }
                }}
                onCancel={() => setDocumentToDelete(null)}
                isDestructive
            />
        </>
    );
}
