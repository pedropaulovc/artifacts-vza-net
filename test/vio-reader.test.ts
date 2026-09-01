import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

const decoderUrl = new URL("../artifacts/vio.js", import.meta.url);
const alphabet = " ABCÇDEFGHIJKLMNOPQRSTUVWXYZabcçdefghijklmnopqrstuvwxyz0123456789áàéíóúüñÁÀÉÍÓÚÜÑÃãÂâÔôÕõ=+-/\\*_|()[]{}<>#%&@'\".:;,!?$\n~^êÊºª§";

type VioField = { name: string; label: string; value: string };
type ParsedVio = {
  format: string;
  timestamp: number;
  version: number;
  templateId: number;
  fieldCountMatches: boolean | null;
  values: string[];
  fields: VioField[];
  signedData: Uint8Array;
};
type VioContext = {
  ArrayBuffer: typeof ArrayBuffer;
  BigInt: typeof BigInt;
  Date: typeof Date;
  Uint8Array: typeof Uint8Array;
  vioDecoder: { parse: (input: Uint8Array) => ParsedVio | null };
};

function encodeFields(text: string): Uint8Array {
  const bits = [...text].flatMap((character) => {
    const value = alphabet.indexOf(character);
    if (value < 0) {
      throw new Error(`Character is not in the Vio alphabet: ${character}`);
    }
    return Array.from({ length: 7 }, (_, index) => (value >> (6 - index)) & 1);
  });
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  bits.forEach((bit, index) => {
    bytes[Math.floor(index / 8)] |= bit << (7 - (index % 8));
  });
  return bytes;
}

function uint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function makeVioV4Payload(fieldText: string): Uint8Array {
  const signature = new Uint8Array(70);
  const data = new Uint8Array([0xde, 0xad]);
  const fields = encodeFields(fieldText);
  return Uint8Array.from([
    0x01,
    0x02,
    0x03,
    0x04,
    4,
    ...uint16(92),
    ...uint16(signature.length),
    ...signature,
    ...uint16(data.length),
    ...data,
    ...uint16(fields.length),
    ...fields,
  ]);
}

describe("offline Vio QR decoder", () => {
  it("preserves Vio v4 fields and maps the RG Digital template", async () => {
    const source = await readFile(decoderUrl, "utf8");
    const context = { ArrayBuffer, BigInt, Date, Uint8Array } as unknown as VioContext;
    runInNewContext(source, context);

    const fieldText = "Alice^^123^F^2000-01-02^BRA^SP^2030-01-02^Parent One^^Issuer^City^2024-01-01^Record^hash";
    const parsed = context.vioDecoder.parse(makeVioV4Payload(fieldText));
    if (!parsed) {
      throw new Error("The Vio v4 fixture did not parse.");
    }

    expect(parsed).toMatchObject({
      format: "Vio QR v4",
      timestamp: 0x01020304,
      version: 4,
      templateId: 92,
      fieldCountMatches: true,
    });
    expect(parsed.values).toEqual(fieldText.split("^"));
    expect(parsed.fields[0]).toEqual({ name: "nome", label: "Nome / Name", value: "Alice" });
    expect(parsed.fields[14]).toEqual({ name: "hash", label: "Hash", value: "hash" });
    expect(parsed.signedData).toHaveLength(13 + encodeFields(fieldText).length);
  });

  it("rejects payloads with unsupported Vio versions", async () => {
    const source = await readFile(decoderUrl, "utf8");
    const context = { ArrayBuffer, BigInt, Date, Uint8Array } as unknown as VioContext;
    runInNewContext(source, context);

    expect(context.vioDecoder.parse(Uint8Array.from([1, 2, 3, 4, 6]))).toBeNull();
  });
});
