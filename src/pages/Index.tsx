import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ShoppingList from './ShoppingList';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

const Index = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-gray-100 p-4">
        <form className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-6 border border-gray-100" onSubmit={handleLogin}>
          <h2 className="text-2xl font-extrabold text-center text-green-700 mb-2">Bem-vindo!<br /><span className='text-base font-normal text-gray-500'>Acesse sua conta ou cadastre-se</span></h2>
          <div className="space-y-3">
            <input
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-400 transition placeholder-gray-400"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <input
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-400 transition placeholder-gray-400"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="bg-red-100 text-red-700 text-sm rounded p-2 text-center animate-pulse">{error}</div>}
          <button
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg p-3 font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed shadow"
            type="submit"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            Entrar
          </button>
          <button
            className="w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg p-3 font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed shadow"
            type="button"
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            Cadastrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end p-4 bg-white border-b">
        <span className="mr-4">{user.email}</span>
        <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded">Sair</button>
      </div>
      <ShoppingList />
    </div>
  );
};

export default Index;
