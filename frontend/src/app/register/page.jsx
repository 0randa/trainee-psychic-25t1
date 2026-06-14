'use client';

import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/components/AuthContext';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const { auth, setAuth } = useContext(AuthContext);
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated) {
      setErrorMsg('Already logged in. Redirecting to homepage -');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    }
  }, [auth]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Insert name into profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, name: username });
    if (profileError) {
      setErrorMsg(profileError.message);
      return;
    }

    router.push('/login');
  };

  return (
    <div className="flex justify-center items-center w-full min-h-screen bg-blue-100">
      <div className="flex-col bg-white p-5 gap-3 rounded-lg">
        <h1 className="text-center text-3xl font-bold mb-7">Register</h1>
        <form onSubmit={handleRegister}>
          {errorMsg && (
            <div className="text-red-600 font-medium my-2">{errorMsg}</div>
          )}

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Username</legend>
            <label className="input">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
              />
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Email</legend>
            <label className="input">
              <input
                type="email"
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

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Confirm password</legend>
            <label className="input input-bordered flex items-center gap-2 w-80">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
              />
            </label>
          </fieldset>

          <button className="btn btn-primary w-80 mt-3" type="submit">
            Register
          </button>

          <div className="mt-5 text-center">
            Have an account already?{' '}
            <Link
              href="/login"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Login here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
