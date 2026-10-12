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
    <header className="relative z-50 bg-black border-b border-white/10 pt-safe">
      <div className="max-w-2xl mx-auto h-14 px-4 flex items-center justify-between gap-3">
        {/* Left: back, then the firm's mark and what this page is */}
        <div className="flex items-center gap-2.5 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="-ml-1.5 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={t('back')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <Image
            src="/logo.png"
            alt="866 JACK LAW"
            width={34}
            height={34}
            className="rounded-[5px] shrink-0"
            priority
          />
          {subtitle && (
            <span className="truncate text-[13px] font-medium text-white/60 tracking-wide">{subtitle}</span>
          )}
        </div>

        {/* Right: language and sign out */}
        <div className="flex items-center gap-1.5 shrink-0">
          <LanguagePicker />
          {showLogout && (
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-[13px] font-medium whitespace-nowrap transition-colors"
            >
              {t('logout')}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
