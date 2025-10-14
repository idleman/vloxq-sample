import Module from './Module.mjs';
import tryCatch from './tryCatch.mjs';
import { strictEqual, throws } from 'assert';
import getPackageName from './getPackageName.mjs';

const Logger = () => {
  const history = [];
  return {
    history() {
      return history;
    },
    log(...args) {
      history.push(args.join(''));
    }
  };
};

const Add = logger => {
  return function add(initial, ...args) {
    const result = args.reduce((s, v) => s + v, initial);
    logger.log('add(',  [initial].concat(args).join(', '), ') = ', result);
    return result;
  };
};
Add.$inject = [Logger];


const beforeAdd = [Logger, logger => {
  logger.log('before add');
}];

const afterAdd = [Add, Logger, (add, logger) => {
  strictEqual(add(1, 2), 3);
  logger.log('after add');
}];



describe(getPackageName(import.meta.url), function() {

  it('should support simple scheduling', async function() {
    const history = [];
    const module = new Module()
      .schedule(() => history.push('first'))
      .schedule(() => history.push('second'))
      .schedule(['$invoke', async invoke => {
        const result = await invoke(() => 1 + 2);
        history.push(result);
      }]);


    await module.initiate();
    strictEqual(history.length, 3);
    strictEqual(history[0], 'first');
    strictEqual(history[1], 'second');
    strictEqual(history[2], 3);
  });

  it('should support basic factory', async function() {
    const history = [];
    const Add = () => (a, b) => (a + b);
    const module = new Module()
      .factory(Add)
      .schedule([Add, add => history.push(add(1, 2))]);


    await module.initiate();
    strictEqual(history.length, 1);
    strictEqual(history[0], 3);
  });


  it('should work', async function() {
    let history;
    const module = new Module()
      .factory(Add)
      .factory(Logger)
      .after(Add, afterAdd)
      .before(Add, beforeAdd)
      .schedule([Add, Logger, (add, logger) => {
        history = logger.history();
        strictEqual(5, add(2, 3));
      }]);


    await module.initiate();
    strictEqual(history.length, 4);
    strictEqual(history[0], 'before add');
    strictEqual(history[1], 'add(1, 2) = 3');
    strictEqual(history[2], 'after add');
    strictEqual(history[3], 'add(2, 3) = 5');

  });

  it('should suport extending', async function() {
    let history;
    const logger = new Module()
      .factory(Logger);

    const adder = new Module()
      .extends(logger)
      .factory(Add)
      .after(Add, afterAdd)
      .before(Add, beforeAdd);

    const module = new Module()
      .extends(adder)
      .after(Add, afterAdd)
      .before(Add, beforeAdd)
      .schedule([Add, Logger, (add, logger) => {
        history = logger.history();
        strictEqual(5, add(2, 3));
      }]);


    await module.initiate();

    strictEqual(history.length, 4);
    strictEqual(history[0], 'before add');
    strictEqual(history[1], 'add(1, 2) = 3');
    strictEqual(history[2], 'after add');
    strictEqual(history[3], 'add(2, 3) = 5');

  });

  it('should throw if error', async function() {
    const history = [];
    const error = new Error();
    const secret = 123;
    const module = new Module()
      .factory(Add)
      .factory(Logger)
      .constant('secret', secret)
      .after(Add, ['$on', on => {
        on('exit', ['secret', secret => history.push('exit' + secret)]);
        throw error;
      }])
      .schedule([Add, add => {
        history.push('schedule');
        strictEqual(5, add(2, 3));
      }]);

    const [_1, err] = await tryCatch(() => module.initiate());
    strictEqual(err, error);
    strictEqual(history.join(', '), 'exit' + secret);
  });

});