/**
 * Try to get a instruction
 */

import Get from './Get.mjs';
import withWatch from '../util/withWatch.mjs';

const $inject = [Get];

function Calc(get) {
  return withWatch((op, ...args) => {
    return get(op)?.(...args);
  });
}

export default Object.assign(Calc, { $inject });