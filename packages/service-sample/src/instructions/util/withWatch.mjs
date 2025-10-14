import noop from '@sample/core/noop.mjs';

/**
 * Add a watch functionallity in form of a ".subscribe" function.
 * @param {function} cb 
 */
export default function withWatch(cb = noop) {

  const subscribers = [];

  const proxy = (...args) => {
    const result = cb(...args);
    subscribers.forEach(fn => fn({ args, result }));
    return result;
  };

  return Object.assign(proxy, {

    subscribe(cb) {
      subscribers.push(cb);
      return () => {
        const index = subscribers.indexOf(cb);
        if(index !== -1) {
          subscribers.splice(index, 1);
        }
      }
    }
  })
};