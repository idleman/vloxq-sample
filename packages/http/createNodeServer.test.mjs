import { strictEqual } from 'assert';
import createNodeServer from './createNodeServer.mjs';
import getPackageName from '@sample/core/getPackageName.mjs';
import httpErrors from './errors.mjs';

describe(getPackageName(import.meta.url), function() {
  
  it('should support basic usage', async function() {
    const server = createNodeServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('hello world!');
    });
    const baseUrl = await server.listen();
    try {
      const response = await fetch(`${baseUrl}/hello`);
      strictEqual(response.status, 200);
      const text = await response.text();
      strictEqual(text, 'hello world!');
    } finally {
      await server.close();
    }
  });

  it('should catch errors and return 500', async function() {
    const server = createNodeServer((req, res) => {
      if(req.url.endsWith('error')) {
        throw new Error('hihi');
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('hello world!');
    });
    const baseUrl = await server.listen();
    try {
      {
        const response = await fetch(`${baseUrl}/hello`);
        strictEqual(response.status, 200);
        const text = await response.text();
        strictEqual(text, 'hello world!');
      }
      {
        const response = await fetch(`${baseUrl}/error`);
        strictEqual(response.status, 500);
      }

    } finally {
      await server.close();
    }
  });

  it('should catch http errors and use the correct status code', async function() {
    const server = createNodeServer((req, res) => {
      if(req.url.endsWith('error')) {
        throw new httpErrors.Conflict();
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('hello world!');
    });
    const baseUrl = await server.listen();
    try {
      {
        const response = await fetch(`${baseUrl}/hello`);
        strictEqual(response.status, 200);
        const text = await response.text();
        strictEqual(text, 'hello world!');
      }
      {
        const response = await fetch(`${baseUrl}/error`);
        strictEqual(response.status, 409);
      }

    } finally {
      await server.close();
    }
  });

  it('should be able to wait for the server', async function() {
    const server = createNodeServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('hello world!');
    });
    const history = [];
    const wait = server.wait();
    history.push('initial');
    wait.then(() => history.push('ready'))
    await server.listen();
    history.push('done');
    try {
      strictEqual(history.join(', '), 'initial, ready, done');
    } finally {
      await server.close();
    }
  });

});