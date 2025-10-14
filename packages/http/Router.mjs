
/**
 * A lightweight router implemtation. Aim to be as Wwhatwg standard compliant as possible.
 */

import toURL from './toURL.mjs';
import { NotFound } from './utils.mjs';
import noop from '@sample/core/noop.mjs';
import LRUMap from '@sample/core/LRUMap.mjs';
import RadixTree from '@sample/core/RadixTree.mjs';
import withCache from '@sample/core/withCache.mjs';


const toPathArray = withCache(new LRUMap(2**8), pathname => {
  return pathname
    .slice(1)
    .split('/');
});



function reduceToRoute(state, segment, index) {
  const isParam = segment.startsWith(':');
  const name = isParam ? segment.slice(1) : `params${index}`;
  const value = isParam ? '*' : segment;
  state.names.push(name);
  state.path.push(value);
  return state;  
}


function createRouteHandler(handler, names) {
  const namesLength = names.length;
  return req => {
    const params = {};
    const url = req.url;
    const pathname = url.slice(url.indexOf('/', url.indexOf('://') + 3));
    const segments = toPathArray(pathname);
    for (let i = 0; i < namesLength; ++i) {
      params[names[i]] = segments[i];
    }
    return handler(req, params);
  }
}

const resolveRoute = (tree, segment) => tree.get(segment) || tree.get('*');

export default class Router {

  constructor() {
    this.middleware = [];
    this.static_routes = {
      PUT: new Map(),
      GET: new Map(),
      POST: new Map(),
      HEAD: new Map(),
      PATCH: new Map(),
      TRACE: new Map(),
      DELETE: new Map(),
      OPTIONS: new Map(),
      CONNECT: new Map()
    };
    this.dynamic_routes = {
      PUT: new RadixTree(),
      GET: new RadixTree(),
      POST: new RadixTree(),
      HEAD: new RadixTree(),
      PATCH: new RadixTree(),
      TRACE: new RadixTree(),
      DELETE: new RadixTree(),
      OPTIONS: new RadixTree(),
      CONNECT: new RadixTree()
    };
    this.resolve = this.resolve.bind(this);
  }

  use(cb = noop) {
    this.middleware.push(cb);
    return this;
  }

  route(method = 'GET', pathname = '/', handler = NotFound) {
    if(!pathname.startsWith('/')) {
      throw new Error('Path must start with a slash');
    }
    method = method.toUpperCase();
    if(!pathname.includes('/:')) {
      this.static_routes[method].set(pathname, handler);
      return this;
    }


    const { path, names } = toPathArray(pathname).reduce(reduceToRoute, { path: [], names: [] });
    this
      .dynamic_routes[method]
      .setIn(path, createRouteHandler(handler, names));
    
    return this;
  }

  get(path = '/', handler = NotFound) {
    return this.route('GET', path, handler);
  }

  post(path = '/', handler = NotFound) {
    return this.route('POST', path, handler);
  }

  put(path = '/', handler = NotFound) {
    return this.route('PUT', path, handler);
  }

  delete(path = '/', handler = NotFound) {
    return this.route('DELETE', path, handler);
  }

  patch(path = '/', handler = NotFound) {
    return this.route('PATCH', path, handler);
  }

  options(path = '/', handler = NotFound) {
    return this.route('OPTIONS', path, handler);
  }

  head(path = '/', handler = NotFound) {
    return this.route('HEAD', path, handler);
  }

  trace(path = '/', handler = NotFound) {
    return this.route('TRACE', path, handler);
  }

  connect(path, handler = NotFound) {
    return this.route('CONNECT', path, handler);
  }

  resolve(req, skipMiddleware = false) {
    let index = 0;
    const middleware = this.middleware;
    const staticRoutes = this.static_routes;
    const dynamicRoutes = this.dynamic_routes;
    const middlewareLength = middleware.length;

    const dispatch = () => {
      const url = toURL(req.url);
      const method = req.method;
      // Try static route first
      const pathname = url.pathname;
      const maybeStatic = staticRoutes[method].get(pathname);
      if(maybeStatic) {
        return maybeStatic(req);
      }

      // Try dynamic route
      const path = toPathArray(pathname);
      const maybeDynamic = dynamicRoutes[method].getIn(path, null, resolveRoute);
      if(maybeDynamic) {
        return maybeDynamic(req);
      }
      
      return NotFound();
    };

    const handleResult = obj => {
      return  (!obj || obj === req) ? runMiddleware() :
              obj instanceof Response ? obj :
              obj instanceof Request ? this.resolve(obj) :
              runMiddleware(obj);
    };

    const runMiddleware = () => {
      if(index === middlewareLength) {
        return dispatch();
      }
      const cb = middleware[index++];
      const maybe = cb(req);
      return typeof maybe?.then === 'function' ? maybe.then(handleResult) : handleResult(maybe);
    };

    return skipMiddleware ? dispatch() : runMiddleware();
  }

};