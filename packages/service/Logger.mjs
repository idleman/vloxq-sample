import Process from './Process.mjs';
import Queue from '@sample/core/Queue.mjs';
import withCache from '@sample/core/withCache.mjs';
import withValue from '@sample/core/withValue.mjs';

//  We lazy load Process in case any Process after handle want to log something
const limit = 1024;
const $inject = ['$get'];

function Logger($get) {
  // Process
  const queue = new Queue();
  const resolve = withCache(new Map(), (key, cache) => {
    return withValue($get(key), value => {
      cache.set(key, value);
      return value;
    });
  });

  /**
   * A wrapper for console.method that will only log if the TEST environment variable is not set.
   */
  function proxy(method, args) {
    withValue(resolve(Process), ({ env }) => {
      queue.push([method, args]);
      if(!env.TEST) {
        console[method](...args);
      }
      if(limit < queue.length) {
        queue.shift();
      }
    });
  }



  return {
    log(...args) {
      return proxy('log', args);
    },

    info(...args) {
      return proxy('info', args);
    },

    warn(...args) {
      return proxy('warn', args);
    },

    error(...args) {
      return proxy('error', args);
    },

    /**
     * Get the most recent console logs. Can only be used once (will clear the logs)
     * and should only be used as a debug tool. 
     * @returns array
     */
    getRecentLogs() {
      const logs = [];
      while(true) {
        const maybe = queue.shift();
        if(!maybe) {
          break;
        }
        const [type, messages] = maybe;
        logs.push({ type, messages });
      }
      return logs;
    },
    
    printDebugLogs(logger = globalThis.console) {
      for(const { type, messages } of this.getRecentLogs()) {
        logger[type]?.(...messages);
      }
    }
  };
}


export default Object.assign(Logger, { $inject });