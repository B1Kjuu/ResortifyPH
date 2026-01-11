import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background:
            'linear-gradient(135deg, #0ea5e9 0%, #22c55e 45%, #0f172a 100%)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 18px',
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 999,
              color: 'white',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 0.2,
              width: 'fit-content',
            }}
          >
            <span style={{ fontSize: 24 }}>ResortifyPH</span>
            <span
              style={{
                opacity: 0.9,
                fontWeight: 600,
                fontSize: 18,
              }}
            >
              Private Resort Booking
            </span>
          </div>

          <div
            style={{
              color: 'white',
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1.2,
              textShadow: '0 6px 30px rgba(0,0,0,0.35)',
              maxWidth: 980,
            }}
          >
            Book Private Resorts in the Philippines
          </div>

          <div
            style={{
              color: 'rgba(255,255,255,0.92)',
              fontSize: 30,
              lineHeight: 1.25,
              maxWidth: 980,
            }}
          >
            Discover beach getaways, mountain escapes, and exclusive staycations.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 24,
          }}
        >
          <div
            style={{
              color: 'rgba(255,255,255,0.92)',
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            resortifyph.me
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
            }}
          >
            {['Explore', 'Chat', 'Book'].map((t) => (
              <div
                key={t}
                style={{
                  padding: '10px 14px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.14)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
