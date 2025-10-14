import { filename } from '../symbols.mjs';
import Filesystem from '@sample/service/Filesystem.mjs';

const $inject = [Filesystem];

function AddReport(fs) {
  
  return report => {
    // The only reason we use *Sync calls is because we do not handle concurrent access
    fs.appendFileSync(filename, `${JSON.stringify(report)}\n`);
  };
}

export default Object.assign(AddReport, { $inject });