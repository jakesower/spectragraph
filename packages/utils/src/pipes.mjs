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

export async function pipeThruAsyncWithContext(val, context, fns) {
  return fns.reduce(
    (acc, fn) => async (val) => {
      const out = await fn(await acc(val), context);
      // console.log({ acc, fn, val, out })
      return out;
    },
    (x) => x
  )(val);
}

export function pipeThruWithContext(val, context, fns) {
  return fns.reduce(
    (acc, fn) => (val) => fn(acc(val), context),
    (x) => x
  )(val);
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

export function pipeThruMiddlewareAsync(init, context, middlewares) {
  if (middlewares.length === 0) {
    return init;
  }

  const fn = reverse(middlewares).reduce(
    (onion, mw) => {
      return async (val) => {
        const out = await mw(val, onion, context);
        // console.log('pmw', { onion, mw, val, out })
        return out;
      };
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

export function pipeThruMiddlewareAsyncDebug(init, context, middlewares) {
  const l = middlewares.length;
  if (l === 0) {
    return init;
  }

  const fn = reverse(middlewares).reduce(
    (onion, mw, idx) => {
      return async (val) => {
        console.log(`-----Incoming to Middleware #${l - idx}-----`);
        console.log(val);
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

export function pipeWithContext(fns) {
  return (init, context) =>
    fns.reduce(
      (acc, fn) => (val) => fn(acc(val), context),
      (x) => x
    )(init);
}

export function pipeWithContextAsyncDebug(fns) {
  const l = fns.length;

  return (init, context) => {
    console.log("-----Beginning Pipe-----");
    console.log(init);
    return fns.reduce(
      (acc, fn, idx) => async (val) => {
        const out = await fn(acc(val), context);
        console.log(
          `-----After Pipe Function #${idx + 1} (${
            fn.name ?? "anonymous"
          })-----`
        );
        console.log(out);
        return out;
      },
      (x) => x
    )(init);
  };
}

export function pipeWithContextDebug(fns) {
  const l = fns.length;

  return (init, context) =>
    fns.reduce(
      (acc, fn, idx) => (val) => {
        console.log(
          `-----Incoming to Pipe Function #${l - idx} (${
            fn.name ?? "anonymous"
          })-----`
        );
        console.log(val);
        const out = fn(acc(val), context);
        console.log(
          `-----Outgoing from Pipe Function #${l - idx} (${
            fn.name ?? "anonymous"
          })-----`
        );
        console.log(out);
        return out;
      },
      (x) => x
    )(init);
}
