import service from '@sample/service/module.mjs';
import instructions from '../instructions/module.mjs';
import HttpRouter from '@sample/service/http/Router.mjs';

import AddReport from './mutation/AddReport.mjs';
import GetReportCount from './query/GetReportCount.mjs';
import setupHttpReportRoute from './http/Report.mjs';

import Calc from '../instructions/query/Calc.mjs';
import Evaluate from '../instructions/query/Evaluate.mjs';

export default service
  .extends(instructions)
  .factory(AddReport)
  .factory(GetReportCount)
  .after(HttpRouter, setupHttpReportRoute)

  // Lets bind the instructions module with our "addReport":
  .after(Calc, [Calc, AddReport, (calc, addReport) => calc.subscribe(addReport)])
  .after(Evaluate, [Evaluate, AddReport, (evaluate, addReport) => evaluate.subscribe(addReport)]);