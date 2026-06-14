'use client';

import { useContext } from 'react';
import { AuthContext } from '@/components/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { auth, setAuth } = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error.message);
      return;
    }

    setAuth({
      isAuthenticated: false,
      user: null,
      loading: false,
    });

    router.push('/login');
  };

  return (
    <div className="navbar bg-base-300">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-md dropdown-content bg-base-100 rounded-box z-1 mt-3 w-72 p-4 shadow">
            <li><a>HOME</a></li>
            <li><a onClick={() => document.getElementById('leaderboardModal').showModal()}>LEADERBOARD</a></li>
            <li><a>PROFILE</a></li>
            {auth.isAuthenticated && <li><a onClick={handleLogout}>LOGOUT</a></li>}
          </ul>
        </div>

        <a className="btn btn-ghost text-xl">tentative name 🤺</a>
      </div>

      <div className="navbar-end hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><a onClick={() => router.push('/')}>HOME</a></li>
          <li><a onClick={() => document.getElementById('leaderboardModal').showModal()}>LEADERBOARD</a></li>
          {auth.isAuthenticated ? (
            <>
              <li><a onClick={() => router.push('/profile')}>PROFILE</a></li>
              <li><a onClick={handleLogout}>LOGOUT</a></li>
            </>
          ) : (
            <>
              <li><a onClick={() => router.push('/login')}>LOGIN</a></li>
              <li><a onClick={() => router.push('/register')}>REGISTER</a></li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
