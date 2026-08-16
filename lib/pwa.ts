/*
 * Shared browser checks for installing the portal as a phone app.
 *
 * Everything here touches `window`, so it must only run after mount — the
 * install UI is client-side by nature.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    /** Stashed by the capture script in the root layout. */
    __jlpInstallEvent: BeforeInstallPromptEvent | null
  }
}

/** Dispatched once the capture script has an install event to hand over. */
export const INSTALL_AVAILABLE_EVENT = 'jlp:install-available'

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own flag, which predates display-mode.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  // iPadOS 13+ reports a Mac UA, so touch points are the giveaway.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  return /Android/.test(window.navigator.userAgent)
}

/** Facebook/Instagram-style webviews have no Add to Home Screen to point at. */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false
  return /FBAN|FBAV|Instagram|Line\/|KAKAOTALK|Twitter|WhatsApp|MicroMessenger/.test(
    window.navigator.userAgent
  )
}

/**
 * On iPhone only Safari can add to the home screen, and a QR scanned from
 * inside another app usually opens somewhere else — worth telling the client.
 */
export function isIosSafari(): boolean {
  if (!isIos()) return false
  const ua = window.navigator.userAgent
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !isInAppBrowser()
}

export function getInstallEvent(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null
  return window.__jlpInstallEvent ?? null
}
