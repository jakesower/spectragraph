import { reverse } from "./arrays.mjs";

export function pipe(fns) {
  return fns.reduce(
    (acc, fn) => (val) => fn(acc(val)),
    (x) => x
  );
}

export function pipeThru(val, fns) {
  return pipe(fns)(val);
}

export function prop(key) {
  return (obj) => obj[key];
}

export function pipeThruMiddleware(init, context, middlewares) {
  if (middlewares.length === 0) {
    return init;
  }

  const fn = reverse(middlewares).reduce(
    (onion, mw) => {
      return (val) => mw(val, onion, context);
    },
    (val) => val
  );

  return fn(init);
}

export function pipeThruMiddlewareDebug(init, context, middlewares) {
  const l = middlewares.length;
  if (l === 0) {
    return init;
  }

  const fn = reverse(middlewares).reduce(
    (onion, mw, idx) => {
      return async (val) => {
        console.log(`-----Incoming to Middleware #${l - idx}-----`);
        console.log(val);
        console.log(mw);
        const out = await mw(val, onion, context);
        console.log(`-----Returning from Middleware #${l - idx}-----`);
        console.log(out);
        return out;
      };
    },
    (val) => {
      console.log("-----reached bottom with value-----");
      console.log(val);
      return val;
    }
  );

  return fn(init);
}
