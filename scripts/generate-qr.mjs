/*
 * Regenerates the printable QR code that points clients at the install page.
 *
 *   npm run qr                      # uses the production URL below
 *   npm run qr https://jacklaw.com  # after a custom domain is attached
 *
 * The encoded URL is baked into the image, so this has to be re-run whenever
 * the portal's domain changes — otherwise the printed code silently keeps
 * pointing at the old host.
 */

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import QRCode from 'qrcode'

const DEFAULT_ORIGIN = 'https://jacklaw-portal.vercel.app'
const origin = (process.argv[2] || DEFAULT_ORIGIN).replace(/\/$/, '')
const target = `${origin}/install`

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// High error correction so the code still scans off a folded flyer or a
// screen photographed at an angle.
const options = { errorCorrectionLevel: 'H', margin: 2, color: { dark: '#000000', light: '#FFFFFF' } }

const svg = await QRCode.toString(target, { ...options, type: 'svg' })
await writeFile(join(publicDir, 'install-qr.svg'), svg)

await QRCode.toFile(join(publicDir, 'install-qr.png'), target, { ...options, width: 1024 })

console.log(`QR written for ${target}`)
console.log('  public/install-qr.svg  (print / vector)')
console.log('  public/install-qr.png  (1024px)')
