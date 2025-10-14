//  We create this file to ease initialization order. In case
//  a test environment is detected, will the working directory be
//  modified to a temporary folder and then deleted on exit.


import addEventListener from '@sample/core/addEventListener.mjs';

function createUncaughtExceptionHandler() {
  return err => {
    globalThis.console?.error('UNCAUGHT EXCEPTION', err, err?.stack);
    const env = instanceProcess?.env;
    if(env?.TEST) {
      process.exit(1);
    }
  };
}

const $inject = ['$on', '$terminate'];

function Process($on, $terminate) {
  const native = globalThis.process;
  const { it, describe } = globalThis;
  const env = JSON.parse(JSON.stringify(native?.env || {}));
  env.TEST = (typeof it === 'function' && typeof describe === 'function');
  
  const unsubscribers = [
    addEventListener(native, 'exit', $terminate),
    addEventListener(native, 'SIGINT', $terminate),
    addEventListener(native, 'SIGTERM', $terminate),
    addEventListener(native, 'uncaughtException', createUncaughtExceptionHandler(env))
  ];

  $on('exit', () => {
    unsubscribers.forEach(cb => cb());
    unsubscribers.length = 0;
  });
  return Object.assign(Object.create(native), { env });
}

export default Object.assign(Process, { $inject });