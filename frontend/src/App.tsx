import type { ReactNode } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SignIn, SignUp, useAuth } from "@clerk/react";
import Landing from "./pages/Landing";
import ActivityDashboard from "./components/ActivityDashboard";

function PageShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#f7f8f6] text-neutral-900">{children}</div>;
}

function AuthLoading() {
  return (
    <PageShell>
      <div className="grid min-h-screen place-items-center px-6">
        <p className="text-sm text-neutral-500">Checking your session…</p>
      </div>
    </PageShell>
  );
}

function ProtectedDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) return <AuthLoading />;
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return <ActivityDashboard />;
}

function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  return (
    <PageShell>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5">
        <header className="flex h-[76px] items-center justify-between border-b border-neutral-200">
          <Link to="/" className="text-xl font-bold tracking-tight">CivicPilot<span>.</span></Link>
          <Link to="/sign-up" className="text-sm text-neutral-600 hover:text-neutral-950">Create an account</Link>
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md">
            <div className="mb-7 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800">Welcome back</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to CivicPilot</h1>
              <p className="mt-2 text-sm text-neutral-500">Continue to your activity dashboard.</p>
            </div>
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
          </div>
        </main>
      </div>
    </PageShell>
  );
}

function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  return (
    <PageShell>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5">
        <header className="flex h-[76px] items-center justify-between border-b border-neutral-200">
          <Link to="/" className="text-xl font-bold tracking-tight">CivicPilot<span>.</span></Link>
          <Link to="/sign-in" className="text-sm text-neutral-600 hover:text-neutral-950">Already have an account?</Link>
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md">
            <div className="mb-7 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800">Get started</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your account</h1>
              <p className="mt-2 text-sm text-neutral-500">Your guide to navigating online public services.</p>
            </div>
            <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
          </div>
        </main>
      </div>
    </PageShell>
  );
}

function NotFound() {
  return (
    <PageShell>
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">404 / Page not found</p>
          <h1 className="mt-4 text-3xl font-semibold">This page doesn't exist.</h1>
          <Link className="mt-6 inline-flex border border-neutral-900 bg-neutral-900 px-5 py-3 text-sm text-white hover:bg-white hover:text-neutral-900" to="/">Return home</Link>
        </div>
      </div>
    </PageShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
