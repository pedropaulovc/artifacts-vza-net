(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const VIO_ALPHABET = " ABCÇDEFGHIJKLMNOPQRSTUVWXYZabcçdefghijklmnopqrstuvwxyz0123456789áàéíóúüñÁÀÉÍÓÚÜÑÃãÂâÔôÕõ=+-/\\*_|()[]{}<>#%&@'\".:;,!?$\n~^êÊºª§";
  const VIO_CERTIFICATE_GROUP = "36bbdb5f-28e6-47a8-8b48-9a2a2ae2fed3";
  const VIO_CERTIFICATE_ID = "b3ba1091-e72f-4f4a-904b-b57977c9c359";
  const VIO_VEHICLE_CERTIFICATE_GROUP = "6d15023d-bdb8-4860-b73f-cb66934369f4";
  const VIO_VEHICLE_CERTIFICATE_ID = "7016a8bc-b4e1-40fc-a509-973227355126";
  const BRAINPOOL_P256 = Object.freeze({
    p: BigInt("0xA9FB57DBA1EEA9BC3E660A909D838D726E3BF623D52620282013481D1F6E5377"),
    a: BigInt("0x7D5A0975FC2C3057EEF67530417AFFE7FB8055C126DC5C6CE94A4B44F330B5D9"),
    b: BigInt("0x26DC5C6CE94A4B44F330B5D9BBD77CBF958416295CF7E1CE6BCCDC18FF8C07B6"),
    n: BigInt("0xA9FB57DBA1EEA9BC3E660A909D838D718C397AA3B561A6F7901E0E82974856A7"),
    gx: BigInt("0x8BD2AEB9CB7E57CB2C4B482FFC81B7AFB9DE27E1E3BD23C23A4453BD9ACE3262"),
    gy: BigInt("0x547EF835C3DAC4FD97F8461A14611DC9C27745132DED8E545C1D54C72F046997"),
  });
  const VIO_CERTIFICATES = Object.freeze({
    [VIO_CERTIFICATE_GROUP]: Object.freeze({
      id: VIO_CERTIFICATE_ID,
      curve: "brainpoolP256r1",
      validFrom: Date.parse("2019-08-13T11:00:00.000Z"),
      validUntil: Date.parse("2029-08-13T11:00:00.000Z"),
      x: BigInt("0x58509ECAB43BF9A4EBC00A6BE4533E05B773D0E6604B1E75D81CFEA185483C1C"),
      y: BigInt("0x38EA47B5A04F60F0A24278D7897074D7B1474289D6057F609B1C020BCD6A22F4"),
    }),
    [VIO_VEHICLE_CERTIFICATE_GROUP]: Object.freeze({
      id: VIO_VEHICLE_CERTIFICATE_ID,
      curve: "brainpoolP256r1",
      validFrom: Date.parse("2019-08-13T11:00:00.000Z"),
      validUntil: Date.parse("2029-08-13T11:00:00.000Z"),
      x: BigInt("0x7C4A5378163249F927852FAAF8503B0D929A2390CBF752D98626EF83DF82C177"),
      y: BigInt("0x5AC71DC5B75D3BB77E515CCC93DF0CAC7A6EE2A3BC57A9BCF4D484F0E4B689B8"),
    }),
  });
  const VIO_TEMPLATES = Object.freeze({
    92: Object.freeze({
      kind: "cin-vio",
      name: "RG Digital",
      owner: "GovBr",
      certificateGroup: VIO_CERTIFICATE_GROUP,
      fields: Object.freeze([
        ["nome", "Nome"],
        ["nome_social", "Nome social"],
        ["cpf", "Registro Geral / CPF"],
        ["sexo", "Sexo"],
        ["data_nascimento", "Data de nascimento"],
        ["nacionalidade", "Nacionalidade"],
        ["naturalidade", "Naturalidade"],
        ["data_validade", "Data de validade"],
        ["filiacao_1", "Filiação 1"],
        ["filiacao_2", "Filiação 2"],
        ["orgao_expedidor", "Órgão expedidor"],
        ["local_emissao", "Local de emissão"],
        ["data_emissao", "Data de emissão"],
        ["certidao", "Certidão de nascimento / casamento / divórcio"],
        ["hash", "Hash"],
      ]),
    }),
    17: Object.freeze({
      kind: "placa-mercosul",
      name: "Placa veicular Mercosul",
      owner: "SENATRAN",
      certificateGroup: VIO_VEHICLE_CERTIFICATE_GROUP,
      fields: Object.freeze([
        ["serial", "Número de série da placa"],
      ]),
    }),
    11: Object.freeze({
      kind: "placa-mercosul",
      name: "Placa veicular Mercosul",
      owner: "SENATRAN",
      certificateGroup: "37234581-512c-4906-a4ea-591d25dee539",
      fields: Object.freeze([
        ["serial", "Número de série da placa"],
      ]),
    }),
  });

  function asBytes(input) {
    if (input instanceof Uint8Array) {
      return input;
    }
    if (input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    }
    return Uint8Array.from(input ?? []);
  }

  function isHexByte(value) {
    return (value >= 0x30 && value <= 0x39) || (value >= 0x41 && value <= 0x46) || (value >= 0x61 && value <= 0x66);
  }


  function parseHeader(bytes) {
    const hasTextHeader = bytes.length >= 10 && [...bytes.slice(0, 10)].every(isHexByte);
    if (hasTextHeader) {
      const timestamp = Number.parseInt(String.fromCharCode(...bytes.slice(0, 8)), 16);
      const version = Number.parseInt(String.fromCharCode(...bytes.slice(8, 10)), 16);
      return {
        timestamp,
        version,
        payloadStart: 10,
        timestampBytes: new Uint8Array([
          (timestamp >>> 24) & 0xff,
          (timestamp >>> 16) & 0xff,
          (timestamp >>> 8) & 0xff,
          timestamp & 0xff,
        ]),
      };
    }

    if (bytes.length < 5) {
      return null;
    }

    const timestamp = (((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0) & 0x7fffffff;
    return {
      timestamp,
      version: bytes[4],
      payloadStart: 5,
      timestampBytes: new Uint8Array([
        (timestamp >>> 24) & 0xff,
        (timestamp >>> 16) & 0xff,
        (timestamp >>> 8) & 0xff,
        timestamp & 0xff,
      ]),
    };
  }

  function readLengthPrefixed(payload, offset) {
    if (offset + 2 > payload.length) {
      return null;
    }

    const lengthBytes = payload.slice(offset, offset + 2);
    const length = (lengthBytes[0] << 8) | lengthBytes[1];
    const start = offset + 2;
    const end = start + length;
    if (end > payload.length) {
      return null;
    }

    return { bytes: payload.slice(start, end), lengthBytes, next: end };
  }

  function decodeVioAlphabet(bytes) {
    let bitOffset = 0;
    let text = "";
    while (bytes.length * 8 - bitOffset >= 7) {
      let value = 0;
      for (let bit = 0; bit < 7; bit += 1) {
        const sourceBit = bitOffset + bit;
        value = (value << 1) | ((bytes[Math.floor(sourceBit / 8)] >> (7 - (sourceBit % 8))) & 1);
      }
      if (value >= VIO_ALPHABET.length) {
        throw new Error("Vio field alphabet value is invalid.");
      }
      text += VIO_ALPHABET[value];
      bitOffset += 7;
    }
    return text;
  }

  function concatBytes(...arrays) {
    const result = new Uint8Array(arrays.reduce((length, array) => length + array.length, 0));
    let offset = 0;
    for (const array of arrays) {
      result.set(array, offset);
      offset += array.length;
    }
    return result;
  }

  function parseVioPayload(input) {
    const bytes = asBytes(input);
    const header = parseHeader(bytes);
    if (!header || header.version !== 4) {
      return null;
    }

    const payload = bytes.slice(header.payloadStart);
    if (payload.length < 2) {
      return null;
    }

    const templateId = (payload[0] << 8) | payload[1];
    let offset = 2;
    const signaturePart = readLengthPrefixed(payload, offset);
    if (!signaturePart) {
      return null;
    }
    offset = signaturePart.next;
    const dataPart = readLengthPrefixed(payload, offset);
    if (!dataPart) {
      return null;
    }
    offset = dataPart.next;
    const fieldsPart = readLengthPrefixed(payload, offset);
    if (!fieldsPart) {
      return null;
    }

    let fieldText;
    try {
      fieldText = decodeVioAlphabet(fieldsPart.bytes);
    } catch {
      return null;
    }

    const template = VIO_TEMPLATES[templateId] ?? null;
    const values = fieldText.split("^");
    const fields = template
      ? template.fields.map(([name, label], index) => ({ name, label, value: values[index] ?? "" }))
      : values.map((value, index) => ({ name: `field_${index + 1}`, label: `Field ${index + 1}`, value }));
    const signedData = concatBytes(
      header.timestampBytes,
      Uint8Array.of(header.version),
      payload.slice(0, 2),
      dataPart.lengthBytes,
      dataPart.bytes,
      fieldsPart.lengthBytes,
      fieldsPart.bytes,
    );

    return {
      format: "Vio QR v4",
      timestamp: header.timestamp,
      createdAt: new Date(header.timestamp * 1000).toISOString(),
      version: header.version,
      templateId,
      template,
      values,
      fields,
      fieldText,
      fieldCountMatches: template ? values.length === template.fields.length : null,
      signature: signaturePart.bytes,
      signedData,
      data: dataPart.bytes,
      extra: payload.slice(fieldsPart.next),
      certificate: template ? VIO_CERTIFICATES[template.certificateGroup] ?? null : null,
    };
  }

  function mod(value, modulus) {
    const remainder = value % modulus;
    return remainder < 0n ? remainder + modulus : remainder;
  }

  function inverse(value, modulus) {
    let oldRemainder = mod(value, modulus);
    let remainder = modulus;
    let oldCoefficient = 1n;
    let coefficient = 0n;
    while (remainder !== 0n) {
      const quotient = oldRemainder / remainder;
      [oldRemainder, remainder] = [remainder, oldRemainder - quotient * remainder];
      [oldCoefficient, coefficient] = [coefficient, oldCoefficient - quotient * coefficient];
    }
    if (oldRemainder !== 1n) {
      throw new Error("Vio curve value is not invertible.");
    }
    return mod(oldCoefficient, modulus);
  }

  function pointAdd(first, second) {
    if (first === null) {
      return second;
    }
    if (second === null) {
      return first;
    }
    if (first.x === second.x) {
      if (mod(first.y + second.y, BRAINPOOL_P256.p) === 0n) {
        return null;
      }
      if (first.y === 0n) {
        return null;
      }
      const slope = mod((3n * first.x * first.x + BRAINPOOL_P256.a) * inverse(2n * first.y, BRAINPOOL_P256.p), BRAINPOOL_P256.p);
      const x = mod(slope * slope - 2n * first.x, BRAINPOOL_P256.p);
      return { x, y: mod(slope * (first.x - x) - first.y, BRAINPOOL_P256.p) };
    }

    const slope = mod((second.y - first.y) * inverse(second.x - first.x, BRAINPOOL_P256.p), BRAINPOOL_P256.p);
    const x = mod(slope * slope - first.x - second.x, BRAINPOOL_P256.p);
    return { x, y: mod(slope * (first.x - x) - first.y, BRAINPOOL_P256.p) };
  }

  function pointMultiply(scalar, point) {
    let result = null;
    let addend = point;
    let remaining = scalar;
    while (remaining > 0n) {
      if (remaining & 1n) {
        result = pointAdd(result, addend);
      }
      addend = pointAdd(addend, addend);
      remaining >>= 1n;
    }
    return result;
  }

  function bytesToBigInt(bytes) {
    return BigInt(`0x${[...bytes].map((value) => value.toString(16).padStart(2, "0")).join("") || "0"}`);
  }

  function readDerLength(bytes, offset) {
    if (offset >= bytes.length) {
      return null;
    }
    const first = bytes[offset];
    if ((first & 0x80) === 0) {
      return { length: first, next: offset + 1 };
    }
    const count = first & 0x7f;
    if (count === 0 || count > 2 || offset + 1 + count > bytes.length) {
      return null;
    }
    let length = 0;
    for (let index = 0; index < count; index += 1) {
      length = (length << 8) | bytes[offset + 1 + index];
    }
    return { length, next: offset + 1 + count };
  }

  function readDerInteger(bytes, offset, end) {
    if (offset >= end || bytes[offset] !== 0x02) {
      return null;
    }
    const lengthInfo = readDerLength(bytes, offset + 1);
    if (!lengthInfo || lengthInfo.next + lengthInfo.length > end || lengthInfo.length === 0) {
      return null;
    }
    const valueBytes = bytes.slice(lengthInfo.next, lengthInfo.next + lengthInfo.length);
    if (valueBytes[0] & 0x80) {
      return null;
    }
    return { value: bytesToBigInt(valueBytes), next: lengthInfo.next + lengthInfo.length };
  }

  function parseDerSignature(bytes) {
    if (bytes.length < 8 || bytes[0] !== 0x30) {
      return null;
    }
    const sequenceLength = readDerLength(bytes, 1);
    if (!sequenceLength || sequenceLength.next + sequenceLength.length !== bytes.length) {
      return null;
    }
    const end = sequenceLength.next + sequenceLength.length;
    const r = readDerInteger(bytes, sequenceLength.next, end);
    if (!r) {
      return null;
    }
    const s = readDerInteger(bytes, r.next, end);
    if (!s || s.next !== end) {
      return null;
    }
    return { r: r.value, s: s.value };
  }

  async function verifySignature(parsed) {
    const certificate = parsed.certificate;
    if (!certificate) {
      return { state: "unavailable", reason: "não há certificado Vio local para este modelo" };
    }
    const createdAt = parsed.timestamp * 1000;
    if (createdAt < certificate.validFrom || createdAt > certificate.validUntil) {
      return { state: "unavailable", reason: "o certificado Vio local está fora da validade" };
    }
    const signature = parseDerSignature(parsed.signature);
    if (!signature || signature.r <= 0n || signature.r >= BRAINPOOL_P256.n || signature.s <= 0n || signature.s >= BRAINPOOL_P256.n) {
      return { state: "invalid", reason: "a assinatura Vio tem um formato inválido" };
    }
    if (!root.crypto?.subtle) {
      return { state: "unavailable", reason: "este navegador não oferece Web Crypto para conferir a assinatura" };
    }

    try {
      const digest = new Uint8Array(await root.crypto.subtle.digest("SHA-256", parsed.signedData));
      const message = bytesToBigInt(digest);
      const inverseS = inverse(signature.s, BRAINPOOL_P256.n);
      const publicPoint = { x: certificate.x, y: certificate.y };
      const generator = { x: BRAINPOOL_P256.gx, y: BRAINPOOL_P256.gy };
      const first = pointMultiply(mod(message * inverseS, BRAINPOOL_P256.n), generator);
      const second = pointMultiply(mod(signature.r * inverseS, BRAINPOOL_P256.n), publicPoint);
      const result = pointAdd(first, second);
      const valid = result !== null && mod(result.x, BRAINPOOL_P256.n) === signature.r;
      return {
        state: valid ? "verified" : "invalid",
        reason: valid ? "assinatura digital conferida" : "a assinatura digital não confere",
        certificateId: certificate.id,
        curve: certificate.curve,
      };
    } catch {
      return { state: "unavailable", reason: "o navegador não conseguiu conferir esta assinatura Vio" };
    }
  }

  function formatVerification(verification) {
    if (verification.state === "verified") {
      return `conferida (${verification.curve}, certificado ${verification.certificateId})`;
    }
    if (verification.state === "invalid") {
      return "não confere; trate os valores como não confiáveis";
    }
    return `não conferida (${verification.reason})`;
  }

  function formatDecoded(parsed, verification) {
    const templateName = parsed.template ? `${parsed.template.name} (${parsed.template.owner})` : `modelo desconhecido ${parsed.templateId}`;
    const title = parsed.template?.kind === "placa-mercosul" ? "Código da placa Mercosul" : `Documento Vio: ${templateName}`;
    const lines = [
      title,
      `Assinatura: ${formatVerification(verification)}`,
      "",
      ...parsed.fields.filter((field) => field.value.length > 0).map((field) => `${field.label}: ${field.value}`),
    ];
    if (parsed.fieldCountMatches === false) {
      lines.splice(2, 0, `Aviso: foram encontrados ${parsed.values.length} valores; o modelo espera ${parsed.template.fields.length}.`, "");
    }
    return lines.join("\n");
  }

  async function decodeVioPayload(input) {
    const parsed = parseVioPayload(input);
    if (!parsed) {
      return null;
    }
    const verification = await verifySignature(parsed);
    const isPlate = parsed.template?.kind === "placa-mercosul";
    const meta = verification.state === "verified"
      ? `${isPlate ? "Código Vio da placa" : "Documento Vio"} lido localmente. A assinatura digital confere e nenhum dado foi enviado.`
      : verification.state === "invalid"
        ? `${isPlate ? "Código Vio da placa" : "Documento Vio"} lido localmente, mas a assinatura digital não confere. Trate os valores como não confiáveis.`
        : isPlate
          ? "Código Vio da placa lido localmente, mas a assinatura digital não pôde ser conferida. Trate os valores como não confiáveis."
          : "Campos Vio lidos localmente, mas a assinatura digital não pôde ser conferida. Trate os valores como não confiáveis.";
    return {
      ...parsed,
      verification,
      text: formatDecoded(parsed, verification),
      meta,
    };
  }


  root.vioDecoder = Object.freeze({
    decode: decodeVioPayload,
    parse: parseVioPayload,
  });
})();
