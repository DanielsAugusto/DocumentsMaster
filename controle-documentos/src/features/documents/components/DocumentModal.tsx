import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { X, FileText, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDocument } from '../hooks/useDocument';
import { useAllFolders } from '../hooks/useFolders';

interface DocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId?: string | null;  // Se vier ID, é modo Edição
    initialFolderId?: string | null; // Se vier da tela e for Novo, é o initial folder
}

export function DocumentModal({ isOpen, onClose, documentId, initialFolderId }: DocumentModalProps) {
    const [title, setTitle] = useState('');
    const [entityName, setEntityName] = useState('');
    const [subject, setSubject] = useState('');
    const [documentDate, setDocumentDate] = useState('');
    const [keywords, setKeywords] = useState('');
    const [sender, setSender] = useState('');
    const [recipient, setRecipient] = useState('');
    const [type, setType] = useState('PDF');
    const [driveUrl, setDriveUrl] = useState('');
    const [folderId, setFolderId] = useState<string>('root'); // 'root' = null folder
    const [folderSearch, setFolderSearch] = useState(''); // Filtro de busca de pastas no Create Modal
    const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false); // Estado do combobox customizado

    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [mounted, setMounted] = useState(false);

    // Fetch para modo de edição
    const { data: documentToEdit, isLoading: isFetchingDoc } = useDocument(documentId || undefined);

    // Fetch all folders for the select box
    const { data: allFolders = [], isLoading: isFetchingFolders } = useAllFolders();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Limpar state or set edit payload base when opening
    useEffect(() => {
        if (isOpen) {
            setFolderSearch('');
            if (documentId && documentToEdit) {
                // Modo Edição - Preencher form
                setTitle(documentToEdit.title || '');
                setEntityName(documentToEdit.entity_name || '');
                setSubject(documentToEdit.subject || '');
                setDocumentDate(documentToEdit.document_date || '');
                setKeywords(documentToEdit.keywords || '');
                setSender(documentToEdit.sender || '');
                setRecipient(documentToEdit.recipient || '');
                setType(documentToEdit.type || 'PDF');
                setDriveUrl(documentToEdit.drive_url || '');
                setFolderId(documentToEdit.folder_id || 'root');
            } else if (!documentId) {
                // Modo Novo Objeto - Limpar form
                setTitle('');
                setEntityName('');
                setSubject('');
                setDocumentDate(new Date().toISOString().split('T')[0]);
                setKeywords('');
                setSender('');
                setRecipient('');
                setType('PDF');
                setDriveUrl('');
                setFolderId(initialFolderId || 'root');
            }
        }
    }, [isOpen, documentId, documentToEdit, initialFolderId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Filtragem para o seletor de pastas (já que temos muitas)
    const filteredFolders = useMemo(() => {
        if (!folderSearch) return allFolders;
        return allFolders.filter(folder =>
            folder.name.toLowerCase().includes(folderSearch.toLowerCase())
        );
    }, [allFolders, folderSearch]);

    if (!isOpen || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

        const targetFolderId = folderId === 'root' ? null : folderId;

        const payload = {
            title,
            entity_name: entityName || null,
            subject: subject || null,
            document_date: documentDate || null,
            keywords: keywords || null,
            sender: sender || null,
            recipient: recipient || null,
            type,
            drive_url: driveUrl,
            folder_id: targetFolderId,
            user_id: user.id
        };

        const { error } = documentId
            ? await supabase.from('documents').update(payload).eq('id', documentId)
            : await supabase.from('documents').insert([payload]);

        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
            onClose();
        } else {
            alert('Erro ao salvar documento: ' + error.message);
        }
        setLoading(false);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 shadow-2xl rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                                {documentId ? 'Editar Documento' : 'Novo Documento'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {documentId ? 'Atualize os dados e a referência visual.' : 'Cadastre um novo arquivo em seu repositório.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Content - Scrollable */}
                <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                    {isFetchingDoc ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-gray-500">Recuperando informações do documento...</p>
                        </div>
                    ) : (
                        <form id="document-modal-form" onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

                            {/* Sessão: Estrutura / Arquivo Flex */}
                            <div className="p-5 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-gray-800 gap-6 grid grid-cols-1 md:grid-cols-2">
                                <div className="space-y-3 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <Label htmlFor="type" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo de Mídia Central</Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Classifica o comportamento estético na listagem.</p>
                                    </div>
                                    <Select
                                        id="type"
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="mt-auto h-11"
                                    >
                                        <option value="PDF">PDF ou Documento Portátil</option>
                                        <option value="Word (DOCX)">Documento de Texto Editável (Word)</option>
                                        <option value="Excel (XLSX)">Planilha / Finanças (Excel)</option>
                                        <option value="Imagem">Foto / Imagem Assinada</option>
                                        <option value="Outro">Outro ou Genérico</option>
                                    </Select>
                                </div>

                                <div className="space-y-3 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Onde deseja salvar?</Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Pode organizar em uma de suas pastas ativas.</p>
                                    </div>

                                    {isFetchingFolders ? (
                                        <div className="h-11 bg-gray-200 dark:bg-slate-700 animate-pulse rounded-md" />
                                    ) : (
                                        <div className="relative mt-auto">
                                            {isFolderDropdownOpen && (
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsFolderDropdownOpen(false);
                                                    }}
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                                                className={`flex items-center justify-between w-full h-11 px-3 py-2 text-sm bg-white dark:bg-slate-900 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isFolderDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300 dark:border-gray-700'}`}
                                            >
                                                <span className="truncate text-gray-700 dark:text-gray-200 font-medium">
                                                    {folderId === 'root'
                                                        ? 'Sem Pasta (Diretório Raiz)'
                                                        : `📁 ${allFolders.find(f => f.id === folderId)?.name || '...'}`}
                                                </span>
                                                <Search className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                                            </button>

                                            {isFolderDropdownOpen && (
                                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-100">
                                                    <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/50">
                                                        <div className="relative">
                                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                            <Input
                                                                type="text"
                                                                placeholder="Pesquisar pasta existente..."
                                                                value={folderSearch}
                                                                onChange={(e) => setFolderSearch(e.target.value)}
                                                                className="pl-9 h-9 border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500 bg-white dark:bg-slate-900 text-sm"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Escape') {
                                                                        e.stopPropagation();
                                                                        setIsFolderDropdownOpen(false);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-52 overflow-y-auto p-1.5 custom-scrollbar">
                                                        <button
                                                            type="button"
                                                            className={`w-full text-left px-3 py-2.5 text-sm rounded-md transition-colors ${folderId === 'root' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                                                            onClick={() => {
                                                                setFolderId('root');
                                                                setIsFolderDropdownOpen(false);
                                                                setFolderSearch('');
                                                            }}
                                                        >
                                                            Sem Pasta (Diretório Raiz)
                                                        </button>

                                                        {filteredFolders.length > 0 && (
                                                            <div className="px-3 py-1.5 mt-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                                                Suas Pastas
                                                            </div>
                                                        )}

                                                        {filteredFolders.map(folder => (
                                                            <button
                                                                key={folder.id}
                                                                type="button"
                                                                className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm rounded-md transition-colors ${folderId === folder.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                                                                onClick={() => {
                                                                    setFolderId(folder.id);
                                                                    setIsFolderDropdownOpen(false);
                                                                    setFolderSearch('');
                                                                }}
                                                            >
                                                                <span className="text-amber-500">📁</span>
                                                                <span className="truncate">{folder.name}</span>
                                                            </button>
                                                        ))}

                                                        {folderSearch && filteredFolders.length === 0 && (
                                                            <div className="px-3 py-6 text-sm text-center text-gray-500">
                                                                Nenhuma pasta compatível encontrada.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sessão: Metadados */}
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <Label htmlFor="title" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Título Principal</Label>
                                    <Input
                                        id="title"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ex: Contrato de Prestação de Serviços"
                                        className="h-11"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    <div className="space-y-3 md:col-span-8">
                                        <Label htmlFor="entityName" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Órgão / Entidade Principal</Label>
                                        <Input
                                            id="entityName"
                                            value={entityName}
                                            onChange={(e) => setEntityName(e.target.value)}
                                            placeholder="Tribunal, Corregedoria, Cartório..."
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3 md:col-span-4">
                                        <Label htmlFor="documentDate" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Data do Fato</Label>
                                        <Input
                                            type="date"
                                            id="documentDate"
                                            value={documentDate}
                                            onChange={(e) => setDocumentDate(e.target.value)}
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="sender" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Remetente</Label>
                                        <Input
                                            id="sender"
                                            value={sender}
                                            onChange={(e) => setSender(e.target.value)}
                                            placeholder="Expedidor do Doc"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="recipient" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Destinatário</Label>
                                        <Input
                                            id="recipient"
                                            value={recipient}
                                            onChange={(e) => setRecipient(e.target.value)}
                                            placeholder="Quem recebeu"
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="subject" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assunto Curto</Label>
                                    <Input
                                        id="subject"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Ex: Rescisão ref. Janeiro"
                                        className="h-11"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="keywords" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Palavras-chave p/ Busca Rápida</Label>
                                    <Textarea
                                        id="keywords"
                                        rows={2}
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        placeholder="Valores, referências, protocolos..."
                                        className="resize-none"
                                    />
                                </div>
                            </div>

                            {/* Sessão de Arquivo */}
                            <div className="space-y-3 pt-2">
                                <Label htmlFor="drive_url" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Link de Armazenamento Real
                                    <span className="text-red-500 ml-1">*</span>
                                </Label>
                                <Input
                                    type="url"
                                    id="drive_url"
                                    required
                                    placeholder="Link compartilhável de onde o arquivo está hospedado (ex: GDrive Link)"
                                    value={driveUrl}
                                    onChange={(e) => setDriveUrl(e.target.value)}
                                    className="h-11 border-blue-200 focus:border-blue-400 dark:border-blue-900/50"
                                />
                            </div>

                        </form>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50 flex flex-col-reverse sm:flex-row gap-3 justify-end shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:w-auto hover:bg-white dark:hover:bg-slate-800"
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="document-modal-form"
                        className="w-full sm:w-auto"
                        disabled={loading || isFetchingDoc}
                    >
                        {loading ? 'Salvando...' : (documentId ? 'Atualizar Metadados' : 'Gerar e Salvar')}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
