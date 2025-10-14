import module from './module.mjs';
import { strictEqual } from 'assert';
import Fetch from '@sample/service/Fetch.mjs';
import Registry from './instructions/Registry.mjs';
import getPackageName from '@sample/core/getPackageName.mjs';
import createTestSuite from '@sample/service/util/createTestSuite.mjs';

const _ = createTestSuite(module);

describe(getPackageName(import.meta.url), function() {

  const reduceToSum = (s, v) => s + v; 
  const sum = (...args) => args.length === 0 ? void(0) : args.reduce(reduceToSum, 0);
  const reduceToMultipy = (s, v) => s * v; 
  const multiply = (...args) => args.length === 0 ? void(0) : args.reduce(reduceToMultipy);


  it('HTTP GET /reports', _(async (baseUrl, $get) => {
    const fetch = await $get(Fetch);
    const registry = await $get(Registry);
    registry.setState(new Map([ ['sum', sum], ['multiply', multiply] ]));
    {
      const response = await fetch(`${baseUrl}/calc?op=sum&term=10&term=2`);
      strictEqual(response.ok, true);
    }
    {
      const response = await fetch(`${baseUrl}/evaluate?expression=multiply(2,sum(3,6))`);
      strictEqual(response.ok, true);
    }
    {
      const response = await fetch(`${baseUrl}/reports`);
      strictEqual(response.ok, true);
      const json = await response.json();
      strictEqual(json.result, sum(10, 2) + multiply(2,sum(3,6)));
    }
  }));

});