//  We create this file to ease initialization order. In case
//  a test environment is detected, will the working directory be
//  modified to a temporary folder and then deleted on exit.

import os from 'os';
import native from 'fs-extra';
import Process from './Process.mjs';

const signature = `tmp-${parseInt(Math.random()*2**24, 10)}`;

function createRandomString() {
  return Math
    .round(Math.random()*Number.MAX_SAFE_INTEGER)
    .toString(26);
}

function getRandomDirectory() {
  return  `${os.tmpdir()}/${signature}/${createRandomString()}`
          .replaceAll('\\', '/')
          .replaceAll('//', '/');
}


function createTemporaryCwd(process) {
  const initial = process.cwd();
  if(initial.includes(signature)) {
    process.chdir(initial + '/../');
    native.removeSync(initial);
    return createTemporaryCwd(process);
    //return noop;
  }

  const dir = getRandomDirectory();
  native.ensureDirSync(dir);
  process.chdir(dir);
  const temporary = process.cwd();
  return () => {
    if(process.cwd() === temporary) {
      process.chdir(initial);
    }
    try {
      native.removeSync(dir);
    } catch(err) {
      setTimeout(() => {
        try {
          native.removeSync(dir)
        } catch(err) { }
      }, 100);
    }
  };
}

const $inject = [Process, '$on'];

function FileSystem(process, $on) {
  const reset = process.env.TEST ? createTemporaryCwd(process) : null;
  $on('exit', () => Promise.resolve().then(() => reset?.())); // Ensure we schedule in next microtask

  return Object.assign(Object.create(native));
}

export default Object.assign(FileSystem, { $inject });