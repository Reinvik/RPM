import React, { useState, useEffect } from 'react';
import { useNexusContext } from '../context/NexusContext';
import { Mail, Lock, ArrowRight, Loader2, Gauge } from 'lucide-react';

const RPM_QUOTES = [
    { text: "Lo que no se mide, no se puede mejorar.", author: "Lord Kelvin" },
    { text: "La potencia sin control no sirve de nada.", author: "Pirelli" },
    { text: "La precisión es la clave del rendimiento.", author: "Nexus RPM" },
    { text: "El mantenimiento predictivo evita la falla antes de que ocurra.", author: "Lean Maintenance" }
];

export default function Login() {
    const { login } = useNexusContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

    // Rotate quotes
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentQuoteIndex((prev) => (prev + 1) % RPM_QUOTES.length);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);
        try {
            const { error } = await login(email, password);
            if (error) {
                setError(error.message);
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Error de conexión. Intenta nuevamente.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050B14] flex flex-col lg:flex-row font-sans selection:bg-cyan-500/30 overflow-y-auto">
            {/* Left Panel - Hero Section (Premium Display) */}
            <div className="flex w-full lg:w-1/2 relative flex-col justify-between p-8 sm:p-12 bg-gradient-to-br from-[#050B14] via-[#0A1628] to-[#050B14] overflow-hidden min-h-screen">
                {/* Background Effects */}
                <div className="absolute inset-0 z-0 h-full w-full">
                    <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[120px] opacity-40"></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <div className="flex flex-col gap-1 mb-2">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 rounded-full"></div>
                                <Gauge className="h-10 w-10 text-cyan-400 relative" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white">NEXUS <span className="text-cyan-400">RPM</span></span>
                            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider ml-2">by SmartLean</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col justify-center">
                    <div className="self-start inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-6 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        Rendimiento y Control
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-6">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Métricas, Control e IA:</span> <br />
                        Optimizando cada <br />
                        revolución.
                    </h1>

                    <p className="text-slate-400 text-lg sm:text-2xl font-medium leading-relaxed mb-8 max-w-2xl">
                        Bienvenido a Nexus RPM. Monitoreamos y optimizamos el rendimiento financiero y operativo en tiempo real. Datos claros para decisiones rápidas.
                    </p>

                    {/* Rotating Quotes */}
                    <div className="relative h-32 w-full overflow-hidden mb-10">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-20 w-1 bg-cyan-500/50"></div>
                        {RPM_QUOTES.map((quote, index) => (
                            <div
                                key={index}
                                className={`absolute inset-0 flex flex-col justify-center pl-16 transition-all duration-1000 transform ${index === currentQuoteIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                                    }`}
                            >
                                <p className="text-slate-300 italic text-lg leading-relaxed">"{quote.text}"</p>
                                <p className="text-cyan-500 text-base font-bold mt-2">— {quote.author}</p>
                            </div>
                        ))}
                    </div>

                    {/* Abstract Visualization - Static */}
                    <div className="relative w-full h-48 overflow-hidden bg-transparent group">
                        <div className="absolute inset-0 flex items-center justify-center opacity-40">
                            <div className="absolute w-64 h-64 bg-cyan-500/10 rounded-full filter blur-xl"></div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-slate-500 font-medium">
                    © {new Date().getFullYear()} NEXUS ENTERPRISE. Una solución de SmartLean.
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-[#050B14] min-h-[100dvh]">
                <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-cyan-600/10 rounded-full filter blur-3xl opacity-20"></div>
                </div>

                <div className="w-full max-w-[420px] relative z-10 py-8">
                    <div className="mb-8">
                        <h2 className="text-xl sm:text-3xl font-bold text-white mb-2 leading-tight">
                            Bienvenido al <br className="hidden sm:block" /> Ecosistema Nexus
                        </h2>
                        <p className="text-slate-400 text-sm sm:text-base">Centro de control para Nexus RPM.</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-shake">
                            <span className="mr-2">⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="login-email" className="text-xs font-bold text-slate-500 uppercase tracking-wider">CORREO ELECTRÓNICO</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    id="login-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                    placeholder="usuario@empresa.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label htmlFor="login-password" className="text-xs font-bold text-slate-500 uppercase tracking-wider">CONTRASEÑA</label>
                                <span className="text-xs text-cyan-500 hover:text-cyan-400 font-bold transition-colors cursor-pointer">
                                    ¿OLVIDASTE TU CLAVE?
                                </span>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    id="login-password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                            {isLoggingIn ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Ingresando...</span>
                                </>
                            ) : (
                                <>
                                    <span>INICIAR SESIÓN</span>
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-slate-500 text-sm">
                            ¿No tienes acceso? <span className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors cursor-pointer">Solicita una invitación</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
