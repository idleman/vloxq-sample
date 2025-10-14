import noop from './noop.mjs';
import autobind from './autobind.mjs';
import isThenable from './isThenable.mjs';
import DefaultMap from './DefaultMap.mjs';
import Executor from './Executor.mjs';
import withValue from './withValue.mjs';


const defaultInject = [];
/**
 * Gets the injection dependencies from a definition
 * @param {object} object - The object to extract dependencies
 * @returns {Array} Array of dependency identifiers
 */
export function getInject(obj) {
  return  Array.isArray(obj) ? obj.slice(0, obj.length - 1) :
          Array.isArray(obj.$inject) ? obj.$inject :
          defaultInject;
}

/**
 * Gets the factory function from a definition
 * @returns {Function} The factory function
 */
export function getFactory(obj) {
  return  typeof obj === 'function' ? obj :
          Array.isArray(obj) ? obj.at(-1) :
          typeof obj.default === 'function' ? obj.default :
          void(0);
}


const inbuilts = [
  '$set',
  '$get',
  '$ready',
  '$onExit',
  '$invoke',
  '$publish',
  '$schedule',
  '$subscribe',
  '$isRunning',
  '$terminate',
  '$isTerminated'
];

globalThis.debugCounter = 0;

function runThrough(collection, invoke = noop, ...args) {
  if(!collection) {
    return [];
  }
  let async = false;
  const values = [];
  for(const cb of collection) {
    const value = invoke(cb, ...args);
    values.push(value);
    if(isThenable(value)) {
      async = true;
    }
  }
  return async ? Promise.all(values) : values;
};

class Scope {

  constructor(template, objects = null, parent = null) {
    autobind(this);
    this.parent = parent;
    this.template = template;
    this.id = Math.round(Math.random()*1000);
    this.objects = objects ? new Map(objects) : new Map();
  }


  invoke(obj, objects = null) {
    let async = false;
    const dependencies = [];
    for(const identity of getInject(obj)) {
      const dep = objects?.get(identity) ?? this.get(identity);
      dependencies.push(dep);
      if(isThenable(dep)) {
        async = true;
      }
    }
    const factory = getFactory(obj);
    return  !async ? factory(...dependencies) :
            Promise.all(dependencies).then(values => factory(...values)); 
  }

  get(identity) {
    const tests = [this];
    while(tests.length) {
      const { parent, objects } = tests.shift();
      const maybe = objects.get(identity);
      if(maybe !== void(0)) {
        return maybe;
      }
      if(parent) {
        tests.push(parent);
      }
    }

    const result = this.construct(identity);
    this.objects.set(identity, result);
    if(isThenable(result)) {
      result.then(value => this.objects.set(identity, value));
    }
    return result;
  }

  construct(identity) {
    const descriptor = this.template.get(identity);
    if(!descriptor) {
      throw new Error(`Scope<construct>: Identity not found: "${identity}"`);
    }
    return withValue(runThrough(descriptor.before, this.invoke), () => {
      const result = descriptor.value ?? this.invoke(descriptor.inject.concat([descriptor.construct]));
      if(result === void(0)) {
        throw new Error(`Factory function must not return undefined (identity=${identity}, function=${descriptor.construct})`);
      }
      return withValue(result, value => {
        return withValue(runThrough(descriptor.after, this.invoke, new Map([ [identity, result] ])), () => value);
      });
    });
  }

  createChildScope(objects = null) {
    return new Scope(this.template, objects, this);
  }
}

/**
 * Instance class that manages the lifecycle and execution of a module.
 */
class Instance {

  /**
   * Creates a new Instance for a module.
   * @param {Module} module - The module to create an instance for
   */
  constructor(module) {
    autobind(this);
    this.executor = new Executor();
    this.subscribers = new DefaultMap(() => []);
    this.scope = new Scope(module._Module.objects, new Map([
      ['$get', this.get],
      ['$invoke', this.invoke],
      ['$construct', this.construct],
      ['$on', this.on],
      ['$once', this.once],
      ['$publish', this.publish],
      ['$terminate', this.terminate],
      ['$terminated', () => this.terminated]
    ]));
    for(const cb of module._Module.schedule) {
      this.executor.post(() => this.scope.invoke(cb));
    }    
  }
  
