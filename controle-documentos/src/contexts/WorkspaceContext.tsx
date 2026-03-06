import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

export type WorkspaceRole = 'admin' | 'member';

export interface WorkspaceData {
    organization_id: string;
    organization_name: string;
    role: WorkspaceRole;
}

interface WorkspaceContextProps {
    currentWorkspace: WorkspaceData | null;
    loadingWorkspace: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceData | null>(null);
    const [loadingWorkspace, setLoadingWorkspace] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchWorkspace = async () => {
            if (!user) {
                if (mounted) {
                    setCurrentWorkspace(null);
                    setLoadingWorkspace(false);
                }
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('workspace_members')
                    .select('organization_id, role, organizations(name)')
                    .eq('user_id', user.id)
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    // Workspace not found — handled gracefully
                }

                if (data && mounted) {
                    const orgData = data.organizations as unknown as { name: string } | null;
                    setCurrentWorkspace({
                        organization_id: data.organization_id,
                        organization_name: orgData?.name || 'Minha Empresa',
                        role: data.role as WorkspaceRole,
                    });
                }
            } catch {
                // Workspace fetch failed — handled gracefully
            } finally {
                if (mounted) setLoadingWorkspace(false);
            }
        };

        fetchWorkspace();

        return () => {
            mounted = false;
        };
    }, [user]);

    const contextValue = useMemo(() => ({ currentWorkspace, loadingWorkspace }), [currentWorkspace, loadingWorkspace]);

    return (
        <WorkspaceContext.Provider value={contextValue}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
};
