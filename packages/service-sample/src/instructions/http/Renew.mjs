import Logger from '@sample/service/Logger.mjs';
import tryCatch from '@sample/core/tryCatch.mjs';
import httpErrors from '@sample/http/errors.mjs';
import RenewMutation from '../mutation/Renew.mjs';
import HttpRouter from '@sample/service/http/Router.mjs';

const $inject = [RenewMutation, Logger, HttpRouter];

function Renew(renew, logger, router) {
  router.post('/renew', async () => {
    const [_1, err] = await tryCatch(renew);
    if(err) {
      logger.error(err);
      throw new httpErrors.InternalServerError();
    }
    return Response.json({ status: 'OK' });
  }); 
}


export default Object.assign(Renew, { $inject });