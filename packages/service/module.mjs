/**
 * Export a base service module. All services should share this common functionallity.
 * And because it is embedded in a IooC-container, can each part easily by swap out with
 * implementation - if needed.
 */
import Fetch from './Fetch.mjs';
import Logger from './Logger.mjs';
import Process from './Process.mjs';
import Filesystem from './Filesystem.mjs';
import HttpRouter from './http/Router.mjs';
import HttpServer from './http/Server.mjs';
import Module from '@sample/core/Module.mjs';

export default new Module()
  .factory(Fetch)
  .factory(Logger)
  .factory(Process)
  .factory(Filesystem)
  .factory(HttpRouter)
  .factory(HttpServer);