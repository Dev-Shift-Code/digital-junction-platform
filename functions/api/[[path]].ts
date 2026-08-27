interface PagesEnvironment {
  WORKER_ORIGIN?: string;
}

/**
 * Makes the Pages hostname a same-origin frontend for the D1-backed Worker API.
 * Keep `WORKER_ORIGIN` set to the deployed Workers URL without a trailing slash.
 */
export const onRequest: PagesFunction<PagesEnvironment> = async (context) => {
  const workerOrigin = context.env.WORKER_ORIGIN;
  if (!workerOrigin) {
    return new Response("Pages API proxy is not configured.", { status: 503 });
  }

  const inboundUrl = new URL(context.request.url);
  const targetUrl = new URL(`${inboundUrl.pathname}${inboundUrl.search}`, workerOrigin);
  const upstream = await fetch(new Request(targetUrl, context.request));
  const headers = new Headers(upstream.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(upstream.body, { status: upstream.status, headers });
};
