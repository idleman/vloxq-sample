import base from './module.mjs';
import Logger from './Logger.mjs';
import Process from './Process.mjs';
import { notStrictEqual, strictEqual } from 'assert';
import Filesystem from './Filesystem.mjs';
import HttpRouter from './http/Router.mjs';
import HttpServer from './http/Server.mjs';
import getPackageName from '@sample/core/getPackageName.mjs';

describe(getPackageName(import.meta.url), function() {

  it('should create a temporary working directory if test environment', async function () {

    let logger = null;
    const deps = [Logger, Process, Filesystem, HttpRouter, HttpServer];
    const before = process.cwd();
    const module = base
      .schedule([...deps, ($logger, process) => {
        notStrictEqual(before, process.cwd());
        logger = $logger;
        logger.log(`process.env.TEST:${process.env.TEST}`);
      }]);

    await module.initiate();
    const logs = logger.getRecentLogs();
    const isTestEnv = logs.some(obj => obj.messages.join('').includes('process.env.TEST:true'));
    strictEqual(isTestEnv, true);
  });

});