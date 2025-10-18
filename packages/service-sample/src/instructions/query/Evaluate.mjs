/**
 * Try to get a instruction
 */

import Registry from '../Registry.mjs';
import LRUMap from '@sample/core/LRUMap.mjs';
import withWatch from '../util/withWatch.mjs';
import withCache from '@sample/core/withCache.mjs';

const $inject = [Registry];

const compile = (() => {
  const impl = withCache(new WeakMap(), state => {
    const keys = Array.from(state.keys());
    const values = Array.from(state.values());
    return withCache(new LRUMap(2**8), expression => {
      const h = new Function(...keys, `return (${expression});`);
      const cb = () => h(...values);
      return cb;
    });
  });
  return (state, expression) => (impl(state))(expression);
})();

function Evaluate(registry) {
  return withWatch((expression = '') => {
    const cb = compile(registry.getState(), expression);
    return cb();
  });
}

export default Object.assign(Evaluate, { $inject });