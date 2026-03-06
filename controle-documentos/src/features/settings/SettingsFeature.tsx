import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function SettingsFeature() {
    const { settings, updateSettings, isLoading } = useSettings();
    const [localScale, setLocalScale] = useState(settings.font_scale);
    const [localRetentionDays, setLocalRetentionDays] = useState(settings.trash_retention_days);
    const [isSaving, setIsSaving] = useState(false);

    // Sync local state when external settings load/change
    useEffect(() => {
        setLocalScale(settings.font_scale);
        setLocalRetentionDays(settings.trash_retention_days);
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateSettings({
                font_scale: Number.parseFloat(localScale.toString()),
                trash_retention_days: Number.parseInt(localRetentionDays.toString())
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        setIsSaving(true);
        try {
            await updateSettings({
                font_scale: 1,
                trash_retention_days: 30
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-4 sm:p-6 lg:p-8 animate-pulse text-gray-500">Carregando configurações...</div>;
    }

    return (
        <div className="w-full bg-white dark:bg-slate-900 shadow-sm rounded-lg border border-gray-100 dark:border-gray-800 transition-colors p-4 sm:p-6 lg:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-5 sm:mb-6">Aparência e Acessibilidade</h2>

            <div className="space-y-8 sm:space-y-10">
                {/* Text Scale Slider */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <Label htmlFor="font-scale" className="text-lg font-medium">
                            Tamanho do Texto
                        </Label>
                        <span className="self-start sm:self-auto text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
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
                        onChange={(e) => setLocalScale(Number.parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="grid grid-cols-3 text-[11px] sm:text-xs text-gray-400 gap-2">
                        <span>Menor (80%)</span>
                        <span className="text-center">Padrão (100%)</span>
                        <span className="text-right">Maior (150%)</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-l-4 border-primary pl-3 py-1 leading-relaxed">
                        O tamanho do texto do aplicativo só será ajustado quando você salvar. Veja a prévia dinâmica abaixo:
                    </p>

                    {/* Live Text Preview Box */}
                    <div
                        className="mt-5 sm:mt-6 p-4 sm:p-6 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-gray-700 transition-all overflow-hidden"
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

                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <Label htmlFor="trash-retention" className="text-lg font-medium">
                            Limpeza Automática da Lixeira
                        </Label>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Escolha por quantos dias os arquivos e pastas excluídos devem permanecer na lixeira antes de serem excluídos permanentemente do sistema.
                    </p>
                    <select
                        id="trash-retention"
                        value={localRetentionDays}
                        onChange={(e) => setLocalRetentionDays(Number.parseInt(e.target.value))}
                        className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:text-white"
                    >
                        <option value={7}>7 Dias</option>
                        <option value={15}>15 Dias</option>
                        <option value={30}>30 Dias</option>
                        <option value={60}>60 Dias</option>
                        <option value={90}>90 Dias</option>
                        <option value={99999}>Nunca Esvaziar Sozinho</option>
                    </select>
                </div>

                <hr className="border-gray-100 dark:border-gray-800" />

                <div className="flex flex-col-reverse md:flex-row md:justify-end pt-5 sm:pt-6 gap-2 sm:gap-3 md:gap-4 border-t border-gray-100 dark:border-gray-800 mt-6">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleReset}
                        disabled={isSaving}
                        className="w-full md:w-auto !h-10 sm:!h-11 !px-3 sm:!px-4 !text-sm text-gray-500 hover:text-gray-900 whitespace-normal"
                    >
                        Restaurar Padrão
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full md:w-auto !h-10 sm:!h-11 !px-3 sm:!px-4 !text-sm transition-transform active:scale-95 whitespace-normal"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Preferências'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