  /**
   * Gets a value by identity, creating it if necessary.
   * @param {string} identity - The identity to get
   * @returns {any} The value for the identity
   * @throws {Error} If factory not found for identity
   */
  get(identity = noop) {
    return this.executor.exec(() => this.scope.get(identity));
  }


  /**
   * Constructing a value by identity.
   * @param {string} identity - The identity to get
   * @returns {any} The value for the identity
   * @throws {Error} If factory not found for identity
   */
  construct(identity = noop) {
    return this.executor.exec(() => this.scope.createChildScope().construct(identity));
  }

  /**
   * Invokes a callback with resolved dependencies.
   * @param {Function|Array} cb - Callback to invoke
   * @returns {Promise} Promise that resolves to the callback result
   */
  invoke(cb = noop) {
    return this.executor.exec(() => this.scope.invoke(cb));
  }

  on(type = '', cb = noop) {
    const subscribers = this.subscribers.get(type);
    subscribers.push(cb);
    return function unsubscribe() {
      const pos = subscribers.indexOf(cb);
      if(pos !== -1) {
        subscribers.splice(pos, 1);
      }
    };
  }


  once(type = '', cb = noop) {
    const unsubscribe = this.on(type, (...args) => {
      unsubscribe();
      return cb(...args);
    });
    return unsubscribe;
  }


  /**
   * Publishes an event to all subscribers.
   * 
   * Calls all subscribed listeners with the provided arguments.
   * 
   * @param {...any} args - Arguments to pass to all subscribers
   * 
   * @example
   * const emitter = new EventEmitter();
   * 
   * emitter.subscribe((event, data) => console.log(event, data));
   * emitter.publish('user:created', { id: 1, name: 'John' });
   * // Output: user:created { id: 1, name: 'John' }
   */
  publish(type = '', ...eventArgs) {
    this.subscribers.getMaybe(type)?.forEach(obj => {
      const cb = getFactory(obj);
      const inject = getInject(obj);
      return  inject.length === 0 ? this.executor.post(cb) :
              this.invoke(inject.concat([(...injectArgs) => {
                const args = injectArgs.concat(eventArgs);
                return cb(...args);
              }]));
    });
  }

  /**
   * Runs the module instance, executing scheduled tasks and managing lifecycle.
   * @returns {Promise} Promise that resolves when all tasks are complete
   */
  async run() {
    const errors = [];
    try {
      await this.executor.run();
    } catch(err) {
      errors.push(err);
    }
    
    this.terminate();
    await this.executor.run();
    if(errors.length) {
      throw errors[0];
    }
  }

  /**
   * Terminates the instance and emits exit event.
   */
  terminate(...args) {
    if(!this.terminated) {
      this.terminated = true;
      this.publish('exit', ...args);
    }
  }

}

function assertFunction(cb = noop) {
  const type = typeof cb;
  if(type !== 'function') {
    throw new Error(`Expected argument to be a function (got=${type})`);
  }
  return cb;
}

function createModuleObjectDescriptor() {
  return {
    value: void(0),
    after: new Set(),
    before: new Set(),
    inject: defaultInject,
    construct: noop
  };
}

/**
 * Module class for dependency injection and lifecycle management.
 */
export default class Module {

  /**
   * Creates a new Module instance.
   * @param {Object} props - Module properties
   * @param {Map} props.pool - Map of identity to factory functions
   * @param {boolean} props.mutable - Whether the module is mutable
   * @param {Set} props.schedule - Set of scheduled functions
   * @param {Map} props.lifecycle - Map of lifecycle hooks
   */
  constructor(props = null) {
    // { pool, mutable, schedule, lifecycle }

    const mutable = !!props?.mutable;
    const schedule = new Set(props?.schedule);
    const objects = new DefaultMap(createModuleObjectDescriptor); /// identity => inject
    
    if(props?.objects) {
      for(const [identity, theirs] of props?.objects.entries()) {
        objects.set(identity, {
          value: theirs.value,
          after: new Set(theirs.after),
          before: new Set(theirs.before),
          inject: theirs.inject,
          construct: theirs.construct
        });
      }
    }
    this._Module = {
      mutable,
      objects,
      schedule
    };
  }

  /**
   * Checks if the module is mutable.
   * @returns {boolean} True if mutable, false otherwise
   */
  isMutable() {
    return this._Module.mutable;
  }

  /**
   * Checks if the module is immutable.
   * @returns {boolean} True if immutable, false otherwise
   */
  isImmutable() {
    return !this.isMutable();
  }

