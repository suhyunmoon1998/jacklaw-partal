'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import {
  BeforeInstallPromptEvent,
  INSTALL_AVAILABLE_EVENT,
  getInstallEvent,
  isInAppBrowser,
  isIos,
  isStandalone,
} from '@/lib/pwa'

/**
 * Registers the service worker and offers to install the portal as a phone app.
 *
 * Two paths, because the platforms differ: Chrome/Edge (Android, desktop) fire
 * `beforeinstallprompt`, which we hold onto and replay when the client taps
 * Install. iOS Safari has no such event — installing is a manual trip through
 * the Share sheet — so there we show the steps instead.
 *
 * A dismissal is remembered for a week so the banner isn't nagging, and any
 * page can re-open it by dispatching `jlp:show-install`.
 */

const DISMISS_KEY = 'jlp_install_dismissed_at'
const DISMISS_DAYS = 7

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    if (!at) return false
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export default function InstallPrompt() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [canPrompt, setCanPrompt] = useState(false)
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)

  // Service worker registration — what makes the app installable at all.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* no worker just means no offline page; not worth surfacing to a client */
      })
    }
    if (document.readyState === 'complete') {
      register()
      return
    }
    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  useEffect(() => {
    if (isStandalone()) return
    setIos(isIos())

    const takeDeferred = (event: BeforeInstallPromptEvent) => {
      deferredRef.current = event
      setCanPrompt(true)
      if (!dismissedRecently()) setVisible(true)
    }

    // The layout script usually beats hydration to the event; if it did,
    // it's waiting on window for us.
    const stashed = getInstallEvent()
    if (stashed) takeDeferred(stashed)

    const onStashed = () => {
      const event = getInstallEvent()
      if (event) takeDeferred(event)
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      takeDeferred(e as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      deferredRef.current = null
      window.__jlpInstallEvent = null
      setCanPrompt(false)
      setVisible(false)
    }

    window.addEventListener(INSTALL_AVAILABLE_EVENT, onStashed)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    // iOS never fires beforeinstallprompt: offer the Share-sheet steps instead.
    const iosTimer = window.setTimeout(() => {
      if (isIos() && !isInAppBrowser() && !dismissedRecently()) setVisible(true)
    }, 2500)

    return () => {
      window.clearTimeout(iosTimer)
      window.removeEventListener(INSTALL_AVAILABLE_EVENT, onStashed)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* private browsing — the banner just comes back next visit */
    }
  }, [])

  const install = useCallback(async () => {
    const event = deferredRef.current
    if (!event) return
    await event.prompt()
    const { outcome } = await event.userChoice
    // A prompt can only be replayed once.
    deferredRef.current = null
    window.__jlpInstallEvent = null
    setCanPrompt(false)
    if (outcome === 'accepted') setVisible(false)
    else dismiss()
  }, [dismiss])

  // /install is the banner's own message at full size — no need to stack them.
  if (!visible || pathname === '/install') return null

  // With no prompt event to replay — iOS always, and any browser that keeps
  // installing behind its own menu — the banner explains where to find it.
  const showSteps = !canPrompt

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label={t('install_title')}
    >
      <div className="mx-auto max-w-sm rounded-2xl border border-white/15 bg-black/95 backdrop-blur p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <Image src="/icon-192.png" alt="" width={44} height={44} className="rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">
              {ios ? t('install_ios_title') : t('install_title')}
            </p>
            <p className="text-white/60 text-xs mt-1 leading-relaxed">
              {ios ? t('install_ios_body') : t('install_body')}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-white/40 hover:text-white/80 transition-colors shrink-0 -mt-1 -mr-1 p-1"
            aria-label={t('install_dismiss')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showSteps ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5">
            <svg className="w-4 h-4 text-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M5 13v5a2 2 0 002 2h10a2 2 0 002-2v-5"
              />
            </svg>
            <p className="text-white/70 text-xs">
              {ios ? t('install_ios_step') : t('install_menu_step')}
            </p>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={install}
              className="flex-1 bg-gold hover:bg-gold-dark active:scale-[0.97] text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
            >
              {t('install_cta')}
            </button>
            <button
              onClick={dismiss}
              className="px-4 text-white/50 hover:text-white/80 text-sm font-medium transition-colors"
            >
              {t('install_dismiss')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
