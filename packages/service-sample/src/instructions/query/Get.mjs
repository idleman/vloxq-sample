/**
 * Try to get a instruction
 */

import Registry from '../Registry.mjs';

const $inject = [Registry];

function Get(registry) {
  return name => {
    const state = registry.getState();
    return state.get(name);
  };
}

export default Object.assign(Get, { $inject });