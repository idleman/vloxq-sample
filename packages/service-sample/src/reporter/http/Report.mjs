import HttpRouter from '@sample/service/http/Router.mjs';
import GetReportCount from '../query/GetReportCount.mjs';

const $inject = [HttpRouter, GetReportCount];

function Report(router, getReportCount) {
  router.get('/reports', async req => {
    const result = await getReportCount();
    return Response.json({ result });
  }); 
}


export default Object.assign(Report, { $inject });