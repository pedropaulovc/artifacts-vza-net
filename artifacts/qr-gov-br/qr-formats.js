(() => {
  "use strict";

  const root = globalThis;
  const LABELS = Object.freeze({
    cpf: "CPF",
    cnpj: "CNPJ",
    nome: "Nome",
    name: "Nome",
    placa: "Placa",
    chassi: "Chassi",
    renavam: "RENAVAM",
    uf: "UF",
    serial: "Número de série",
    numero_serie: "Número de série",
    validade: "Validade",
    data_validade: "Data de validade",
    dns: "Data de nascimento",
    dvd: "Data de validade",
    iss: "Emissor",
    url: "Endereço de validação",
  });
  // Production CIN JWK used by the official app's partial offline validation.
  const CIN_PRODUCTION_PUBLIC_KEY = Object.freeze({
    kty: "EC",
    x: "ADmN2eus6YfvziHBVuc6cKlzWQ4w_hz1sU0c4qYxFFpNVnEw_d6PO_QVl0OQxMo7WxC0okYDqCVtEl9yoRUA3RLK",
    y: "AFc1lVJVmpLHNNnqXUmFToa6u2l9c_eOOdF6TqAj7chdGtKyqJQAFTWBzVrDQzUj7A4gWE8O3-q-sMm3EnQR3v7O",
    crv: "P-521",
  });

  const JWT_SIGNATURE_BYTES = 132;

  function tryUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url : null;
    } catch {
      return null;
    }
  }

  function hasCinSignal(value, url) {
    const haystack = `${url?.hostname ?? ""}${url?.pathname ?? ""}${value}`.toLocaleLowerCase("pt-BR");
    const officialHost = url?.hostname.toLocaleLowerCase("pt-BR").endsWith(".gov.br") ?? false;
    return Boolean(
      /\b(?:cin|identidade\s+nacional|carteira\s+de\s+identidade)\b/.test(haystack)
      || (officialHost && /(?:cin|identidade|validar|validacao|validação)/.test(url.pathname.toLocaleLowerCase("pt-BR"))),
    );
  }

  function hasPlateSignal(value, url) {
    const haystack = `${url?.hostname ?? ""}${url?.pathname ?? ""}${value}`.toLocaleLowerCase("pt-BR");
    return /(?:mercosul|senatran|denatran|placa\s+(?:veicular|do\s+veículo)|qr\s*code\s*(?:da|de)\s+placa)/.test(haystack);
  }

  function labelFor(key) {
    const normalized = key.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, "_");
    return LABELS[normalized] ?? key.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("pt-BR"));
  }

  function objectFields(parsed) {
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return [];
    }
    return Object.entries(parsed)
      .filter(([, item]) => ["string", "number", "boolean"].includes(typeof item))
      .map(([key, item]) => ({ label: labelFor(key), value: String(item) }));
  }

  function jsonFields(value) {
    if (!value.startsWith("{") || !value.endsWith("}")) {
      return [];
    }
    try {
      return objectFields(JSON.parse(value));
    } catch {
      return [];
    }
  }

  function decodeBase64Url(part) {
    if (!/^[A-Za-z0-9_-]+$/.test(part) || part.length % 4 === 1) {
      return null;
    }
    try {
      const normalized = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
      const binary = atob(normalized);
      return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
      return null;
    }
  }

  function decodeJsonPart(part) {
    try {
      const bytes = decodeBase64Url(part);
      if (!bytes) {
        return null;
      }
      const parsed = JSON.parse(new TextDecoder().decode(bytes));
      return parsed && !Array.isArray(parsed) && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  async function verifyJwtSignature(jwt) {
    if (jwt?.header?.alg !== "ES512") {
      return {
        state: "unsupported",
        label: "algoritmo não suportado",
        message: "Esta página só confere JWT da CIN com ES512 e a chave pública de produção correspondente.",
      };
    }

    const signature = decodeBase64Url(jwt.signature);
    if (!signature || signature.length !== JWT_SIGNATURE_BYTES) {
      return {
        state: "invalid",
        label: "assinatura não confere",
        message: "A assinatura ES512 não tem o formato esperado para uma assinatura ECDSA P-521.",
      };
    }

    const subtle = root.crypto?.subtle;
    const TextEncoderConstructor = root.TextEncoder;
    if (!subtle || typeof subtle.importKey !== "function" || typeof subtle.verify !== "function" || !TextEncoderConstructor) {
      return {
        state: "unavailable",
        label: "assinatura não conferida",
        message: "Este navegador não disponibilizou a API Web Crypto necessária para conferir a assinatura ES512.",
      };
    }

    try {
      const publicKey = await subtle.importKey(
        "jwk",
        CIN_PRODUCTION_PUBLIC_KEY,
        { name: "ECDSA", namedCurve: "P-521" },
        false,
        ["verify"],
      );
      const valid = await subtle.verify(
        { name: "ECDSA", hash: "SHA-512" },
        publicKey,
        signature,
        new TextEncoderConstructor().encode(`${jwt.segments[0]}.${jwt.segments[1]}`),
      );
      return valid
        ? {
          state: "verified",
          label: "assinatura confere",
          message: "A assinatura ES512 confere com a chave pública local de produção da CIN. Isso autentica o conteúdo assinado, mas não confirma a validade ou a situação do documento.",
        }
        : {
          state: "invalid",
          label: "assinatura não confere",
          message: "A assinatura ES512 não confere com a chave pública local de produção da CIN.",
        };
    } catch {
      return {
        state: "unavailable",
        label: "assinatura não conferida",
        message: "Não foi possível importar a chave pública ou conferir a assinatura ES512 neste navegador.",
      };
    }
  }

  function tokenDetails(value) {
    const parts = value.split(".");
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
      return null;
    }
    const header = decodeJsonPart(parts[0]);
    const payload = decodeJsonPart(parts[1]);
    if (!header || !payload) {
      return null;
    }
    return {
      format: "JWT",
      header,
      payload,
      signature: parts[2],
      segments: parts,
    };
  }

  function baseResult(kind, title, badge, meta, warning, fields, preview, jwt = null) {
    return { kind, title, badge, meta, warning, fields, preview, jwt };
  }

  function classifyText(input) {
    const value = String(input ?? "");
    const trimmed = value.trim();
    if (!trimmed) {
      return baseResult(
        "empty",
        "QR sem texto",
        "sem texto",
        "O código foi localizado, mas não trouxe um valor textual para exibir.",
        "",
        [],
        "",
      );
    }

    const url = tryUrl(trimmed);
    const token = tokenDetails(trimmed);
    const structuredFields = token ? objectFields(token.payload) : jsonFields(trimmed);
    const semanticValue = token ? JSON.stringify(token.payload) : trimmed;
    const semanticUrl = tryUrl(token?.payload?.url) ?? url;
    const lower = semanticValue.toLocaleLowerCase("pt-BR");
    const isCin = hasCinSignal(semanticValue, semanticUrl)
      || token?.payload?.iss?.toLocaleLowerCase?.("pt-BR") === "mjsp";
    if (isCin || structuredFields.some(({ label }) => /cpf|nome/i.test(label)) && /cin|identidade/i.test(lower)) {
      return baseResult(
        "cin-fisica",
        "CIN física",
        token ? "JWT · possível validação" : "possível validação",
        token
          ? "O QR contém um JWT com dados indicados para a validação da identidade impressa. Ler o conteúdo não substitui a conferência no serviço oficial."
          : "O QR parece apontar para a validação da identidade impressa. Ler o conteúdo não substitui a conferência no serviço oficial.",
        "Use o endereço oficial indicado pelo órgão emissor. A leitura local não confirma a validade do documento.",
        structuredFields.length > 0
          ? structuredFields
          : semanticUrl
            ? [{ label: "Endereço de validação", value: semanticUrl.toString() }]
            : [],
        "",
        token,
      );
    }

    const isPlate = hasPlateSignal(semanticValue, semanticUrl)
      || structuredFields.some(({ label }) => /placa|chassi|renavam/i.test(label));
    if (isPlate) {
      return baseResult(
        "placa-mercosul",
        "Placa Mercosul",
        "possível código de placa",
        "O QR parece relacionado à identificação da placa ou do veículo. A leitura local não confirma propriedade, situação ou autenticidade.",
        "A leitura local não confirma propriedade, situação ou autenticidade. Compare os dados com o documento e o órgão de trânsito responsável.",
        structuredFields.length > 0
          ? structuredFields
          : semanticUrl
            ? [{ label: "Endereço encontrado", value: semanticUrl.toString() }]
            : [],
        "",
      );
    }

    if (url) {
      return baseResult(
        "url",
        "Link ou endereço",
        "texto legível",
        "O QR contém um endereço. Ele não foi aberto automaticamente.",
        "Confira o domínio antes de abrir este endereço em outro aplicativo.",
        [{ label: "Endereço", value: url.toString() }],
        "",
      );
    }

    if (structuredFields.length > 0) {
      return baseResult(
        "structured",
        "Dados estruturados",
        "texto legível",
        "O QR contém dados estruturados que podem ser lidos localmente.",
        "A leitura do conteúdo não comprova a origem nem a autenticidade dos dados.",
        structuredFields,
        "",
      );
    }

    return baseResult(
      "text",
      "Texto do QR Code",
      "texto legível",
      "O QR contém texto simples. Nada foi aberto automaticamente.",
      "A leitura do conteúdo não comprova a origem nem a autenticidade dos dados.",
      [],
      trimmed,
    );
  }

  root.qrFormats = Object.freeze({ classifyText, verifyJwtSignature });
})();
