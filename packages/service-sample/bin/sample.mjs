import base from '../src/module.mjs';
import Logger from '@sample/service/Logger.mjs';
import Process from '@sample/service/Process.mjs';
import HttpServer from '@sample/service/http/Server.mjs';
import Renew from '../src/instructions/mutation/Renew.mjs';


const module = base
  .schedule([Renew, Logger, Process, HttpServer, async (renew, logger, process, server) => {
    await renew();
    const port = parseInt(process.env.PORT || 8080, 10);
    const address = await server.listen(port, '127.0.0.1');
    logger.log(`Listening on ${address}`);
    return server.join();
  }]);

await module.initiate();
