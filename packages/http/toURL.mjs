import LRUMap from '@sample/core/LRUMap.mjs';
import withCache from '@sample/core/withCache.mjs';

export default withCache(new LRUMap(2**10), url => new URL(url));