/**
 * FlyWorkFlow brand mark: circle, eyes and wings (Tier B of the identity
 * exploration — antennae dropped so the outline stays legible down to
 * favicon size). Monochrome by design: every shape shares `color`, so a
 * single prop switches the mark between the gold-on-dark and ink-on-light
 * treatments. Self-contained (no asset request) and `aria-hidden`, since it
 * is decorative everywhere it's currently used.
 */
interface FlyIconProps {
  size?: number;
  className?: string;
  color?: string;
}

/** Renders the fly mark at the given pixel size. */
export default function FlyIcon({ size = 22, className, color = '#f2b705' }: FlyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
      aria-hidden="true"
    >
      {/* Wings */}
      <path
        d="M 76,46 C 90,41 101,53 97,64 C 93,77 79,75 73,61 C 71,54 72,49 76,46 Z"
        stroke="currentColor"
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
      <path
        d="M 24,46 C 10,41 -1,53 3,64 C 7,77 21,75 27,61 C 29,54 28,49 24,46 Z"
        stroke="currentColor"
        strokeWidth={4.5}
        strokeLinejoin="round"
      />

      {/* Body */}
      <circle cx={50} cy={58} r={30} stroke="currentColor" strokeWidth={4.5} />

      {/* Eyes */}
      <ellipse cx={38} cy={33} rx={8.5} ry={10.5} fill="currentColor" />
      <ellipse cx={62} cy={33} rx={8.5} ry={10.5} fill="currentColor" />
    </svg>
  );
}
