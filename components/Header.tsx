'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { clearSession } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'
import LanguagePicker from '@/components/LanguagePicker'

interface HeaderProps {
  showLogout?: boolean
  showBack?: boolean
  backHref?: string
  subtitle?: string
  /**
   * Run before this header navigates anywhere. Return false to stay put —
   * a page with unsaved work uses it to flush first, or to keep the client
   * on the page when the flush fails. Absent means navigate immediately,
   * which is how every other page behaves.
   */
  beforeLeave?: () => Promise<boolean>
}

export default function Header({ showLogout, showBack, backHref, subtitle, beforeLeave }: HeaderProps) {
  const router = useRouter()
  const { t } = useLanguage()

  const handleLogout = async () => {
    if (beforeLeave && !(await beforeLeave())) return
    clearSession()
    router.push('/client')
  }

  const handleBack = async () => {
    if (beforeLeave && !(await beforeLeave())) return
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  // Positioned above the page: the language menu drops out of this header over
  // the content below, and a static header leaves it behind main's own stacking
  // context — the last option ends up under a card and unclickable. Kept below
  // the modal layers, which stay on top of everything.
  return (
    <header className="relative z-50 bg-black shadow-sm border-b border-white/10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Back button or spacer */}
        <div className="w-20">
          {showBack && (
            <button
              onClick={handleBack}
              className="text-white/70 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors"
              aria-label="Go back"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('back')}
            </button>
          )}
        </div>

        {/* Center: Logo */}
        <div className="text-center">
          <div className="flex flex-col items-center">
            <Image
              src="/logo.png"
              alt="866 JACK LAW"
              width={60}
              height={60}
              className="rounded-sm"
              priority
            />
            {subtitle && (
              <p className="text-white/50 text-xs mt-1 tracking-wider uppercase">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Language toggle + Logout */}
        <div className="flex items-center gap-2 justify-end shrink-0" style={{ minWidth: '5rem' }}>
          <LanguagePicker />
          {showLogout && (
            <button
              onClick={handleLogout}
              className="text-white/60 hover:text-white text-sm font-medium whitespace-nowrap transition-all duration-150 active:scale-[0.93]"
            >
              {t('logout')}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
