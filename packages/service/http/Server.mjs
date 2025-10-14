import Router from './Router.mjs';
import Logger from '../Logger.mjs';
import createNodeServer from '@sample/http/createNodeServer.mjs';
import createNodeAdapter from '@sample/http/createNodeAdapter.mjs';

const $inject = ['$on', Router, Logger];

function Server(on, router, logger) {
  const server = createNodeServer({ logger }, createNodeAdapter(router.resolve))
  on('exit', () => server.close());
  return server;
}


export default Object.assign(Server, { $inject });