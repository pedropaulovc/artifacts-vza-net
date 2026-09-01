import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const artifactUrl = new URL("../artifacts/qr-reader.html", import.meta.url);
const decoderUrl = new URL("../artifacts/jsqr.js", import.meta.url);
const vioDecoderUrl = new URL("../artifacts/vio.js", import.meta.url);

describe("offline QR reader artifact", () => {
  it("ships its decoders locally and forbids network connections", async () => {
    const [html, decoder, vioDecoder] = await Promise.all([
      readFile(artifactUrl, "utf8"),
      readFile(decoderUrl, "utf8"),
      readFile(vioDecoderUrl, "utf8"),
    ]);

    expect(html).toContain('<script src="./jsqr.js"></script>');
    expect(html).toContain('<script src="./vio.js"></script>');
    expect(html).toContain('id="fileInput"');
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("binaryData");
    expect(html).toContain("bytesToBase64");
    expect(html).not.toMatch(/<script[^>]+src=["']https?:/i);
    expect(html).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
    expect(decoder).toContain("jsQR");
    expect(vioDecoder).toContain("brainpoolP256r1");
    expect(vioDecoder).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
  });
});
