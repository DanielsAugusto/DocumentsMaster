import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ExternalLink, Trash2, File as FileIcon, Eye, X, Search, Filter, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useDocuments } from './hooks/useDocuments';
import { useQueryClient } from '@tanstack/react-query';
import { Document } from './api/getDocuments';

export default function DocumentListFeature() {
    const { data: documents = [], isLoading: loading } = useDocuments();
    const queryClient = useQueryClient();

    const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('Todos');

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este documento?')) return;

        // Optimistic UI updates could go here, but for simplicity we invalidate
        await supabase.from('documents').delete().eq('id', id);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
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
            return matchesSearch && matchesType;
        });
    }, [documents, searchTerm, selectedType]);

    const uniqueTypes = useMemo(() => {
        const types = new Set(documents.map(d => d.type));
        return ['Todos', ...Array.from(types)];
    }, [documents]);

    // No longer blocking the whole render with a simple text loading.
    // We will render the UI shell and show Skeletons inside the list instead.

    return (
        <>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800 gap-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white w-full sm:w-1/3">Seus Documentos</h3>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-2/3 justify-end items-center">
                        <div className="relative w-full sm:w-80">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            </div>
                            <Input
                                type="text"
                                placeholder="Buscar por título..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            </div>
                            <Select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="pl-10"
                            >
                                {uniqueTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
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
                        filteredDocuments.map((doc) => (
                            <li key={doc.id} className="p-6 hover:bg-gray-50 dark:hover:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between transition-colors gap-6">
                                <div className="flex items-start min-w-0 flex-1">
                                    <FileIcon className="h-10 w-10 text-blue-500 dark:text-blue-400 mr-4 mt-1 flex-shrink-0" />
                                    <div className="min-w-0 flex-1 md:grid md:grid-cols-2 md:gap-4">
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

                                        <div className="hidden md:flex flex-col items-end justify-center space-y-1">
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

                                <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
                                    <Button
                                        variant="outline"
                                        onClick={() => setPreviewDoc(doc)}
                                        title="Visualizar Documento"
                                        className="flex-1 md:flex-none"
                                        size="sm"
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver
                                    </Button>
                                    <Button
                                        variant="outline"
                                        asChild
                                        title="Editar Documento"
                                        className="flex-1 md:flex-none"
                                        size="sm"
                                    >
                                        <Link to={`/edit/${doc.id}`}>
                                            <Edit2 className="h-4 w-4 mr-2" />
                                            Editar
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        asChild
                                        title="Abrir no Google Drive"
                                        className="flex-1 md:flex-none"
                                        size="sm"
                                    >
                                        <a href={doc.drive_url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Google Drive
                                        </a>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleDelete(doc.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                                        title="Excluir"
                                        size="icon"
                                    >
                                        <Trash2 className="h-5 w-5" />
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
        </>
    );
}
