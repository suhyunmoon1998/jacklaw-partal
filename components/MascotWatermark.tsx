import Image from 'next/image'

/**
 * The firm's mascot, sitting behind the page as a watermark.
 *
 * Render it as the first child of a `relative` page wrapper, and give the
 * page's own content `relative z-10` — this layer is z-0, so static content
 * would otherwise paint underneath it.
 *
 * Opacity is the dial worth touching: high enough that the colours read,
 * low enough that text over it stays legible. Text that lands on top of the
 * mascot should carry a white halo, e.g.
 * `[text-shadow:0_1px_8px_#fff,0_0_3px_#fff]`.
 */
export default function MascotWatermark({
  tone = 'light',
}: {
  /**
   * 'light' — full colour, for the white/gray pages.
   * 'dark'  — desaturated, for the black pages. On black the mascot's own
   *           dark areas disappear and only its outlines survive, which is
   *           why this tone needs more opacity than the light one to read.
   */
  tone?: 'light' | 'dark'
}) {
  const isDark = tone === 'dark'

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Warm wash behind the top of the page */}
      <div
        className={`absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full blur-3xl ${
          isDark ? 'bg-gold/[0.07]' : 'bg-gold/10'
        }`}
      />
      <Image
        src="/mascot.png"
        alt=""
        width={900}
        height={900}
        priority={false}
        className={`absolute -right-20 bottom-0 w-[min(105vw,640px)] h-auto ${
          isDark ? 'grayscale opacity-[0.25]' : 'opacity-[0.16]'
        }`}
      />
    </div>
  )
}
