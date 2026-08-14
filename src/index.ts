export default {
  fetch(request: Request): Response {
    const { pathname } = new URL(request.url);

    if (pathname !== "/") {
      return new Response(null, { status: 404 });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405 });
    }

    return new Response(null, { status: 200 });
  },
};
