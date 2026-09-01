import { describe, expect, it } from "vitest";

import worker, { type Env } from "../src/index";

function createAssetEnv() {
  const requestedPaths: string[] = [];
  const env: Env = {
    ASSETS: {
      fetch(request) {
        const { pathname } = new URL(request.url);
        requestedPaths.push(pathname);

        if (pathname === "/") {
          if (request.method === "GET") {
            return Promise.resolve(new Response("asset:/index.html"));
          }

          if (request.method === "HEAD") {
            return Promise.resolve(new Response(null, { status: 200 }));
          }

          return Promise.resolve(new Response(null, { status: 405 }));
        }

        if (pathname === "/qr-gov-br" || pathname === "/emojihose") {
          if (request.method !== "GET" && request.method !== "HEAD") {
            return Promise.resolve(new Response(null, { status: 405 }));
          }

          return Promise.resolve(new Response(null, {
            status: 307,
            headers: { Location: `${pathname}/` },
          }));
        }

        if (pathname === "/qr-gov-br/" || pathname === "/emojihose/") {
          if (request.method !== "GET" && request.method !== "HEAD") {
            return Promise.resolve(new Response(null, { status: 405 }));
          }

          return Promise.resolve(new Response(`asset:${pathname}index.html`));
        }

        if (pathname.startsWith("/qr-gov-br/") || pathname.startsWith("/emojihose/")) {
          if (request.method !== "GET" && request.method !== "HEAD") {
            return Promise.resolve(new Response(null, { status: 405 }));
          }

          return Promise.resolve(new Response(`asset:${pathname}`));
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      },
    },
  };

  return { env, requestedPaths };
}

describe("artifacts.vza.net response contract", () => {
  it("serves the artifact directory listing at the root", async () => {
    const { env, requestedPaths } = createAssetEnv();
    const response = await worker.fetch(new Request("https://artifacts.vza.net/"), env);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("asset:/index.html");
    expect(requestedPaths).toEqual(["/"]);
  });

  it.each([
    ["HEAD", "https://artifacts.vza.net/", 200],
    ["POST", "https://artifacts.vza.net/", 405],
    ["GET", "https://artifacts.vza.net/contract-probe", 404],
    ["POST", "https://artifacts.vza.net/contract-probe", 404],
    ["POST", "https://artifacts.vza.net/emojihose", 405],
  ])("returns the expected empty response for %s %s", async (method, url, status) => {
    const { env } = createAssetEnv();
    const response = await worker.fetch(new Request(url, { method }), env);

    expect(response.status).toBe(status);
    expect(await response.text()).toBe("");
  });

  it("passes extensionless artifact folders to the asset binding", async () => {
    const { env, requestedPaths } = createAssetEnv();
    const response = await worker.fetch(new Request("https://artifacts.vza.net/qr-gov-br/"), env);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("asset:/qr-gov-br/index.html");
    expect(requestedPaths).toEqual(["/qr-gov-br/"]);
  });

  it("preserves an existing artifact folder", async () => {
    const { env, requestedPaths } = createAssetEnv();
    const response = await worker.fetch(new Request("https://artifacts.vza.net/emojihose/"), env);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("asset:/emojihose/index.html");
    expect(requestedPaths).toEqual(["/emojihose/"]);
  });

  it.each(["/qr-gov-br", "/emojihose"])("preserves the extensionless redirect for %s", async (path) => {
    const { env, requestedPaths } = createAssetEnv();
    const response = await worker.fetch(new Request(`https://artifacts.vza.net${path}`), env);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${path}/`);
    expect(await response.text()).toBe("");
    expect(requestedPaths).toEqual([path]);
  });

  it("delegates nested artifact assets without naming an artifact", async () => {
    const { env, requestedPaths } = createAssetEnv();
    const response = await worker.fetch(new Request("https://artifacts.vza.net/qr-gov-br/jsqr.js"), env);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("asset:/qr-gov-br/jsqr.js");
    expect(requestedPaths).toEqual(["/qr-gov-br/jsqr.js"]);
  });
});
