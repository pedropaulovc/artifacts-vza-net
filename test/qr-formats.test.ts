import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";

import { describe, expect, it } from "vitest";

const decoderUrl = new URL("../artifacts/qr-formats.js", import.meta.url);

type JwtDetails = {
  format: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  segments: string[];
};
type JwtVerification = {
  state: string;
  label: string;
  message: string;
};

type FormatResult = {
  kind: string;
  title: string;
  badge: string;
  meta: string;
  warning: string;
  fields: { label: string; value: string }[];
  jwt: JwtDetails | null;
};

type FormatContext = {
  URL: typeof URL;
  atob: typeof atob;
  TextDecoder: typeof TextDecoder;
  Uint8Array: typeof Uint8Array;
  crypto: typeof webcrypto;
  TextEncoder: typeof TextEncoder;
  qrFormats: {
    classifyText: (input: string) => FormatResult;
    verifyJwtSignature: (jwt: JwtDetails) => Promise<JwtVerification>;
  };
};

async function loadClassifier(): Promise<FormatContext> {
  const source = await readFile(decoderUrl, "utf8");
  const context = {
    URL,
    atob,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    crypto: webcrypto,
  } as unknown as FormatContext;
  runInNewContext(source, context);
  return context;
}

function tokenPart(value: Record<string, string>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("Brazilian QR use-case classifier", () => {
  it("marks the official CIN validation address as a possible physical CIN payload", async () => {
    const context = await loadClassifier();
    const result = context.qrFormats.classifyText("https://www.gov.br/pt-br/servicos/verificar-validade-de-qr-code-da-carteira-de-identidade-nacional");

    expect(result).toMatchObject({ kind: "cin-fisica", title: "CIN física" });
    expect(result.fields[0]).toEqual({
      label: "Endereço de validação",
      value: "https://www.gov.br/pt-br/servicos/verificar-validade-de-qr-code-da-carteira-de-identidade-nacional",
    });
  });
  it("turns the CIN compact token into readable identity fields", async () => {
    const context = await loadClassifier();
    const header = tokenPart({ alg: "ES512", typ: "JWT" });
    const payload = tokenPart({
      iss: "MJSP",
      url: "https://cin.mj.gov.br/cidadao/teste",
      cpf: "00000000000",
      dns: "01/02/2000",
      dvd: "01/02/2030",
    });
    const result = context.qrFormats.classifyText(`${header}.${payload}.assinatura`);
    expect(result.jwt).toMatchObject({
      format: "JWT",
      header: { alg: "ES512", typ: "JWT" },
      payload: { iss: "MJSP", cpf: "00000000000" },
      signature: "assinatura",
      segments: [header, payload, "assinatura"],
    });

    expect(result).toMatchObject({ kind: "cin-fisica", title: "CIN física" });
    expect(result.fields).toEqual([
      { label: "Emissor", value: "MJSP" },
      { label: "Endereço de validação", value: "https://cin.mj.gov.br/cidadao/teste" },
      { label: "CPF", value: "00000000000" },
      { label: "Data de nascimento", value: "01/02/2000" },
      { label: "Data de validade", value: "01/02/2030" },
    ]);
  });
  it("rejects a CIN JWT whose ES512 signature does not match the local key", async () => {
    const context = await loadClassifier();
    const header = tokenPart({ alg: "ES512", typ: "JWT" });
    const payload = tokenPart({
      iss: "MJSP",
      url: "https://cin.mj.gov.br/cidadao/teste",
      cpf: "00000000000",
    });
    const signature = Buffer.alloc(132, 7).toString("base64url");
    const result = context.qrFormats.classifyText(`${header}.${payload}.${signature}`);

    if (!result.jwt) {
      throw new Error("Expected a JWT classification");
    }
    await expect(context.qrFormats.verifyJwtSignature(result.jwt)).resolves.toMatchObject({
      state: "invalid",
      label: "assinatura não conferiu",
    });
  });


  it("labels a vehicle payload conservatively without claiming authenticity", async () => {
    const context = await loadClassifier();
    const result = context.qrFormats.classifyText("Placa Mercosul SENATRAN; serial=ABC123");

    expect(result).toMatchObject({ kind: "placa-mercosul", title: "Placa Mercosul" });
    expect(result.warning).toContain("não confirma");
  });

  it("keeps unrelated URLs readable without opening or reclassifying them", async () => {
    const context = await loadClassifier();
    const result = context.qrFormats.classifyText("https://example.com/arquivo");

    expect(result).toMatchObject({ kind: "url", title: "Link ou endereço" });
    expect(result.fields).toEqual([{ label: "Endereço", value: "https://example.com/arquivo" }]);
  });
});
