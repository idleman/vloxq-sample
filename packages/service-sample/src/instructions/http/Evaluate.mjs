import toURL from '@sample/http/toURL.mjs';
import Logger from '@sample/service/Logger.mjs';
import tryCatch from '@sample/core/tryCatch.mjs';
import httpErrors from '@sample/http/errors.mjs';
import EvaluateQuery from '../query/Evaluate.mjs';
import isNullish from '@sample/core/isNullish.mjs';
import HttpRouter from '@sample/service/http/Router.mjs';

const $inject = [HttpRouter, Logger, EvaluateQuery];


function Evaluate(router, logger, evaluate) {
  router.get('/evaluate', req => {
    const url = toURL(req.url);
    const params = url.searchParams;
    const expression = params.get('expression')?.trim?.();
    if(!expression) {
      throw new httpErrors.BadRequest();
    }
    const [result, err] = tryCatch(() => evaluate(expression));
    if(!isNullish(err)) {
      logger.error(err);
    }
    if(isNullish(result)) {
      throw new httpErrors.BadRequest();
    }
    return Response.json({ result });
  }); 
}


export default Object.assign(Evaluate, { $inject });