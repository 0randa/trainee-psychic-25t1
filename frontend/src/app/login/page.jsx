'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/components/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const { auth, setAuth, checkAuthStatus } = useContext(AuthContext);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Redirect to home if already logged in
  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated) {
      setErrorMsg('Already logged in. Redirecting to homepage -');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    }
  }, [auth]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
      return;
    }

    await checkAuthStatus();
    router.push('/');
  };

  return (
    <div className="flex justify-center items-center w-full min-h-screen bg-base-200">
      <div className="flex-col bg-base-100 text-base-content p-5 gap-3 rounded-lg shadow-lg">
        <h1 className="text-center text-3xl font-bold mb-7">Login</h1>
        <form onSubmit={handleLogin}>
          {errorMsg && (
            <div className="text-error font-medium my-2">{errorMsg}</div>
          )}

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Email</legend>
            <label className="input input-bordered flex items-center gap-2 w-80">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
              />
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Password</legend>
            <label className="input input-bordered flex items-center gap-2 w-80">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </label>
          </fieldset>

          <button className="btn btn-primary w-80 mt-3" type="submit">
            Login
          </button>

          <div className="mt-5 text-center">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="link link-primary"
            >
              Signup now
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
