'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AuthPage() {
  const [loading, setLoading] = useState<'google' | 'github' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const signIn = async (provider: 'google' | 'github') => {
    setLoading(provider)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0e0e10] via-[#0a1628] to-[#0e0e10] p-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.3) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Card */}
      <div className={cn(
        'relative w-full max-w-sm rounded-2xl p-8 animate-fade-in',
        'bg-[#13131a] border border-white/8',
        'shadow-[0_8px_48px_rgba(0,0,0,0.6)]'
      )}>
        {/* Glow blob */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 glow-blue">
              <Zap size={20} className="text-white" fill="white" />
            </div>
            <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              SprintFlow
            </span>
          </div>
          <p className="text-slate-400 text-sm text-center">
            Your 2-week sprint, under control.
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={() => signIn('google')}
            disabled={loading !== null}
            className={cn(
              'w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3',
              'bg-white text-zinc-900 font-medium text-sm',
              'hover:bg-zinc-100 transition-all',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'shadow-md hover:shadow-lg'
            )}
          >
            {loading === 'google' ? (
              <span className="h-5 w-5 rounded-full border-2 border-zinc-400 border-t-zinc-700 animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* GitHub */}
          <button
            onClick={() => signIn('github')}
            disabled={loading !== null}
            className={cn(
              'w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3',
              'bg-[#24292e] text-white font-medium text-sm border border-white/10',
              'hover:bg-[#2f363d] transition-all',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'shadow-md hover:shadow-lg'
            )}
          >
            {loading === 'github' ? (
              <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            )}
            Continue with GitHub
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400 text-center bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-600">
          By signing in you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
