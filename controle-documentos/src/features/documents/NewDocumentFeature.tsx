import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useDocument } from './hooks/useDocument';
import { useEffect } from 'react';

export default function NewDocumentFeature() {
    const [title, setTitle] = useState('');
    const [entityName, setEntityName] = useState('');
    const [subject, setSubject] = useState('');
    const [documentDate, setDocumentDate] = useState('');
    const [keywords, setKeywords] = useState('');
    const [sender, setSender] = useState('');
    const [recipient, setRecipient] = useState('');
    const [type, setType] = useState('PDF');
    const [driveUrl, setDriveUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { id } = useParams<{ id: string }>();
    const { data: documentToEdit, isLoading: isFetchingDoc } = useDocument(id);

    // Populate form if in edit mode
    useEffect(() => {
        if (documentToEdit) {
            setTitle(documentToEdit.title || '');
            setEntityName(documentToEdit.entity_name || '');
            setSubject(documentToEdit.subject || '');
            setDocumentDate(documentToEdit.document_date || '');
            setKeywords(documentToEdit.keywords || '');
            setSender(documentToEdit.sender || '');
            setRecipient(documentToEdit.recipient || '');
            setType(documentToEdit.type || 'PDF');
            setDriveUrl(documentToEdit.drive_url || '');
        }
    }, [documentToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

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
            user_id: user.id
        };

        const { error } = id
            ? await supabase.from('documents').update(payload).eq('id', id)
            : await supabase.from('documents').insert([payload]);

        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            navigate('/');
        } else {
            alert('Erro ao salvar documento: ' + error.message);
        }
        setLoading(false);
    };

    if (isFetchingDoc) {
        return <div className="p-8 text-center text-gray-500">Carregando documento...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 shadow-sm rounded-lg border border-gray-100 dark:border-gray-800 transition-colors">
            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {id ? 'Editar Documento' : 'Salvar Novo Link'}
                </h3>
                <p className="mt-2 text-md text-gray-500 dark:text-gray-400">
                    {id ? 'Atualize os metadados do seu documento.' : 'Adicione os metadados e a URL compartilhável do Google Drive.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
                <div className="space-y-3">
                    <Label htmlFor="title" className="text-lg">Título Identificador</Label>
                    <Input
                        id="title"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Contrato de Prestação de Serviços"
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="space-y-3 flex-1">
                        <Label htmlFor="entityName" className="text-lg">Nome Principal</Label>
                        <Input
                            id="entityName"
                            value={entityName}
                            onChange={(e) => setEntityName(e.target.value)}
                            placeholder="Tribunal, Corregedoria, Cartório..."
                            className="text-lg h-12"
                        />
                    </div>
                    <div className="space-y-3 w-full md:w-44">
                        <Label htmlFor="documentDate" className="text-lg">Data do Documento</Label>
                        <Input
                            type="date"
                            id="documentDate"
                            value={documentDate}
                            onChange={(e) => setDocumentDate(e.target.value)}
                            className="text-lg h-12"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="subject" className="text-lg">Assunto</Label>
                    <Input
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Descreva brevemente o assunto do documento"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <Label htmlFor="sender" className="text-lg">Remetente</Label>
                        <Input
                            id="sender"
                            value={sender}
                            onChange={(e) => setSender(e.target.value)}
                            placeholder="Quem enviou"
                            className="text-lg h-12"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="recipient" className="text-lg">Destinatário</Label>
                        <Input
                            id="recipient"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="Quem recebeu"
                            className="text-lg h-12"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="keywords" className="text-lg">Dados Relevantes</Label>
                    <Textarea
                        id="keywords"
                        rows={3}
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="Termos importantes separados por espaço ou vírgula..."
                    />
                </div>

                <div className="space-y-3">
                    <Label htmlFor="type" className="text-lg">Extensão / Tipo</Label>
                    <Select
                        id="type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        <option value="PDF">PDF</option>
                        <option value="Word (DOCX)">Word (DOCX)</option>
                        <option value="Excel (XLSX)">Excel (XLSX)</option>
                        <option value="Imagem">Imagem</option>
                        <option value="Outro">Outro</option>
                    </Select>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <Label htmlFor="drive_url" className="text-lg">Link do Google Drive (URL)</Label>
                    <Input
                        type="url"
                        id="drive_url"
                        required
                        placeholder="https://drive.google.com/..."
                        value={driveUrl}
                        onChange={(e) => setDriveUrl(e.target.value)}
                    />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium">Lembre-se de configurar o link do Google Drive para acesso público/leitura.</p>
                </div>

                <div className="flex flex-col-reverse md:flex-row justify-end pt-6 gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full md:w-auto transition-transform active:scale-95"
                        onClick={() => navigate('/')}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full md:w-auto transition-transform active:scale-95"
                        disabled={loading}
                    >
                        {loading ? 'Salvando...' : 'Salvar Arquivo'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
