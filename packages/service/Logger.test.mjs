import Logger from './Logger.mjs';
import Process from './Process.mjs';
import { strictEqual } from 'assert';
import Module from '@sample/core/Module.mjs';
import getPackageName from '@sample/core/getPackageName.mjs';

describe(getPackageName(import.meta.url), function() {

  it('should have the logger object', function () {
    const module = new Module()
      .factory(Logger)
      .factory(Process)
      .schedule([Logger, logger => {
        ['log', 'info', 'warn', 'error'].forEach(k => strictEqual(typeof logger[k], 'function'));
      }]);

    return module.initiate();
  });

});