import process from 'node:process';
import Process from './Process.mjs';
import { notStrictEqual } from 'assert';
import FileSystem from './Filesystem.mjs';
import Module from '@sample/core/Module.mjs';
import getPackageName from '@sample/core/getPackageName.mjs';

describe(getPackageName(import.meta.url), function() {

  it('should create a temporary working directory if test environment', function () {

    const before = process.cwd();
    const module = new Module()
      .factory(Process)
      .factory(FileSystem)
      .schedule([Process, FileSystem, process => {
        notStrictEqual(before, process.cwd());
      }]);

    return module.initiate();
  });

});