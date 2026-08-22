import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FlyWorkFlow — Gestión de Incidencias';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** OG card: the Tier-B fly mark next to the FlyWorkFlow wordmark, on the brand's dark background. */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        background: '#1a1a1a',
      }}
    >
      <svg width={160} height={160} viewBox="0 0 100 100" fill="none">
        <path
          d="M 76,46 C 90,41 101,53 97,64 C 93,77 79,75 73,61 C 71,54 72,49 76,46 Z"
          stroke="#f2b705"
          strokeWidth={4.5}
          strokeLinejoin="round"
        />
        <path
          d="M 24,46 C 10,41 -1,53 3,64 C 7,77 21,75 27,61 C 29,54 28,49 24,46 Z"
          stroke="#f2b705"
          strokeWidth={4.5}
          strokeLinejoin="round"
        />
        <circle cx={50} cy={58} r={30} stroke="#f2b705" strokeWidth={4.5} />
        <ellipse cx={38} cy={33} rx={8.5} ry={10.5} fill="#f2b705" />
        <ellipse cx={62} cy={33} rx={8.5} ry={10.5} fill="#f2b705" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 700 }}>
          <span style={{ color: '#ffffff' }}>Fly</span>
          <span style={{ color: '#8a8f98' }}>WorkFlow</span>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#8a8f98', marginTop: 8 }}>
          Gestión de Incidencias
        </div>
      </div>
    </div>,
    { ...size },
  );
}
