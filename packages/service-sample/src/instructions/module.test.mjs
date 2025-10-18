import module from './module.mjs';
import { strictEqual } from 'assert';
import Registry from './Registry.mjs';
import Fetch from '@sample/service/Fetch.mjs';
import getPackageName from '@sample/core/getPackageName.mjs';
import createNodeServer from '@sample/http/createNodeServer.mjs';
import createTestSuite from '@sample/service/util/createTestSuite.mjs';
import Process from '@sample/service/Process.mjs';

const _ = createTestSuite(module);

describe(getPackageName(import.meta.url), function() {

  const reduceToSum = (s, v) => s + v; 
  const sum = (...args) => args.length === 0 ? void(0) : args.reduce(reduceToSum, 0);
  const reduceToMultipy = (s, v) => s * v; 
  const multiply = (...args) => args.length === 0 ? void(0) : args.reduce(reduceToMultipy);

  describe('HTTP /calc', function() {

    it('should work', _(async (baseUrl, $get) => {
      const fetch = await $get(Fetch);
      {
        const response = await fetch(`${baseUrl}/calc?op=sum&term=10&term=2`);
        strictEqual(response.ok, false);
      }
      // Lets dynamically add the instruction
      const registry = await $get(Registry);
      registry.setState(new Map([
        ['sum', sum]
      ]));
      strictEqual(sum(10, 2), 12);
      {
        const response = await fetch(`${baseUrl}/calc?op=sum&term=10&term=2`);
        strictEqual(response.status, 200);
        const { result } = await response.json();
        strictEqual(result, 12);
      }
    }));

  })

  describe('HTTP /evaluate', function() {

    it('should work', _(async (baseUrl, $get) => {
      const fetch = await $get(Fetch);
      
      {
        const response = await fetch(`${baseUrl}/evaluate?expression=multiply(2,sum(3,6))`);
        strictEqual(response.ok, false);
      }
      // Lets dynamically add the instruction
      const registry = await $get(Registry);
      registry.setState(new Map([
        ['sum', sum],
        ['multiply', multiply]
      ]));
      strictEqual(multiply(2, sum(3, 6)), 18);

      {
        const response = await fetch(`${baseUrl}/evaluate?expression=multiply(2,sum(3,6))`);
        strictEqual(response.status, 200);
        const { result } = await response.json();
        strictEqual(result, multiply(2, sum(3, 6)));
      }

      {
        const response = await fetch(`${baseUrl}/evaluate?expression=multiply(4,sum(3,6))`);
        strictEqual(response.status, 200);
        const { result } = await response.json();
        strictEqual(result, multiply(4, sum(3, 6)));
      }
    }));

  })

  describe('HTTP /renew', function() {

    it('should re-fetch all instructions', _(async (baseUrl, $get) => {
      const code = `
        export const add = (a, b) => a + b;
      `;
      // some external server. An alternative could be mock to the http request
      const server = createNodeServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.end(code);
      });
      const fetch = await $get(Fetch);
      const process = await $get(Process);
      process.env.FETCH_URL = await server.listen();
      try {
        {
          const response = await fetch(`${baseUrl}/renew`, { method: 'POST' });
          strictEqual(response.status, 200);
        }

        {
          const response = await fetch(`${baseUrl}/evaluate?expression=add(1, 2)`);
          strictEqual(response.ok, true);
          const json = await response.json();
          strictEqual(json.result, 3);
        }
      } finally {
        await server.close();
      }
    }));

  })

});