type AssetFetcher = {
  fetch(request: Request): Promise<Response>;
};

export interface Env {
  ASSETS: AssetFetcher;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
};
