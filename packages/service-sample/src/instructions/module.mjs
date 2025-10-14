import service from '@sample/service/module.mjs';
import HttpRouter from '@sample/service/http/Router.mjs';


import Renew from './mutation/Renew.mjs';

import Registry from './Registry.mjs';
import GetQuery from './query/Get.mjs';
import CalcQuery from './query/Calc.mjs';
import EvaluateQuery from './query/Evaluate.mjs';

import setupHttpCalcRoute from './http/Calc.mjs';
import setupHttpRenewRoute from './http/Renew.mjs';
import setupHttpEvaluateRoute from './http/Evaluate.mjs';

export default service
  .factory(Renew)
  .factory(Registry)
  .factory(GetQuery)
  .factory(CalcQuery)
  .factory(EvaluateQuery)
  .after(HttpRouter, setupHttpCalcRoute)
  .after(HttpRouter, setupHttpRenewRoute)
  .after(HttpRouter, setupHttpEvaluateRoute);