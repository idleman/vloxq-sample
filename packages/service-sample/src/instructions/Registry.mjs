import noop from '@sample/core/noop.mjs';

// Only used to keep the known instructions in memory, once loaded.
export default function Registry() {
  let state = new Map();
  const getState = () => state;
  const setState = next => void(state = next);
  const update = (cb = noop) => setState(cb(getState()));
  return {
    update,
    getState,
    setState
  };
}