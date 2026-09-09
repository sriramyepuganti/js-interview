// Drop this file into any React sandbox / CRA / Vite app (e.g. src/ContextApiExample.jsx)
// and render <ContextApiExample /> somewhere. No extra dependencies needed.

import React, { createContext, useContext, useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// THE PROBLEM THIS SOLVES: prop drilling.
// Without context, `theme` and `user` would need to be passed as props through
// every intermediate component (Page -> Toolbar -> Group -> Button), even
// though Toolbar/Group never actually use them themselves.
// ---------------------------------------------------------------------------

// --- Split into TWO separate contexts by concern/update-frequency ---------
// WHY SPLIT: if we had ONE big context { user, theme }, then a component
// that only cares about `theme` would ALSO re-render every time `user`
// changes (login/logout), because it's subscribed to the same context value.
// Splitting means a Theme-only consumer never re-renders due to auth changes.
const ThemeContext = createContext(null);
const AuthContext = createContext(null);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  // WHY useMemo HERE: without it, `{ theme, setTheme }` is a BRAND NEW
  // object on every render of ThemeProvider (even if `theme` itself didn't
  // change), which would force every consumer to re-render every time,
  // since context comparison is reference-based, just like React.memo's
  // shallow prop check.
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState({ name: 'Sriramsai' });

  const login = (name) => setUser({ name });
  const logout = () => setUser(null);

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Small convenience hooks — a common pattern so consumers don't need to
// import createContext/useContext everywhere, and you get a nice error if
// someone forgets to wrap their tree in the Provider.
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Deeply nested consumers — notice NONE of the components in between
// (Toolbar, Group) need to know theme/user exist at all. This is the fix
// for prop drilling.
// ---------------------------------------------------------------------------
function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  console.log('Rendering ThemeToggleButton (only re-renders on theme change)');
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Current theme: {theme} (click to toggle)
    </button>
  );
}

function UserBadge() {
  const { user, logout } = useAuth();
  console.log('Rendering UserBadge (only re-renders on auth change)');
  return user ? (
    <div>
      Logged in as {user.name} <button onClick={logout}>Logout</button>
    </div>
  ) : (
    <div>Not logged in</div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  return <button onClick={() => login('Sriramsai')}>Log in as Sriramsai</button>;
}

// Intermediate "pass-through" components — this is exactly what Context
// lets us avoid having to thread props through.
function Group() {
  return (
    <div style={{ border: '1px solid #ccc', padding: 8, margin: 8 }}>
      <ThemeToggleButton />
      <UserBadge />
      <LoginForm />
    </div>
  );
}
function Toolbar() {
  return <Group />;
}

// ---------------------------------------------------------------------------
// THE RE-RENDER PITFALL (documented here, not wired up live, to keep this
// file simple) — this is what you'd see WITHOUT splitting contexts:
//
//   const AppContext = createContext();
//   function AppProvider({ children }) {
//     const [user, setUser] = useState(null);
//     const [theme, setTheme] = useState('light');
//     // BAD: one object holding unrelated concerns + no useMemo.
//     const value = { user, setUser, theme, setTheme };
//     return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
//   }
//
// Problem 1: `value` is a NEW object every render of AppProvider, so EVERY
// consumer re-renders every time AppProvider re-renders, regardless of
// whether `user` or `theme` actually changed.
//
// Problem 2: even if you wrap `value` in useMemo, a component that only
// reads `theme` STILL re-renders whenever `user` changes, because they're
// bundled into the same context value.
//
// THE FIX (implemented above): split into ThemeContext and AuthContext, and
// memoize each Provider's own value independently. Now a theme-only consumer
// truly never re-renders due to login/logout, and vice versa.
// ---------------------------------------------------------------------------

export default function ContextApiExample() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div style={{ padding: 16 }}>
          <h2>Context API Example (Theme + Auth, split contexts)</h2>
          <p>
            Open your console: toggling theme only logs "Rendering
            ThemeToggleButton", and logging in/out only logs "Rendering
            UserBadge" — because the contexts are split and each Provider's
            value is memoized.
          </p>
          <Toolbar />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
