'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { AlertCircle, Sparkles, LogIn } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const url = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const body = isSignUp 
      ? { email, password, full_name: fullName } 
      : { email, password };

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
      console.error(err);
      setMessage(err.message || 'Erro ao processar autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'aluno@forroflix.com.br',
          password: 'senha123forro',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const registerRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'aluno@forroflix.com.br',
            password: 'senha123forro',
            full_name: 'Aluno de Teste Forroflix'
          }),
        });

        const registerData = await registerRes.json();
        if (!registerRes.ok) {
          throw new Error(registerData.error || 'Erro ao criar conta de demonstração.');
        }
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setMessage(`Modo de testes: ${err.message}. Tente cadastrar uma nova conta.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0b0b11]/90 backdrop-blur-md p-8 md:p-10 border border-slate-900 shadow-2xl rounded-3xl w-full max-w-md relative z-10">
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

      <form className="space-y-5" onSubmit={handleSubmit}>
        {isSignUp && (
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
              className="w-full bg-[#07070c] border border-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-1.5">
            Endereço de E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
            className="w-full bg-[#07070c] border border-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-1.5">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#07070c] border border-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm"
          />
        </div>

        {message && (
          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-600/20 flex gap-2.5 text-xs text-red-500 items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Processando...' : isSignUp ? 'Cadastrar' : 'Entrar'}
          </Button>

          {!isSignUp && (
            <Button
              type="button"
              onClick={handleDemoAccess}
              variant="outline"
              className="w-full border-slate-800 hover:bg-slate-900 text-slate-400 font-semibold gap-2 py-3.5"
            >
              <Sparkles className="w-4 h-4 text-red-600" />
              Acessar como Convidado
            </Button>
          )}
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
          }}
          className="text-red-500 hover:underline font-bold"
        >
          {isSignUp ? 'Fazer login' : 'Cadastre-se agora'}
        </button>
      </div>
    </div>
  );
}
