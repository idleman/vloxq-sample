const reduceToSum = (s, v) => s + v; 
const reduceToMultipy = (s, v) => s * v; 

export const sum = (...args) => args.length === 0 ? void(0) : args.reduce(reduceToSum, 0);
export const multiply = (...args) => args.length === 0 ? void(0) : args.reduce(reduceToMultipy);