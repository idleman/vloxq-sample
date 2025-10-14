import readline from 'readline';
import { filename } from '../symbols.mjs';
import tryCatch from '@sample/core/tryCatch.mjs';
import Filesystem from '@sample/service/Filesystem.mjs';


const $inject = [Filesystem];


function GetReportCount(fs) {
  
  return async () => {
    const [count = 0] = await tryCatch(async () => {
      const stream = fs.createReadStream(filename);
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity // handles both \n and \r\n
      });
      
      let count = 0;
      for await (const line of rl) {
        const json = line.trim();
        if(!json) {
          continue;
        }
        const [obj] = tryCatch(() => JSON.parse(json));
        const result = obj?.result;
        if(typeof result === 'number') {
          count += result;
        }
      }
      return count;
    });
    return count;
    
  };
}

export default Object.assign(GetReportCount, { $inject });