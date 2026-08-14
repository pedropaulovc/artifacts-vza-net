import { describe, expect, it } from "vitest";

import worker from "../src/index";

describe("artifacts.vza.net response contract", () => {
  it.each([
    ["GET", "https://artifacts.vza.net/", 200],
    ["HEAD", "https://artifacts.vza.net/", 200],
    ["POST", "https://artifacts.vza.net/", 405],
    ["GET", "https://artifacts.vza.net/contract-probe", 404],
    ["POST", "https://artifacts.vza.net/contract-probe", 404],
  ])("returns an empty response for %s %s", async (method, url, status) => {
    const response = worker.fetch(new Request(url, { method }));

    expect(response.status).toBe(status);
    expect(await response.text()).toBe("");
  });
});
