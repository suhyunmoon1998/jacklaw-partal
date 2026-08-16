'use client'

/*
 * Where the printed QR code lands.
 *
 * The point of a separate page is the iPhone: Apple gives no way to trigger
 * an install from a link or a scan, so a client arriving from a QR needs the
 * Share-sheet steps spelled out. Android/Chrome gets a real Install button,
 * and a desktop visitor gets the QR itself to scan with their phone.
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { FIRM_PHONE_LABEL_HYPHENATED, FIRM_PHONE_TEL } from '@/lib/contact'
import { useLanguage } from '@/lib/i18n'
import {
  BeforeInstallPromptEvent,
  INSTALL_AVAILABLE_EVENT,
  getInstallEvent,
  isAndroid,
  isIos,
  isIosSafari,
  isStandalone,
} from '@/lib/pwa'

type Platform = 'ios' | 'android' | 'desktop'

export default function InstallPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [installed, setInstalled] = useState(false)
  const [needsSafari, setNeedsSafari] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    setPlatform(isIos() ? 'ios' : isAndroid() ? 'android' : 'desktop')
    setInstalled(isStandalone())
    setNeedsSafari(isIos() && !isIosSafari())
    setDeferred(getInstallEvent())

    const onAvailable = () => setDeferred(getInstallEvent())
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener(INSTALL_AVAILABLE_EVENT, onAvailable)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener(INSTALL_AVAILABLE_EVENT, onAvailable)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    // The event is single-use; the steps below cover a second attempt.
    window.__jlpInstallEvent = null
    setDeferred(null)
  }

  const steps =
    platform === 'android'
      ? [t('install_android_1'), t('install_android_2'), t('install_android_3')]
      : [t('install_ios_1'), t('install_ios_2'), t('install_ios_3')]

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header showBack backHref="/" />

      <main className="flex-1 px-4 py-8">
        <div className="w-full max-w-sm mx-auto">
          {/* What they end up with on the home screen */}
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-[22%] overflow-hidden shadow-lg shadow-black/60 ring-1 ring-white/10">
              <Image src="/icon-192.png" alt="" width={84} height={84} priority />
            </div>
            <p className="text-white/70 text-xs font-medium">866 JACKLAW</p>
          </div>

          <h1 className="text-white font-bold text-xl text-center mt-6">{t('install_page_title')}</h1>
          <p className="text-white/55 text-sm text-center mt-2 leading-relaxed">
            {t('install_page_sub')}
          </p>

          {installed ? (
            <div className="mt-8 rounded-2xl border border-gold/40 bg-gold/10 p-5 text-center">
              <p className="text-white text-sm font-semibold">{t('install_already')}</p>
              <button onClick={() => router.push('/client')} className="btn-primary mt-4">
                {t('continue_btn')}
              </button>
            </div>
          ) : platform === null ? null : platform === 'desktop' ? ( // platform is unknown until mount
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-white font-bold text-sm">{t('install_qr_title')}</p>
              <p className="text-white/55 text-xs mt-1.5 leading-relaxed">{t('install_qr_sub')}</p>
              <div className="mt-5 bg-white rounded-xl p-3 inline-block">
                {/* Plain <img>: the QR is a flat SVG that must not be re-encoded. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/install-qr.svg" alt="QR code" width={200} height={200} />
              </div>
            </div>
          ) : (
            <>
              {needsSafari && (
                <div className="mt-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
                  <p className="text-white/85 text-xs leading-relaxed">{t('install_safari_warning')}</p>
                </div>
              )}

              {deferred && (
                <button onClick={install} className="btn-primary mt-6">
                  {t('install_cta')}
                </button>
              )}

              <p className="text-white/35 text-[11px] uppercase tracking-widest font-semibold text-center mt-8 mb-4">
                {t('install_steps_heading')}
              </p>

              <ol className="space-y-3">
                {steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-sm font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-white/80 text-sm leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </>
          )}

          <div className="mt-10 text-center">
            <p className="text-white/40 text-xs">{t('install_help')}</p>
            <a
              href={FIRM_PHONE_TEL}
              className="inline-flex items-center gap-2 text-gold/80 hover:text-gold text-sm font-semibold mt-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              {FIRM_PHONE_LABEL_HYPHENATED}
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
