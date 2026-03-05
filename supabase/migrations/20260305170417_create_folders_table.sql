-- Criando a tabela de Pastas (folders)
CREATE TABLE public.folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitando RLS para Folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Folders: Usuário só mexe no que é dele
CREATE POLICY "Users can view own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- Alterando a tabela `documents` para suportar `folder_id`
ALTER TABLE public.documents ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- Função RPC para exclusão de pasta e conteúdo opcional
CREATE OR REPLACE FUNCTION delete_folder(target_folder_id UUID, delete_documents BOOLEAN)
RETURNS void AS $$
BEGIN
    -- Se delete_documents for true, excluímos os arquivos locais (storage não suporta via sql direto, precisa ser feito pelo edge functions / frontend, mas faremos a deleção do registro do bucket / DB)
    IF delete_documents THEN
        DELETE FROM public.documents WHERE folder_id = target_folder_id;
    ELSE
        -- Se delete_documents for false, os arquivos ficam soltos (folder_id = null)
        UPDATE public.documents SET folder_id = NULL WHERE folder_id = target_folder_id;
    END IF;

    -- A pasta e suas subpastas (por causa do ON DELETE CASCADE no parent_id) serão removidas
    DELETE FROM public.folders WHERE id = target_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
