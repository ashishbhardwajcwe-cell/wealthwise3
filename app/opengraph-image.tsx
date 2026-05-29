import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Auris Wealth — Wealth that compounds. Plans that hold under fire.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  // Load the logo from the public folder and inline it as a data URI.
  const logoBuf = await readFile(join(process.cwd(), "public", "auris-logo.png"));
  const logoSrc = `data:image/png;base64,${logoBuf.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          background: "linear-gradient(135deg, #0A1628 0%, #0F2035 50%, #142D4C 100%)",
          padding: "80px",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Subtle gold accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 6, background: "linear-gradient(90deg, #C9A84C, #E4CC7A, #C9A84C)",
        }} />

        {/* Brand mark with logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={72} height={72} alt="Auris" style={{ borderRadius: 8 }} />
          <span style={{ fontSize: 32, color: "#FFFDF5", fontWeight: 600, letterSpacing: -1 }}>
            Auris<span style={{ color: "#C9A84C" }}>Wealth</span>
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex", flexDirection: "column",
            marginTop: "auto", marginBottom: 0,
            color: "#FFFDF5",
          }}
        >
          <div style={{
            fontSize: 76, lineHeight: 1.05, fontWeight: 600,
            letterSpacing: -2, maxWidth: 980,
          }}>
            Wealth that compounds.
          </div>
          <div style={{
            fontSize: 76, lineHeight: 1.05, fontWeight: 600,
            letterSpacing: -2, color: "#C9A84C", maxWidth: 980,
          }}>
            Plans that hold under fire.
          </div>
          <div style={{
            fontSize: 26, color: "#C4CDD5", marginTop: 36,
            maxWidth: 920, lineHeight: 1.35, fontFamily: "sans-serif",
          }}>
            AI-powered financial planning and global wealth management — for
            professionals, families, and military officers.
          </div>
        </div>

        {/* Bottom strip */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: 40, fontSize: 16, color: "rgba(255, 253, 245, 0.6)",
          fontFamily: "sans-serif", letterSpacing: 1, textTransform: "uppercase",
        }}>
          <span>auriswealth.co</span>
          <span>NISM-certified · DPDP compliant</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
