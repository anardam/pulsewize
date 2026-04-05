import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} social share image`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "radial-gradient(circle at top left, rgba(225,70,124,0.22), transparent 34%), linear-gradient(180deg, #141414 0%, #0d0d0d 100%)",
          color: "#f5efe7",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#fb7185",
          }}
        >
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 72, lineHeight: 1.05, fontWeight: 700 }}>
            Read the signal.
          </div>
          <div style={{ display: "flex", fontSize: 72, lineHeight: 1.05, fontWeight: 700 }}>
            Make the next move.
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 900,
              fontSize: 26,
              lineHeight: 1.4,
              color: "#b8b0a8",
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 22,
            color: "#d6d0c8",
          }}
        >
          <div>Instagram</div>
          <div>•</div>
          <div>YouTube</div>
          <div>•</div>
          <div>Facebook</div>
        </div>
      </div>
    ),
    size
  );
}
