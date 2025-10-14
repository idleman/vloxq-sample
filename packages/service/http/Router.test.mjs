import Router from './Router.mjs';
import { strictEqual } from 'assert';
import Module from '@sample/core/Module.mjs';
import getPackageName from '@sample/core/getPackageName.mjs';

describe(getPackageName(import.meta.url), function() {

  it('should export http server', async function () {
    const version = 123;
    const responses = [];
    const module = new Module()
      .factory(Router)
      .after(Router, [Router, router => {
        router.get('/version', req => Response.json({ version }));
      }])
      .schedule([Router, '$terminate', async (router, terminate) => {
        const request = new Request(`http://localhost/version`);
        responses.push(router.resolve(request));
      }]);



    await module.initiate();
    strictEqual(responses.length, 1);
    const [response] = responses;
    strictEqual(response.status, 200);
    const data = await response.json();
    strictEqual(data.version, version);
  });


});