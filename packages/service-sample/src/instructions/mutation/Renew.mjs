import { join } from 'node:path';
import Registry from '../Registry.mjs';
import { cacheFile } from '../symbols.mjs';
import Fetch from '@sample/service/Fetch.mjs';
import Logger from '@sample/service/Logger.mjs';
import Process from '@sample/service/Process.mjs';
import Filesystem from '@sample/service/Filesystem.mjs';
import tryCatch from '@sample/core/tryCatch.mjs';

const $inject = [Fetch, Process, Logger, Registry, Filesystem];

const reduceToMap = (map, [name, cb]) => {
  if(typeof cb === 'function') {
    map.set(name, cb);
  }
  return map;
}

function toDataURI(str, mimeType = 'text/javascript') {
  const bytes = new TextEncoder().encode(str);
  const base64 = btoa(String.fromCharCode(...bytes));
  return `data:${mimeType};base64,${base64}`;
}


function Renew(fetch, process, logger, registry, filesystem) {
  return async function renew() {
    try {
      const url = process.env.FETCH_URL;
      if(!url) {
        return;
      }
      const response = await fetch(url);
      if(!response.ok) {
        return;
      }
      const code = await response.text();
      //const [exports] = await tryCatch(() => import(`${src}?v=${Date.now()}`));
      const exports = await import(toDataURI(code));
      const map = Array
        .from(Object.entries(exports))
        .reduce(reduceToMap, new Map());
      registry.setState(map);
    } catch(err) {
      logger.error(err);
    }
  };
}

export default Object.assign(Renew, { $inject });