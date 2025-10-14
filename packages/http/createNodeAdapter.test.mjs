import http from 'node:http';
import { strictEqual } from 'assert';
import sleep from '@sample/core/sleep.mjs';
import createNodeAdapter from './createNodeAdapter.mjs';
import getPackageName from '@sample/core/getPackageName.mjs';

describe(getPackageName(import.meta.url), function() {
  
  function createServer(cb) {
    const server = http.createServer(cb);
    const listen = () => {
      const { reject, resolve, promise } = Promise.withResolvers();
      server.listen(0, '127.0.0.1', err => {
        if(err) {
          return reject(err);
        }
        const { port, address } = server.address();
        return resolve(`http://${address}:${port}`);
      });
      return promise;
    }

    const close = () => {
      const { reject, resolve, promise } = Promise.withResolvers();
      server.close(err => err ? reject(err) : resolve());
      return promise;
    }


    return {
      close,
      listen,
    }
  }


  it('should support basic usage', async function() {
    const cb = createNodeAdapter(req => Response.json({ hello: 'world' }));
    const server = createServer(cb);
    const baseUrl = await server.listen();
    try {
      const response = await fetch(baseUrl);
      strictEqual(response.status, 200);
      const json = await response.json();
      strictEqual(json.hello, 'world');
    } finally {
      await server.close();
    }
  });

  it('should support HEAD requests', async function() {
    const cb = createNodeAdapter(req => new Response('hello world'));
    const server = createServer(cb);
    const baseUrl = await server.listen();
    try {
      const response = await fetch(baseUrl, { method: 'HEAD' });
      strictEqual(response.status, 200);
      const body = await response.text();
      strictEqual(body, '');
    } finally {
      await server.close();
    }
  });


  it('should support streaming', async function() {
    const chunks = ['Hello ', 'streaming ', 'world!'];
    const cb = createNodeAdapter(function echo(request) {
      
      // Create a readable stream
      const stream = new ReadableStream({
        async start(controller) {
          // Push some chunks
          for(const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
            await sleep(Math.round(Math.random()*5));
          }
          // Close when done
          controller.close();
        }
      });

      // Create a streaming Response
      return new Response(stream, {
        headers: { "Content-Type": "text/plain" }
      });
    });
    const server = createServer(cb);
    const baseUrl = await server.listen();
    try {
      const response = await fetch(baseUrl);
      strictEqual(response.status, 200);
      const body = await response.text();
      strictEqual(body, chunks.join(''));
    } finally {
      await server.close();
    }
  });

});