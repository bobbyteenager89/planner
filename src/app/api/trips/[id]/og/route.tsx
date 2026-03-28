import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // consume params to avoid warning

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "60px 80px",
          backgroundColor: "#D14F36",
          fontFamily: "Arial Black, Impact, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: "#EBB644", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 12 }}>
          Goble Family
        </div>
        <div style={{ fontSize: 120, fontWeight: 900, color: "#F3EBE0", textTransform: "uppercase", lineHeight: 1, textShadow: "4px 4px 0 #EBB644", letterSpacing: "-0.02em" }}>
          BIG SKY
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: "#F3EBE0", marginTop: 16 }}>
          July 18 — 25, 2026
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#F3EBE0", opacity: 0.7, marginTop: 12 }}>
          8 days · Big Sky, Montana · Your trip is planned
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
