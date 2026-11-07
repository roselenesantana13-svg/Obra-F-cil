import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import { capitalizeWords } from './ExpenseModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onGoogleSignIn: () => Promise<void>;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onGoogleSignIn,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setErrorMessage(null);
    setResetSent(false);
    setLoading(false);
    setGoogleLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const translateFirebaseError = (code: string, fallback: string): string => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado. Alterne para a aba "Entrar" ou recupere sua senha.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Escolha uma senha com no mínimo 6 caracteres.';
      case 'auth/invalid-email':
        return 'O endereço de e-mail informado é inválido.';
      case 'auth/operation-not-allowed':
        return 'O login por e-mail/senha não está ativo no Firebase Console. Ative em Authentication > Sign-in method.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas com erro. Aguarde alguns instantes e tente novamente.';
      case 'auth/network-request-failed':
        return 'Falha de conexão com a internet. Verifique sua rede e tente novamente.';
      case 'auth/user-disabled':
        return 'Esta conta foi desativada pelo administrador.';
      default:
        return fallback || 'Ocorreu um erro na autenticação. Tente novamente.';
    }
  };

  // Submit Handler for Email/Password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setResetSent(true);
      } catch (err: any) {
        setErrorMessage(translateFirebaseError(err?.code, err?.message));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMessage('Por favor, digite sua senha.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas não coincidem.');
        return;
      }

      setLoading(true);
      try {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (displayName.trim() && userCred.user) {
          try {
            await updateProfile(userCred.user, {
              displayName: displayName.trim(),
            });
          } catch {
            // Profile name is optional
          }
        }
        handleClose();
        onSuccess('Conta criada com sucesso! Seus dados agora estão na nuvem.');
      } catch (err: any) {
        setErrorMessage(translateFirebaseError(err?.code, err?.message));
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        handleClose();
        onSuccess('Login realizado com sucesso!');
      } catch (err: any) {
        setErrorMessage(translateFirebaseError(err?.code, err?.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleClick = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      await onGoogleSignIn();
      handleClose();
    } catch {
      // Any error handling is managed inside onGoogleSignIn
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-[#0e1726] border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-800 flex items-center justify-between bg-[#0b1120]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs">
              🏗️
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                {mode === 'login' && 'Entrar no Obra Fácil'}
                {mode === 'register' && 'Criar Nova Conta'}
                {mode === 'forgot' && 'Recuperar Senha'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'login' && 'Acesse seus lançamentos salvos na nuvem'}
                {mode === 'register' && 'Cadastre-se com seu e-mail e senha'}
                {mode === 'forgot' && 'Enviaremos as instruções para seu e-mail'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switchers when not in forgot mode */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1.5 mx-6 mt-4 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entrar com E-mail
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cadastrar Nova Conta
            </button>
          </div>
        )}

        {/* Body Form */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {mode === 'forgot' && resetSent ? (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm text-white">E-mail de recuperação enviado!</h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Verifique a caixa de entrada (e spam) de <strong className="text-amber-400">{email}</strong> para redefinir sua senha.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setResetSent(false);
                  }}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 cursor-pointer"
                >
                  Voltar para o Login
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Optional Name when registering */}
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Seu Nome ou Construtora (opcional)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(capitalizeWords(e.target.value))}
                      autoCapitalize="words"
                      placeholder="Ex: Carlos Silva"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Endereço de E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Password Input (only when not in forgot mode) */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Senha
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMessage(null);
                        }}
                        className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'Mínimo de 6 caracteres' : 'Sua senha'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      className="w-full pl-9 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 cursor-pointer p-0.5"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (register mode only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a mesma senha"
                      autoComplete="new-password"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {mode === 'login' && (loading ? 'Entrando...' : 'Entrar com E-mail')}
                    {mode === 'register' && (loading ? 'Criando Conta...' : 'Cadastrar e Entrar')}
                    {mode === 'forgot' && (loading ? 'Enviando...' : 'Enviar Link de Redefinição')}
                  </span>
                </button>
              </div>

              {/* Forgot password back link */}
              {mode === 'forgot' && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar para o Login</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Social login divider & Google option */}
          {mode !== 'forgot' && !resetSent && (
            <div className="mt-5 pt-4 border-t border-slate-800">
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500 mb-3">
                <span className="bg-[#0e1726] px-2">ou continue com</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={googleLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.7c-.2-.7-.4-1.6-.4-2.7s.1-1.9.4-2.7L1.9 6.4C.7 8.8 0 10.4 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16C3.7 19.8 7.5 23 12 23z"
                    />
                  </svg>
                )}
                <span>{googleLoading ? 'Conectando...' : 'Entrar com o Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer info */}
        <div className="px-6 py-3 bg-[#0b1120] border-t border-slate-800 text-center text-[10px] text-slate-500">
          🔒 Seus dados ficam salvos de forma privada no seu projeto Firebase.
        </div>
      </div>
    </div>
  );
};
