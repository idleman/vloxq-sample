import { Readable, Writable } from 'node:stream';

/** Build a full absolute URL for the incoming request. */
function getURL(req) {
  // Prefer X-Forwarded-Proto when behind proxies; fall back to TLS detection.
  const xfProto = req.headers['x-forwarded-proto'];
  const proto = (Array.isArray(xfProto) ? xfProto[0] : xfProto) || (req.socket?.encrypted ? 'https' : 'http');

  // HTTP/2 may supply :authority; otherwise use Host header
  const authority = req.headers[':authority'] || req.headers['host'] || 'localhost';
  const path = req.url || '/';
  return new URL(path, `${proto}://${authority}`);
}

/** Convert Node's IncomingMessage to WHATWG Request. */
function toWhatwgRequest(req) {
  const url = getURL(req);
  const tuples = [];
  const rh = req.rawHeaders;
  if (Array.isArray(rh)) {
    for (let i = 0; i < rh.length; i += 2) {
      const k = rh[i]; const v = rh[i + 1];
      if (v !== undefined) tuples.push([k, v]);
    }
  } else {
    for (const [k, v] of Object.entries(req.headers)) {
      if (v == null) continue;
      if (Array.isArray(v)) for (const vv of v) tuples.push([k, vv]);
      else tuples.push([k, v]);
    }
  }

  const method = req.method || 'GET';
  const init = { method, headers: tuples };

  if (method !== 'GET' && method !== 'HEAD') {
    // Only one adapter on the request path
    init.body = Readable.toWeb(req);
    init.duplex = 'half';
  }

  // Only create an AbortController when there is a body to stream
  if (method !== 'GET' && method !== 'HEAD') {
    const ac = new AbortController();
    init.signal = ac.signal;
    const abort = () => ac.abort();
    req.once('aborted', abort);
    req.once('close', () => { if (!req.complete) abort(); });
  }

  return new Request(url, init);
}





async function writeWhatwgResponse(res, response, requestMethod = 'GET') {
  // status & headers
  res.statusCode = response.status;
  if (response.statusText) res.statusMessage = response.statusText;

  const setCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : extractSetCookieFallback(response.headers);

  for (const [name, value] of response.headers) {
    if (name.toLowerCase() !== 'set-cookie') res.setHeader(name, value);
  }
  if (setCookie.length) res.setHeader('set-cookie', setCookie);

  const body = response.body;

  if (shouldSkipBody(response.status, requestMethod)) {
    res.end();
    if (body) { try { await body.cancel(); } catch {} }
    return;
  }
  if (!body) { res.end(); return; }

  // Reduce latency for small writes
  res.socket?.setNoDelay(true);

  // Exactly one adapter on the writable side
  try {
    await body.pipeTo(Writable.toWeb(res));
  } catch (err) {
    if (!res.writableEnded) res.destroy(err);
    throw err;
  }
}


/** True if we should not send a body. */
function shouldSkipBody(status, method) {
  if (method === 'HEAD') return true;
  return status === 204 || status === 304;
}

/** Extract multiple Set-Cookie values when getSetCookie() is unavailable. */
function extractSetCookieFallback(headers) {
  // The plain WHATWG Headers spec coalesces duplicate header names, so
  // we try to read the combined value and split conservatively.
  // If the server/handler used Headers.append('Set-Cookie', ...) multiple times
  // in Undici, .get('set-cookie') may already return a comma-joined string,
  // which is unsafe to split. Prefer getSetCookie() when available.
  const raw = headers.get('set-cookie');
  if (!raw) return [];
  // Heuristic split: most cookies don't contain ", " except inside Expires.
  // This is imperfect; using getSetCookie() is strongly preferred.
  // As a fallback, if multiple Set-Cookie were present, Node often accepts the string array anyway.
  // Try to detect multiple by checking for "\n" inserted by some impls:
  if (raw.includes('\n')) return raw.split('\n').filter(Boolean);
  // Last resort: return single lump; better to send one string than to corrupt cookies.
  return [raw];
}


export default function createNodeAdapter(handler) {
  return async function nodeHandler(req, res) {
    try {
      const request = toWhatwgRequest(req);
      const response = await handler(request, { req, res });
      await writeWhatwgResponse(res, response, req.method);
    } catch (err) {
      // Best-effort error surface
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain; charset=utf-8');
      }
      const msg = (err && err.stack) ? String(err.stack) : String(err || 'Internal Server Error');
      // Avoid writing body for HEAD/204/304
      if (!shouldSkipBody(res.statusCode, 'HEAD')) {
        res.end('Internal Server Error\n\n' + msg);
      } else {
        res.end();
      }
    }
  };
}