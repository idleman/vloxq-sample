import Router from './Router.mjs';
import { strictEqual } from 'assert';
import getPackageName from '@sample/core/getPackageName.mjs';
import toURL from './toURL.mjs';
import createNodeAdapter from './createNodeAdapter.mjs';
import createNodeServer from './createNodeServer.mjs';
import sleep from '@sample/core/sleep.mjs';

describe(getPackageName(import.meta.url), function() {


  const baseUrl = 'http://localhost:3000';
  const createRequest = (method, pathname = '/', body = null) => new Request(`${baseUrl}${pathname}`, { method, body });
  const createResponse = (statusCode = 200, body = null) => new Response(body, { status: statusCode });
  
  describe('Router', function() {

    it('should support basic usage', async function() {
      const history = [];
      const router = new Router();
      router.use(req => history.push(req));

      const request = createRequest('GET', '/');
      const response = await router.resolve(request);

      strictEqual(response.status, 404);
      strictEqual(history.length, 1);
      strictEqual(history[0], request);
    });

    it('should be able to block the request', async function() {
      const history = [];
      const router = new Router();
      router
        .use(req => (req.url.includes('block') ? createResponse(403) : req))
        .use(req => history.push(req));

      
      {
        const response = await router.resolve(createRequest('GET', '/block'));
        strictEqual(response.status, 403);
        strictEqual(history.length, 0);
      }
      {
        const request = createRequest('GET', '/');
        const response = await router.resolve(request);
        strictEqual(history.length, 1);
      }
    });

    it('should be able to internally redirect the request', async function() {
      const history = [];
      const router = new Router();
      router
        .use(req => (req.url.endsWith('redirect') ? createRequest(req.method, '/redirected-to') : req))
        .use(req => history.push(req));

      
      {
        const response = await router.resolve(createRequest('GET', '/redirect'));
        strictEqual(history.length, 1);
        const [request] = history;
        strictEqual(request.url, `${baseUrl}/redirected-to`);
      }
    });

  });

  describe('route+resolve', function() {

    it('should support basic GET usage', async function() {
      const router = new Router();
      router.route('GET', '/', () => createResponse(200, 'Hello World'));

      const request = createRequest('GET', '/');
      const response = await router.resolve(request);
      strictEqual(response.status, 200);
      const body = await response.text();
      strictEqual(body, 'Hello World');
    });

    it('should support basic POST usage', async function() {
      const router = new Router();
      router.route('POST', '/echo', async req => {
        const body = await req.text();
        return createResponse(200, body);
      });

      const response = await router.resolve(createRequest('POST', '/echo', 'Hello World'));
      strictEqual(response.status, 200);
      const body = await response.text();
      strictEqual(body, 'Hello World');
    });

    it('should support basic GET usage with params', async function() {
      const router = new Router();
      router.route('GET', '/users/:userId/posts/:postId', (req, params) => {
        const { userId, postId } = params;
        return createResponse(200, `user${userId}-post${postId}`);
      });

      const request = createRequest('GET', '/users/123/posts/456');
      const response = router.resolve(request);
      strictEqual(response.status, 200);
      const body = await response.text();
      strictEqual(body, 'user123-post456');
    });

    it('should support search', async function() {
      const router = new Router();
      router.route('GET', '/users', req => {
        return Response.json(Object.fromEntries(toURL(req.url).searchParams));
      });

      const request = createRequest('GET', '/users?a=123&b=321');
      const response = router.resolve(request);
      strictEqual(response.status, 200);
      const body = await response.json();
      strictEqual(body.a, '123');
      strictEqual(body.b, '321');
    });
    

    xit('should have decent static performance', async function() {
      const TIME = 5_000;
      this.timeout(1000*60*60);
      const router = new Router();
      router.get('/home', (req, params) => {
        return Response.json([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      });

      
      const request = createRequest('GET', '/home');
      
      // globalThis.debug = Promise.withResolvers();
      // await globalThis.debug.promise;
      let count = 0;
      const start = performance.now();
      while(true) {
        const now = performance.now();
        const elapsed = now - start;
        if(TIME < elapsed) {
          break;
        }
        const response = router.resolve(request);
        strictEqual(response.status, 200);
        const json = await response.json();
        strictEqual(json.length, 10);
        ++count;
      }
      const elapsed = (performance.now() - start) / 1000;
      const rps = count/elapsed;
      console.log(`Time taken: ${elapsed} s, count: ${count}, RPS: ${rps}`);
      // globalThis.debug = Promise.withResolvers();
      // await globalThis.debug.promise;
    });

    xit('should have decent dynamic performance', async function() {
      
      const TIME = 5_000;
      this.timeout(1000*60*60);
      
      async function sendRequest(router, request, data) {
        const response = router.resolve(request);
        strictEqual(response.status, 200);
        const json = await response.json();
        strictEqual(json.userId | 0, data.userId);
        strictEqual(json.postId | 0, data.postId);
      }

      const router = new Router();
      router.get('/users/:userId/posts/:postId', (req, params) => {
        return Response.json(params);
      });

      
      const workerData = Array.from({ length: 16 }, () => {
        const userId = Math.floor(Math.random() * 1000);
        const postId = Math.floor(Math.random() * 1000);
        return { userId, postId };
      });

      const requests = workerData.map(({ userId, postId }) => createRequest('GET', `/users/${userId}/posts/${postId}`));

      // globalThis.debug = Promise.withResolvers();
      // await globalThis.debug.promise;
      let count = 0;
      const start = performance.now();
      while(true) {
        const now = performance.now();
        const elapsed = now - start;
        if(TIME < elapsed) {
          break;
        }
        const index = Math.floor(Math.random() * requests.length);
        const data = workerData[index];
        const request = requests[index];
        await sendRequest(router, request, data);
        ++count;
      }
      const elapsed = (performance.now() - start) / 1000;
      const rps = count/elapsed;
      console.log(`Time taken: ${elapsed} s, count: ${count}, RPS: ${rps}`);
      // globalThis.debug = Promise.withResolvers();
      // await globalThis.debug.promise;
    });


    function wait(delay = 0) {
      const { resolve, promise } = Promise.withResolvers();
      if(delay) {
        setTimeout(resolve, delay);
      } else {
        queueMicrotask(resolve);
      }
      return promise;
    }

    xit('should REAL decent performance ', async function() {
      const TIME = 5_000;
      this.timeout(TIME*2);
      async function client(url = '', end = performance.now(), state = {}) {


        let counter = 0;
        while(true) {
          const now = performance.now();
          if(end < now) {
            break;
          }

          if(state.limit <= state.parallel) {
            await wait((++counter)%2 === 0);
            continue;
          }
          
          try {
            ++state.count;
            ++state.parallel;
            const response = await fetch(url);
            strictEqual(response.status, 200);
            ++state.success;
          } catch(err) {
            ++state.errors;
          } finally {
            --state.parallel;
          }
        }
      }

      const router = new Router();
      const headers = { 'content-type': 'text/plain' };
      router.get('/users', (req, params) => {
        return new Response('hello world', { headers });
      });

      
      //const server = createNodeServer(createNodeAdapter(router.resolve));
      const response = new Response('hello world', { headers })
      const body = await response.arrayBuffer();
      const server = createNodeServer(createNodeAdapter(() => {
        return new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }));
      // const server2 = createNodeServer((req, res) => {
      //   res.writeHead(200, headers);
      //   res.end('hello world!');
      // })

      const baseUrl = await server.listen();
      const state = { count: 0, success: 0, errors: 0, limit: 8, parallel: 0 };
      const start = performance.now();
      try {
        const url = `${baseUrl}/users`;
        const timeout = start + TIME;
        await Promise.all(Array.from({ length: state.limit + 1  }, () => client(url, timeout, state)));
      } finally {
        await server.close();
      }
      
      const elapsed = (performance.now() - start) / 1000;
      const rps = state.count/elapsed;
      console.log(`Time taken: ${elapsed} s, rps: ${rps}, success=${state.success}, errors=${state.errors}`);
      // globalThis.debug = Promise.withResolvers();
      // await globalThis.debug.promise;
    });
  });

  

});