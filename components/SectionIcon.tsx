/**
 * Renders a questionnaire section icon from the stroke paths in
 * lib/questionnaireMeta.ts. Colour comes from `currentColor`.
 */
export default function SectionIcon({
  paths,
  className = 'w-6 h-6',
}: {
  paths: readonly string[]
  className?: string
}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  )
}
