import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { useAllFolders } from '@/features/documents/hooks/useFolders';
import { FileText, FileSpreadsheet, FileImage, File as FileIcon, Search, ArrowRight, Activity, Clock, Folder } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function DashboardFeature() {
    const { data: documents = [], isLoading } = useDocuments('all');
    const { data: folders = [] } = useAllFolders();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchQuery.trim();
        if (query) {
            const searchLower = query.toLowerCase();
            const firstMatch = documents.find((doc) =>
                doc.title.toLowerCase().includes(searchLower) ||
                doc.entity_name?.toLowerCase().includes(searchLower) ||
                doc.subject?.toLowerCase().includes(searchLower) ||
                doc.keywords?.toLowerCase().includes(searchLower) ||
                doc.sender?.toLowerCase().includes(searchLower) ||
                doc.recipient?.toLowerCase().includes(searchLower)
            );

            navigate(`/documentos?q=${encodeURIComponent(query)}`, {
                state: { folderId: firstMatch?.folder_id || null }
            });
        } else {
            navigate('/documentos');
        }
    };

    const searchSuggestions = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const searchLower = searchQuery.toLowerCase();
        return documents.filter((doc) => {
            return doc.title.toLowerCase().includes(searchLower) ||
                doc.entity_name?.toLowerCase().includes(searchLower) ||
                doc.subject?.toLowerCase().includes(searchLower) ||
                doc.keywords?.toLowerCase().includes(searchLower) ||
                doc.sender?.toLowerCase().includes(searchLower) ||
                doc.recipient?.toLowerCase().includes(searchLower);
        }).slice(0, 5);
    }, [documents, searchQuery]);

    // Calculate metrics
    const metrics = useMemo(() => {
        const total = documents.length;

        // Documents added in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentCount = documents.filter(doc => new Date(doc.created_at) >= sevenDaysAgo).length;

        // Breakdown by type simplify
        const types = documents.reduce((acc, doc) => {
            const t = doc.type.toUpperCase();
            if (t === 'PDF') acc.pdf = (acc.pdf || 0) + 1;
            else if (t.includes('WORD') || t.includes('DOC')) acc.word = (acc.word || 0) + 1;
            else if (t.includes('EXCEL') || t.includes('XLS') || t.includes('PLANILHA')) acc.excel = (acc.excel || 0) + 1;
            else if (t.includes('IMAGEM') || t.includes('IMAGE') || t.includes('JPEG') || t.includes('PNG') || t.includes('JPG')) acc.image = (acc.image || 0) + 1;
            else acc.other = (acc.other || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return { total, recentCount, types };
    }, [documents]);

    // Get 5 most recent documents
    const recentDocuments = useMemo(() => {
        return [...documents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    }, [documents]);

    const getFileIcon = (type: string) => {
        const t = type.toUpperCase();
        if (t === 'PDF') return <FileText className="h-5 w-5 text-red-500" />;
        if (t.includes('WORD') || t.includes('DOC')) return <FileText className="h-5 w-5 text-blue-500" />;
        if (t.includes('EXCEL') || t.includes('XLS') || t.includes('PLANILHA')) return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
        if (t.includes('IMAGEM') || t.includes('IMAGE') || t.includes('JPEG') || t.includes('PNG') || t.includes('JPG')) return <FileImage className="h-5 w-5 text-purple-500" />;
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Global Search Area */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-10 shadow-sm border border-gray-100 dark:border-gray-800 text-center relative z-10">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-600 rounded-t-2xl"></div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight mt-2">
                    Encontre o que você precisa
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                    Busque em todo o seu repositório de documentos por título, palavras-chave, assunto, remetente ou entidade.
                </p>

                <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-gray-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Digite sua busca..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="pl-14 pr-32 py-8 text-lg rounded-xl shadow-sm border-gray-200 focus-visible:ring-primary focus-visible:border-primary dark:border-gray-700 bg-gray-50 dark:bg-slate-950 transition-all hover:bg-white dark:hover:bg-slate-900"
                    />
                    <div className="absolute inset-y-0 right-2 flex items-center">
                        <Button type="submit" size="lg" className="rounded-lg h-12 px-8 font-semibold">
                            Buscar
                        </Button>
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && searchQuery.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-20 text-left animate-in fade-in slide-in-from-top-2">
                            {searchSuggestions.length > 0 ? (
                                <ul className="py-2 divide-y divide-gray-50 dark:divide-slate-800/50">
                                    {searchSuggestions.map(doc => (
                                        <li key={doc.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery(doc.title);
                                                    setShowSuggestions(false);
                                                    navigate(`/documentos?q=${encodeURIComponent(doc.title)}`, { state: { folderId: doc.folder_id } });
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                                            >
                                                <div className="shrink-0 text-gray-400">
                                                    {getFileIcon(doc.type)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{doc.title}</p>
                                                    {doc.entity_name && <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-0.5">{doc.entity_name}</p>}
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-6 text-center text-sm text-gray-500">
                                    Nenhum documento encontrado.
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 transition-transform hover:-translate-y-1">
                    <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FileText className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Acervo</p>
                        {isLoading ? (
                            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mt-1"></div>
                        ) : (
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.total}</p>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 transition-transform hover:-translate-y-1">
                    <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Activity className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Últimos 7 dias</p>
                        {isLoading ? (
                            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mt-1"></div>
                        ) : (
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">+{metrics.recentCount}</p>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 col-span-1 lg:col-span-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Distribuição</p>
                    {isLoading ? (
                        <div className="flex gap-2 h-8 w-full animate-pulse mt-2">
                            <div className="h-full flex-1 bg-gray-200 dark:bg-gray-800 rounded-l-full"></div>
                            <div className="h-full flex-1 bg-gray-200 dark:bg-gray-800"></div>
                            <div className="h-full flex-1 bg-gray-200 dark:bg-gray-800 rounded-r-full"></div>
                        </div>
                    ) : (metrics.total <= 0 ? (
                        <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">Nenhum documento para classificar.</div>
                    ) : (
                        <div className="space-y-4">
                            {/* Simple Horizontal Bar */}
                            <div className="h-4 w-full flex rounded-full overflow-hidden shadow-inner">
                                {Boolean(metrics.types.pdf) && <div style={{ width: `${(metrics.types.pdf / metrics.total) * 100}%` }} className="bg-red-500" title="PDF"></div>}
                                {Boolean(metrics.types.word) && <div style={{ width: `${(metrics.types.word / metrics.total) * 100}%` }} className="bg-blue-500" title="Word"></div>}
                                {Boolean(metrics.types.excel) && <div style={{ width: `${(metrics.types.excel / metrics.total) * 100}%` }} className="bg-emerald-500" title="Excel"></div>}
                                {Boolean(metrics.types.image) && <div style={{ width: `${(metrics.types.image / metrics.total) * 100}%` }} className="bg-purple-500" title="Imagens"></div>}
                                {Boolean(metrics.types.other) && <div style={{ width: `${(metrics.types.other / metrics.total) * 100}%` }} className="bg-gray-400" title="Outros"></div>}
                            </div>
                            {/* Legend */}
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                                {Boolean(metrics.types.pdf) && <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></span> PDF ({metrics.types.pdf})</div>}
                                {Boolean(metrics.types.word) && <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2"></span> Word ({metrics.types.word})</div>}
                                {Boolean(metrics.types.excel) && <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span> Excel ({metrics.types.excel})</div>}
                                {Boolean(metrics.types.image) && <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2"></span> Imagens ({metrics.types.image})</div>}
                                {Boolean(metrics.types.other) && <div className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 mr-2"></span> Outros ({metrics.types.other})</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Recent Documents Table (Takes up 2/3 space on large screens) */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-gray-400" />
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Adicionados Recentemente</h2>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/documentos')} className="text-primary hover:text-primary/80">
                            Ver todos <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                            <thead className="text-xs uppercase bg-gray-50 dark:bg-slate-950/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Documento</th>
                                    <th className="px-6 py-4 font-semibold">Tipo</th>
                                    <th className="px-6 py-4 font-semibold text-right">Cadastrado em</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={`skeleton-${String(i)}`} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : ((recentDocuments.length === 0) ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-gray-500">Nenhum documento recente.</td>
                                    </tr>
                                ) : (
                                    recentDocuments.map((doc) => (
                                        <tr
                                            key={doc.id}
                                            onClick={() =>
                                                navigate('/documentos', {
                                                    state: { folderId: doc.folder_id, focusDocumentId: doc.id }
                                                })
                                            }
                                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group"
                                        >
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex flex-col md:flex-row md:items-center gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
                                                        {getFileIcon(doc.type)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate block font-semibold">{doc.title}</p>
                                                        {doc.entity_name && <p className="text-xs text-gray-500 truncate mt-0.5">{doc.entity_name}</p>}
                                                    </div>
                                                </div>
                                                {doc.folder_id && folders.find(f => f.id === doc.folder_id) && (
                                                    <div className="flex items-center gap-1.5 mt-2 md:mt-0 md:ml-auto md:w-48 bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300 px-2.5 py-1 rounded-md text-xs truncate shrink-0 max-w-full">
                                                        <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                                        <span className="truncate">{folders.find(f => f.id === doc.folder_id)?.name}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                                    {doc.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right tabular-nums">
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions (Takes up 1/3 space on large screens) */}
                <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl shadow-sm border border-primary/10 p-6 sm:p-8 flex flex-col justify-center text-center">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                        <FileText className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Novo Arquivo</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm">
                        Adicione um novo documento ao sistema para mantê-lo organizado e fácil de buscar.
                    </p>
                    <Button
                        size="lg"
                        onClick={() => navigate('/documentos', { state: { openNewDocument: true } })}
                        className="w-full min-h-14 h-auto py-3 px-3 sm:px-5 text-[11px] sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-normal leading-tight text-center"
                    >
                        <span className="text-center">Adicione um novo documento</span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
