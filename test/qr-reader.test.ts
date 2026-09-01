import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const artifactUrl = new URL("../artifacts/qr-reader.html", import.meta.url);
const decoderUrl = new URL("../artifacts/jsqr.js", import.meta.url);
const vioDecoderUrl = new URL("../artifacts/vio.js", import.meta.url);
const formatDecoderUrl = new URL("../artifacts/qr-formats.js", import.meta.url);
describe("offline QR reader artifact", () => {
  it("ships its decoders locally and forbids network connections", async () => {
    const [html, decoder, vioDecoder, formatDecoder] = await Promise.all([
      readFile(artifactUrl, "utf8"),
      readFile(decoderUrl, "utf8"),
      readFile(vioDecoderUrl, "utf8"),
      readFile(formatDecoderUrl, "utf8"),
    ]);

    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<script src="./jsqr.js"></script>');
    expect(html).toContain('<script src="./vio.js"></script>');
    expect(html).toContain('<script src="./qr-formats.js"></script>');
    expect(html).toContain('id="fileInput"');
    expect(html).toContain("Mostrar mais detalhes");
    expect(html).toContain('aria-labelledby="reader-heading"');
    expect(html).toContain("Tudo acontece neste dispositivo");
    expect(html.indexOf('<section class="panel reader"')).toBeLessThan(html.indexOf('<section class="panel guide"'));

    expect(html).toContain('<main data-state="empty">');
    expect(html.indexOf('id="result"')).toBeLessThan(html.indexOf('id="preview"'));
    expect(html).toContain('main[data-state="loaded"] > header');
    expect(html).toContain('readerTitle.textContent = "Resultado da leitura";');

    expect(html).toContain("Cabeçalho JWT");
    expect(html).toContain("Payload JWT");
    expect(html).toContain("Assinatura (Base64URL)");
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("binaryData");
    expect(html).toContain("bytesToBase64");
    expect(html).not.toMatch(/<script[^>]+src=["']https?:/i);
    expect(html).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
    expect(decoder).toContain("jsQR");
    expect(vioDecoder).toContain("brainpoolP256r1");
    expect(vioDecoder).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
    expect(formatDecoder).toContain("CIN física");
    expect(formatDecoder).toContain("Placa Mercosul");
    expect(formatDecoder).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
  });
});
