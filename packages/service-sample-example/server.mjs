import { readFile } from 'node:fs/promises';
import base from '@sample/service/module.mjs';
import Logger from '@sample/service/Logger.mjs';
import tryCatch from '@sample/core/tryCatch.mjs';
import httpErrors from '@sample/http/errors.mjs';
import Process from '@sample/service/Process.mjs';
import HttpRouter from '@sample/service/http/Router.mjs';
import HttpServer from '@sample/service/http/Server.mjs';

const filename = './instructions.mjs';
const module = base
  .after(HttpRouter, [HttpRouter, router => {
    router.get('/', async req => {
      const [body] = await tryCatch(() => readFile(filename, 'utf8'));
      if(!body) {
        throw new httpErrors.NotFound();
      }
      return new Response(body, {
        headers: {
          'content-type': 'text/plain'
        }
      });
    })
  }])
  .schedule([Logger, Process, HttpServer, async (logger, process, server) => {
    const port = parseInt(process.env.PORT || 0, 10);
    const address = await server.listen(port, '127.0.0.1');
    logger.log(`Listening on ${address}`);
    return server.join();
  }]);

await module.initiate();
