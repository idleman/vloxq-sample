import Server from './Server.mjs';
import Router from './Router.mjs';
import Logger from '../Logger.mjs';
import Process from '../Process.mjs';
import { strictEqual } from 'assert';
import Filesystem from '../Filesystem.mjs';
import Module from '@sample/core/Module.mjs';
import getPackageName from '@sample/core/getPackageName.mjs';

describe(getPackageName(import.meta.url), function() {

  it('should export a http server', async function () {
    let versions = [123];
    const module = new Module()
      .factory(Process)
      .factory(Server)
      .factory(Router)
      .factory(Logger)
      .factory(Filesystem)
      .after(Router, [Router, router => {

        router
          .get('/version', req => Response.json({ version: versions.at(-1) }))
          .put('/version', async req => {
            const data = await req.json();
            const next = data?.version;
            if(Number.isSafeInteger(next)) {
              versions.push(next);
            }
            return Response.json({ status: 'OK' })
          })
      }])
      .schedule([Server, '$terminate', async (server, terminate) => {
        
        const address = await server.listen();
        try {
          {
            const response = await fetch(`${address}/version`);
            strictEqual(response.status, 200);
            const data = await response.json();
            strictEqual(data.version, versions.at(-1));
          }
          {
            const response = await fetch(`${address}/version`, {
              method: 'PUT',
              body: JSON.stringify({ version: 321 })
            });
            strictEqual(response.status, 200);
            const data = await response.json();
            strictEqual(data.status, 'OK');
          }
          {
            const response = await fetch(`${address}/version`);
            strictEqual(response.status, 200);
            const data = await response.json();
            strictEqual(data.version, 321);
          }
        } finally {
          terminate();
        }
      }]);

    await module.initiate();
  });


});