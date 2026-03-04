import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

interface UserSettings {
    primary_color: string;
    font_scale: number;
}

interface SettingsContextType {
    settings: UserSettings;
    isLoading: boolean;
    updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
}

const defaultSettings: UserSettings = {
    primary_color: '#2563eb', // Tailwind blue-600
    font_scale: 1.0,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    // Effect to apply settings to the DOM
    useEffect(() => {
        const root = document.documentElement;

        // Apply primary color variable
        root.style.setProperty('--primary-color', settings.primary_color);

        // Apply scale modifier variable
        root.style.setProperty('--font-scale', settings.font_scale.toString());

        // Hard-set root font-size based on 16px rem base
        const newFontSize = `${16 * settings.font_scale}px`;
        root.style.fontSize = newFontSize;

    }, [settings]);

    // Effect to fetch initial settings
    useEffect(() => {
        async function loadSettings() {
            if (!user) {
                setSettings(defaultSettings);
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('user_settings')
                    .select('primary_color, font_scale')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    // PGRST116 is "No rows found" - which is fine, we just use defaults
                    console.error('Error loading settings:', error);
                } else if (data) {
                    setSettings({
                        primary_color: data.primary_color || defaultSettings.primary_color,
                        font_scale: data.font_scale || defaultSettings.font_scale,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch user settings', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadSettings();
    }, [user]);

    const updateSettings = async (newSettings: Partial<UserSettings>) => {
        if (!user) return;

        // Optimistic UI update
        const updated = { ...settings, ...newSettings };
        setSettings(updated);

        try {
            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    primary_color: updated.primary_color,
                    font_scale: updated.font_scale,
                }, { onConflict: 'user_id' }); // Requires valid constraints if onConflict used instead of update/insert logic

            if (error) throw error;
        } catch (error) {
            console.error('Error saving settings:', error);
            // Optionally revert on failure but optimistic is fine for UX here.
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, isLoading, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
