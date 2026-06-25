'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogIn } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const [checkingUser, setCheckingUser] = useState(false);
  const [userFound, setUserFound] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string } | null>(null);

  // 4-digit PIN representation
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookupRequestRef = useRef(0);

  const checkUser = async (userVal: string, requestId: number) => {
    const cleanUsername = userVal.toLowerCase().trim();
    if (cleanUsername.length < 2 || isSignUp) {
      if (requestId === lookupRequestRef.current) {
        setUserFound(false);
        setUserNotFound(false);
        setUserInfo(null);
        setCheckingUser(false);
      }
      return;
    }

    if (requestId !== lookupRequestRef.current) return;
    setCheckingUser(true);
    setUserNotFound(false);

    try {
      const response = await fetch('/api/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername }),
      });
      const data = await response.json();
      
      if (requestId !== lookupRequestRef.current) return;

      if (data.exists) {
        setUserFound(true);
        setUserNotFound(false);
        setUserInfo({ name: cleanUsername });
        setMessage(null);
        setTimeout(() => {
          pinRefs[0].current?.focus();
        }, 50);
      } else {
        setUserFound(false);
        setUserNotFound(true);
        setUserInfo(null);
      }
    } catch (err) {
      console.error('Erro ao verificar usuário:', err);
      if (requestId === lookupRequestRef.current) {
        setUserFound(false);
        setUserNotFound(false);
        setUserInfo(null);
      }
    } finally {
      if (requestId === lookupRequestRef.current) {
        setCheckingUser(false);
      }
    }
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/\s/g, '');
    setUsername(clean);
    setUserFound(false);
    setUserNotFound(false);
    setUserInfo(null);
    setMessage(null);

    if (lookupTimerRef.current) {
      clearTimeout(lookupTimerRef.current);
    }
    const requestId = ++lookupRequestRef.current;

    if (clean.length >= 2) {
      lookupTimerRef.current = setTimeout(() => {
        checkUser(clean, requestId);
      }, 150);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setMessage(null);

    // Focus next input if value was entered
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }

    // Auto-submit if PIN is complete (4 digits) and logging in
    if (value && index === 3 && !isSignUp && userFound) {
      const fullPin = newPin.join('');
      handleSubmit(undefined, fullPin);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent, overridePassword?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage(null);

    const activePassword = overridePassword !== undefined ? overridePassword : pin.join('');
    const url = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const body = isSignUp 
      ? { username, password: activePassword, full_name: fullName } 
      : { username, password: activePassword };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro na autenticação.');
      }

      if (isSignUp) {
        setMessage('Cadastro realizado com sucesso! Fazendo login automático...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1500);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      // Don't show scary red console errors with stack traces for expected invalid credentials
      if (err.message !== 'Credenciais inválidas') {
        console.error(err);
      }
      setMessage(err.message || 'Erro ao processar autenticação.');
      
      // Clear PIN on error and focus first input
      setPin(['', '', '', '']);
      setTimeout(() => {
        pinRefs[0].current?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0b0b11]/90 backdrop-blur-md p-8 md:p-10 border border-slate-900 shadow-2xl rounded-3xl w-full max-w-md relative z-10 animate-scale-in-login">
      <div className="flex flex-col items-center justify-center gap-4 text-center mb-8">
        <Image
          src="/logo.svg"
          alt="Forróflix"
          width={180}
          height={48}
          priority
          className="h-12 w-auto object-contain mb-1"
        />
        <p className="text-slate-400 text-xs mt-1">
          {isSignUp ? 'Preencha os dados abaixo' : 'Faça login para acessar suas aulas'}
        </p>
      </div>

      <form className="space-y-5" onSubmit={(e) => handleSubmit(e)}>
        {isSignUp ? (
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Nome Completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="João Silva"
                className="w-full bg-[#07070c] border border-slate-700/80 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Usuário
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="joaosilva"
                className="w-full bg-[#07070c] border border-slate-700/80 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Senha (PIN de 4 dígitos)
              </label>
              <div className="flex justify-center gap-4">
                {pin.map((digit, index) => {
                  const isFocused = focusedIndex === index;
                  const isFilled = !!digit;
                  return (
                    <div
                      key={index}
                      className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 ${
                        isFilled 
                          ? 'bg-red-950/30 border-red-600/80 shadow-[0_0_8px_rgba(220,38,38,0.25)]' 
                          : isFocused 
                            ? 'bg-[#0b0b14] border-red-600 ring-2 ring-red-600/35 shadow-[0_0_12px_rgba(220,38,38,0.15)]' 
                            : 'bg-[#050508] border-slate-700 hover:border-slate-600'
                      } border`}
                    >
                      {digit && (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-scale-in" />
                      )}
                      <input
                        ref={pinRefs[index]}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        aria-label={`Dígito ${index + 1} do PIN de Cadastro`}
                        onChange={(e) => handlePinChange(index, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(index, e)}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        disabled={loading}
                        style={{ color: 'transparent', caretColor: 'transparent' }}
                        className="absolute inset-0 w-full h-full rounded-full bg-transparent border-none outline-none text-center text-[1px] cursor-pointer select-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-slide-in">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Usuário
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="seuusuario"
                className={`w-full bg-[#07070c] border rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none text-sm transition-all duration-200 ${
                  userNotFound 
                    ? 'border-red-600 focus:border-red-600 focus:ring-1 focus:ring-red-600' 
                    : userFound
                      ? 'border-green-600 focus:border-green-600 focus:ring-1 focus:ring-green-600'
                      : 'border-slate-700/80 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                }`}
              />

              <div className="mt-2 text-xs h-4">
                {checkingUser && (
                  <span className="flex items-center gap-1.5 text-orange-500">
                    <span className="w-3 h-3 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin inline-block" />
                    Buscando usuário...
                  </span>
                )}
                {userNotFound && (
                  <span className="text-red-500 flex items-center gap-1 font-semibold">
                    ⚠️ Usuário não cadastrado
                  </span>
                )}
                {userFound && (
                  <span className="text-green-500 flex items-center gap-1 font-semibold">
                    ✓ Usuário encontrado
                  </span>
                )}
              </div>
            </div>

            {/* Password PIN Inputs */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Senha (PIN de 4 dígitos)
              </label>
              <div className="flex justify-center gap-4">
                {pin.map((digit, index) => {
                  const isFocused = focusedIndex === index;
                  const isFilled = !!digit;
                  return (
                    <div
                      key={index}
                      className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 ${
                        isFilled 
                          ? 'bg-red-950/30 border-red-600/80 shadow-[0_0_8px_rgba(220,38,38,0.25)]' 
                          : isFocused 
                            ? 'bg-[#0b0b14] border-red-600 ring-2 ring-red-600/35 shadow-[0_0_12px_rgba(220,38,38,0.15)]' 
                            : 'bg-[#050508] border-slate-700 hover:border-slate-600'
                      } border`}
                    >
                      {digit && (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-scale-in" />
                      )}
                      <input
                        ref={pinRefs[index]}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        aria-label={`Dígito ${index + 1} do PIN`}
                        onChange={(e) => handlePinChange(index, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(index, e)}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        disabled={loading}
                        style={{ color: 'transparent', caretColor: 'transparent' }}
                        className="absolute inset-0 w-full h-full rounded-full bg-transparent border-none outline-none text-center text-[1px] cursor-pointer select-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-600/20 flex gap-2.5 text-xs text-red-500 items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={loading || (!isSignUp && (!userFound || pin.some(d => !d)))}
            className="w-full bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 transition-all duration-200"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Processando...' : isSignUp ? 'Cadastrar' : 'Entrar'}
          </Button>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
        <span>
          {isSignUp ? 'Já tem uma conta?' : 'Ainda não é aluno?'}
        </span>
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setMessage(null);
            setUserFound(false);
            setUserNotFound(false);
            setUserInfo(null);
            setPin(['', '', '', '']);
            setUsername('');
          }}
          className="text-red-500 hover:underline font-bold"
        >
          {isSignUp ? 'Fazer login' : 'Cadastre-se agora'}
        </button>
      </div>
    </div>
  );
}
