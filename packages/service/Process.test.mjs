import Process from './Process.mjs';
import { strictEqual } from 'assert';
import Module from '@sample/core/Module.mjs';
import getPackageName from '@sample/core/getPackageName.mjs';

describe(getPackageName(import.meta.url), function() {

  it('should set process.env.TEST', async function () {
    const state = { terminate: null, process: null };
    const module = new Module()
      .factory(Process)
      .schedule([Process, '$terminate', '$on', (process, terminate, on) => {
        Object.assign(state, { process, terminate });
        const { resolve, promise } = Promise.withResolvers();
        on('exit', resolve);
        return promise;
      }]);

    const promise = module.initiate();
    setTimeout(() => state.terminate(), 10);
    await promise;

    strictEqual(state.process.env.TEST, true);
    strictEqual(Object.getPrototypeOf(state.process), globalThis.process);
  });

});