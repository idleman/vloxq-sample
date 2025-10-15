import CalcQuery from '../query/Calc.mjs';
import toURL from '@sample/http/toURL.mjs';
import httpErrors from '@sample/http/errors.mjs';
import HttpRouter from '@sample/service/http/Router.mjs';

const $inject = [CalcQuery, HttpRouter];

function toNumber(val) {
  const result = Number(val);
  if(isNaN(result)) {
    throw new httpErrors.BadRequest();
  }
  return result;
}

function Calc(calc, router) {
  router.get('/calc', req => {
    const url = toURL(req.url);
    const params = url.searchParams;
    const op = params.get('op');
    const terms = params.getAll('term').map(v => toNumber(v));
    const result = calc(op, ...terms);
    if(result === void(0)) {
      throw new httpErrors.NotImplemented();
    }
    return Response.json({ result });
  }); 
}



export default Object.assign(Calc, { $inject });
