'use client'

import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders a dialog at the end of <body>, outside whatever opened it.
 *
 * The admin panel opens dialogs from inside other dialogs, and the outer one
 * animates in with a transform. A transformed element becomes the containing
 * block for its `position: fixed` descendants — so a nested overlay stops being
 * measured against the viewport and is sized, and then clipped, by the modal it
 * was opened from: header off the top, buttons off the bottom. Going through
 * the body sidesteps that entirely.
 *
 * Mounted on the client only. `document` does not exist while the page is
 * rendered on the server, and a portal opened during that pass would throw.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!ready) return null
  return createPortal(children, document.body)
}
