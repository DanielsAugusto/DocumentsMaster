import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginFeature() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        } else {
            navigate('/');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 transition-colors">
                <div className="text-center">
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Entrar na conta</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Acesse o sistema de controle de documentos</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    {error && (
                        <div className="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/30 p-3 rounded-md border border-red-100 dark:border-red-900/50">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email-address">Email</Label>
                            <Input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                placeholder="nome@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="Sua senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full text-base" size="lg" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>


            </div>
        </div>
    );
}