  /**
   * Retun a new module with specified mutability.
   * @returns {Module} New module instance
   */
  asMutable() {
    const dataMap = this._Module;
    return dataMap.mutable === true ? this : new Module({ ...dataMap, mutable: true });
  }

  /**
   * Creates an immutable copy of the module.
   * @returns {Module} Immutable module instance
   */
  asImmutable() {
    const dataMap = this._Module;
    return dataMap.mutable === false ? this : new Module({ ...dataMap, mutable: false });
  }

  /**
   * Executes a callback with a mutable version of the module.
   * @param {Function} cb - Callback to execute
   * @returns {Module} Immutable module after mutations
   */
  withMutations(cb = noop) {
    if(this.isMutable()) {
      cb(this);
      return this;
    }
    const obj = this.asMutable();
    cb(obj);
    return obj.asImmutable();
  }

  /**
   * Checks if the module has a factory for the given identity.
   * @param {any} any - Identity of the factory
   * @returns {boolean} True if identity exists, false otherwise
   */
  has(identity) {
    return this._Module.objects.has(identity);
  }


  
  /**
   * Registers an after lifecycle hook for an identity.
   * @param {string} identity - Identity to register hook for
   * @param {Function} cb - HandlerCallback function (optional, defaults to identity)
   * @returns {Module} This module for chaining
   */
  after(identity = noop, cb = noop) {
    return this.withMutations(obj => obj._Module.objects.get(identity).after.add(cb));
  }



  /**
   * Registers a before lifecycle hook for an identity.
   * @param {string} identity - Identity to register hook for
   * @param {Function} cb - Callback function (optional, defaults to identity)
   * @returns {Module} This module for chaining
   */
  before(identity = noop, cb = noop) {
    return this.withMutations(obj => obj._Module.objects.get(identity).before.add(cb));
  }

  /**
   * Delete a identity and all its lifecycles hooks, if any.
   * @param {any} identity - Identity to delete
   * @returns {Module} This module for chaining
   */
  delete(identity = noop) {
    return this.withMutations(obj => obj._Module.objects.delete(identity));
  }
  
  // update(identity, updater = noop) {
  //   return this.withMutations(obj => updater(obj._Module.objects.get(identity)));
  // }

  /**
   * Registers a factory.
   * 
   * @param {object|function} obj -Object definition or the function itself
   * @returns {Module} This module for chaining
   */
  factory(obj) {
    const inject = getInject(obj);
    const construct = assertFunction(getFactory(obj));
    return this.withMutations(obj => {
      const descriptor = obj._Module.objects.get(construct);
      descriptor.value = void(0);
      descriptor.inject = inject;
      descriptor.construct = construct;
    });
  }

  /**
   * Registers a constant.
   * 
   * @param {any} identity -The name of the constant
   * @param {any} value -The value of the constant
   * @returns {Module} This module for chaining
   */
  constant(identity, value) {
    return this.withMutations(obj => {
      const descriptor = obj._Module.objects.get(identity);
      descriptor.value = value;
    });
  }


  /**
   * Registers a scheduled function.
   * @param {Function} cb - Function to schedule
   * @returns {Module} This module for chaining
   */
  schedule(cb = noop) {
    return this.withMutations(obj => obj._Module.schedule.add(cb));
  }

  /**
   * Extends this module with another module's factories, schedules, and lifecycle hooks.
   * @param {Module} other - Module to extend from
   * @returns {Module} This module for chaining
   * @throws {Error} If other is not a Module instance
   */
  extends(other) {
    if(!(other instanceof Module)) {
      throw new Error('Module<extend>: source must be an instance of Module');
    }
    return this.withMutations(obj => {
      const ours = obj._Module;
      const theirs = other._Module;
      for(const cb of theirs.schedule) {
        ours.schedule.add(cb);
      }

      for(const [identity, descriptor] of theirs.objects.entries()) {
        ours.objects.set(identity, {
          value: descriptor.value,
          after: new Set(descriptor.after),
          before: new Set(descriptor.before),
          inject: descriptor.inject,
          construct: descriptor.construct
        });
      }
    });
  }


  /**
   * Creates and runs a module instance.
   * @returns {Promise} Promise that resolves when the instance completes
   */
  initiate() {
    const instance = new Instance(this.asImmutable());
    return instance.run();
  }

};