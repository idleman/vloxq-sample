/**
 *  Our internal error classes.
 */
import httpErrors from 'http-errors';

export default Object.assign((...args) => httpErrors(...args), httpErrors);