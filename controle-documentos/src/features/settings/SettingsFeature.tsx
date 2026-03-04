import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function SettingsFeature() {
    const { settings, updateSettings, isLoading } = useSettings();
    const [localScale, setLocalScale] = useState(settings.font_scale);
    const [isSaving, setIsSaving] = useState(false);

    // Sync local state when external settings load/change
    useEffect(() => {
        setLocalScale(settings.font_scale);
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateSettings({
                font_scale: parseFloat(localScale.toString())
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        setIsSaving(true);
        try {
            await updateSettings({
                font_scale: 1.0
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 animate-pulse text-gray-500">Carregando configurações...</div>;
    }

    return (
        <div className="w-full bg-white dark:bg-slate-900 shadow-sm rounded-lg border border-gray-100 dark:border-gray-800 transition-colors p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Aparência e Acessibilidade</h2>

            <div className="space-y-8">
                {/* Text Scale Slider */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="font-scale" className="text-lg font-medium">
                            Tamanho do Texto
                        </Label>
                        <span className="text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {Math.round(localScale * 100)}%
                        </span>
                    </div>
                    <input
                        id="font-scale"
                        type="range"
                        min="0.8"
                        max="1.5"
                        step="0.05"
                        value={localScale}
                        onChange={(e) => setLocalScale(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Menor (80%)</span>
                        <span>Padrão (100%)</span>
                        <span>Maior (150%)</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 border-l-4 border-primary pl-3 py-1">
                        O tamanho do texto do aplicativo só será ajustado quando você salvar. Veja a prévia dinâmica abaixo:
                    </p>

                    {/* Live Text Preview Box */}
                    <div
                        className="mt-6 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-gray-700 transition-all"
                        style={{ fontSize: `${16 * localScale}px` }}
                    >
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                            Exemplo de Título Principal
                        </h3>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 leading-tight">
                            Subtítulo de demonstração
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            Este é um texto de exemplo para demonstrar como o conteúdo do aplicativo se comportará com a nova escala escolhida. O tamanho se ajusta em tempo real conforme você move o controle deslizante acima, sem alterar os menus laterais e superiores.
                        </p>
                    </div>
                </div>

                <hr className="border-gray-100 dark:border-gray-800" />

                <div className="flex justify-end pt-6 gap-4 border-t border-gray-100 dark:border-gray-800 mt-6">
                    <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        onClick={handleReset}
                        disabled={isSaving}
                        className="text-gray-500 hover:text-gray-900"
                    >
                        Restaurar Padrão
                    </Button>
                    <Button
                        type="button"
                        size="lg"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="transition-transform active:scale-95"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Preferências'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
