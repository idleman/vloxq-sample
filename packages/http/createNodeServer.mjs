import httpErrors from './errors.mjs';
import { createServer as createHttp1Server } from 'node:http';
import { createSecureServer as createHttp2Server } from 'node:http2';
import Logger from '@sample/core/Logger.mjs';
import tryCatch from '@sample/core/tryCatch.mjs';
import withValue from '@sample/core/withValue.mjs';
import isNullish from '@sample/core/isNullish.mjs';
import noop from '@sample/core/noop.mjs';

function createListener(server, event = '', cb = noop, cleanup = []) {
  const listener = val => {
    cleanup.forEach(cb => cb());
    cb(val);
  };
  server.on(event, listener);
  cleanup.push(() => server.off(event, listener));
}

export default function createNodeServer(...args) {
  const cb = args.pop();
  const connections = new Set();
  const options = args.pop() ?? {};
  const logger = options.logger ?? Logger.getInstance();

  const protocol = (options.cert || options.pfx) ? 'https' : 'http';
  const handleRequest = (req, res) => {
    const start = performance.now();
    return withValue(tryCatch(() => cb(req, res)), ([_1, err]) => {
      const elapsed = performance.now() - start;
      if(!isNullish(err)) {
        if(httpErrors.isHttpError(err)) {
          logger.error(`${req.method} ${req.url}: ${err.statusCode} (elapsed=${elapsed.toFixed(0)})`);
          if(!res.writableEnded) {
            try {
              res.writeHead(err.statusCode);
            } catch(e) { }
            res.end();
          }
          return;
        }
        logger.error(`${req.method} ${req.url}: Error (elapsed=${elapsed.toFixed(0)} msg="${err.message}", stack=${err.stack})`);
        if(!res.writableEnded) {
          try {
            res.writeHead(500);
          } catch(e) { }
          res.end();
        }
        return;
      }
      
      if(res.writableEnded) {
        logger.info(`${req.method} ${req.url}: OK (elapsed=${elapsed.toFixed(0)})`);
        return;
      }
      try {
        res.writeHead(404);
      } catch (e) { }
      res.end();
      logger.info(`${req.method} ${req.url}: 404 (elapsed=${elapsed.toFixed(0)})`);
    });
  };
  const server = (protocol === 'http') ? createHttp1Server(handleRequest) : createHttp2Server(options, handleRequest);

  server.on('connection', connection => {
    connections.add(connection);
    connection.on('close', () => connections.delete(connection));
  });

  server.on('stream', stream => {
    connections.add(stream);
    stream.on('close', () => connections.delete(stream));
  });

  const address = () => {
    const endpoint = server.address();
    return endpoint ? `${protocol}://${endpoint.address}:${endpoint.port}` : '';
  };

  const listen = (port = 0, host = '127.0.0.1') => {
    const { reject, resolve, promise } = Promise.withResolvers();
    server.listen(port, host, err => err ? reject(err) : resolve(address()));
    return promise;
  };

  const close = () => {
    if(!address()) {
      return;
    }
    for(const connection of connections) {
      connection.destroy();
    }
    const { reject, resolve, promise } = Promise.withResolvers();
    server.close(err => {
      if(isNullish(err)) {
        return resolve();
      }
      logger.error(err);
      return reject(err)
    });
    return promise;
  };

  const wait = () => {
    if(address()) {
      return;
    }
    const cleanup = [];
    const { reject, resolve, promise } = Promise.withResolvers();
    createListener(server, 'error', reject, cleanup);
    createListener(server, 'listening', resolve, cleanup);
    return promise;
  };

  // Wait until it closes
  const join = () => {
    if(!address()) {
      return;
    }
    
    const cleanup = [];
    const { reject, resolve, promise } = Promise.withResolvers();
    createListener(server, 'error', reject, cleanup);
    createListener(server, 'close', resolve, cleanup);
    return promise;
  };

  return {
    join,
    wait,
    close,
    listen,
    address
  };
};