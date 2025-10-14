import Process from './Process.mjs';
import isObjectLiteral from '@sample/core/isObjectLiteral.mjs';

const $inject = [Process];
const { Response } = globalThis;

function send(body, type = '', opt = {}) {
  const headers = { 'content-type': type, ...opt?.headers };
  return new Response(body, { status: 200, ...opt, headers });
}

const json = (data, opt) => send(JSON.stringify(data), 'application/json', opt);
const text = (data, opt) => send((new TextEncoder()).encode(data), 'text/plain', opt);
const binary = (data, opt) => send(data, 'application/octet-stream', opt);
const getPathname = url => (new URL(url, 'https://test.local')).pathname;

function compileMockMiddleware(mocks) {
  return req => {
    for(const [method, url, data, options] of mocks) {
      if(req.method === method && [req.url, getPathname(req.url)].some(v => v.endsWith(url))) {
        const response =  typeof data ===  'string' ? text(data) : 
                          (Array.isArray(data) || isObjectLiteral(data)) ? json(data) :
                          data;
        return response;
      }
    }
  };
}

function compileMiddleware(obj) {
  const cb =  typeof obj === 'function' ? obj :
              Array.isArray(obj) ? compileMockMiddleware(obj) :
              void(0);
  if(!cb) {
    throw new Error(`Invalid middleware`)
  }
  return cb;
}

function Fetch(process) {
  const middlewares = [];
  let disabled = !!process.env.TEST;
  async function fetch(url, opt) {
    const options = { url, method: 'GET', ...opt };
    for(const cb of middlewares) {
      const maybe = await cb(options);
      if(maybe) {
        return maybe;
      }
    }
    const isLocal = ['http', 'https'].some(protocol => options.url.startsWith(`${protocol}://127.0.0.1:`));
    if(disabled && !isLocal) {
      throw new Error(`Fetch is disabled (url=${url}, middlewares.length=${middlewares.length})`);
    }
    
    return globalThis.fetch(options.url, options);
  }

  return Object.assign(fetch, {
    json,
    binary,
    use(...args) {
      middlewares.push(...(args.map(cb => compileMiddleware(cb))))
      return fetch;
    },
    enable(v = true) {
      disabled = !v;
      return fetch;
    }
  });
}

export default Object.assign(Fetch, { $inject });