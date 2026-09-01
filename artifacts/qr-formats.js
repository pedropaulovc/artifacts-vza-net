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

  function tokenPayload(value) {
    const parts = value.split(".");
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
      return null;
    }
    try {
      const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
      const binary = atob(normalized);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const parsed = JSON.parse(new TextDecoder().decode(bytes));
      return parsed && !Array.isArray(parsed) && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function baseResult(kind, title, badge, meta, warning, fields, preview) {
    return { kind, title, badge, meta, warning, fields, preview };
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
    const token = tokenPayload(trimmed);
    const structuredFields = token ? objectFields(token) : jsonFields(trimmed);
    const semanticValue = token ? JSON.stringify(token) : trimmed;
    const semanticUrl = tryUrl(token?.url) ?? url;
    const lower = semanticValue.toLocaleLowerCase("pt-BR");
    const isCin = hasCinSignal(semanticValue, semanticUrl)
      || token?.iss?.toLocaleLowerCase?.("pt-BR") === "mjsp";
    if (isCin || structuredFields.some(({ label }) => /cpf|nome/i.test(label)) && /cin|identidade/i.test(lower)) {
      return baseResult(
        "cin-fisica",
        "CIN física",
        "possível validação",
        "O QR parece apontar para a validação da identidade impressa. Ler o conteúdo não substitui a conferência no serviço oficial.",
        "Use o endereço oficial indicado pelo órgão emissor. A leitura local não confirma a validade do documento.",
        structuredFields.length > 0
          ? structuredFields
          : semanticUrl
            ? [{ label: "Endereço de validação", value: semanticUrl.toString() }]
            : [],
        "",
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

  root.qrFormats = Object.freeze({ classifyText });
})();
