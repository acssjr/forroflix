import { redirect } from 'next/navigation';

export default function LoginPageRedirect() {
  // Redirecionar para a home, que agora gerencia a tela de login
  redirect('/');
}
