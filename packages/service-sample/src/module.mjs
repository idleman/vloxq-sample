import service from '@sample/service/module.mjs';

import reporter from './reporter/module.mjs';
import instructions from './instructions/module.mjs';

export default service
  .extends(instructions)
  .extends(reporter);