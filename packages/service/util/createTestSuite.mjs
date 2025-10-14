import Logger from '../Logger.mjs';
import HttpServer from '../http/Server.mjs';
import forward from '@sample/core/forward.mjs';


function createRawTestSuite(base) {
  return function factory(...args) {
    const cb = args.pop();
    const options = args.shift();
    const module = base
      .schedule([Logger, forward]) // Force instantiation, so in case error we can print debug logs
      .schedule(['$get', cb]);

    // Invoked by mocha
    return async function initiate() {
      const timeout = options?.timeout;
      if(timeout) {
        this.timeout(timeout);
      }
      let logger;
      try {
        await module
          .after(Logger, [Logger, value => (logger = value)])
          .initiate();
      } catch(err) {
        logger?.printDebugLogs?.();
        throw err;
      }
    };
  };
}

export default function createTestSuite(base) {

  if(!base.has(HttpServer)) {
    return createRawTestSuite(base);
  }

  // this is our "it" wrapper.
  return function factory(...args) {
    const cb = args.pop();
    const options = args.shift();
    const module = base
      .schedule([Logger, forward]) // Force instantiation, so in case error we can print debug logs
      .schedule([HttpServer, '$get', async (server, ...rest) => {
        const address = await server.listen(0, '127.0.0.1');
        return cb(address, ...rest);
      }]);

    // Invoked by mocha
    return async function initiate() {
      const timeout = options?.timeout;
      if(timeout) {
        this.timeout(timeout);
      }
      let logger;
      try {
        await module
          .after(Logger, [Logger, value => (logger = value)])
          .initiate();
      } catch(err) {
        logger?.printDebugLogs?.();
        throw err;
      }
    };
  };
};