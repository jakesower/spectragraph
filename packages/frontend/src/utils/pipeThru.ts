type AnyFunc = (...arg: any) => any;

// type LastFnReturnType<F extends Array<UnaryFunc>, Else = never> = F extends []

// type PipeArgs<F extends UnaryFunc[], Acc extends UnaryFunc[] = []> = F extends [
// 	(arg: infer A) => infer B,
// ]
// 	? [...Acc, (arg: A) => B]
// 	: F extends [(arg: infer A) => any, ...infer Tail]
// 	? Tail extends [(arg: infer B) => any, ...any[]]
// 		? PipeArgs<Tail, [...Acc, (args: A) => B]>
// 		: Acc
// 	: Acc;

// export function pipe<F extends [UnaryFunc, UnaryFunc[]]>(
// 	fns: PipeArgs<F> extends F ? F : PipeArgs<F>,
// ): LastReturnType<F, ReturnType< {
// 	return (fns as UnaryFunc[]).reduce(
// 		(acc, fn) => fn(acc),
// 		(arg) => arg,
// 	);
// }

// export function pipeThru<T, U>(init: T, fns): U {}

type LastFnReturnType<F extends Array<AnyFunc>, Else = never> = F extends [
	...any[],
	(...arg: any) => infer R,
]
	? R
	: Else;

type PipeArgs<F extends AnyFunc[], Acc extends AnyFunc[] = []> = F extends [
	(...args: infer A) => infer B,
]
	? [...Acc, (...args: A) => B]
	: F extends [(...args: infer A) => any, ...infer Tail]
	? Tail extends [(arg: infer B) => any, ...any[]]
		? PipeArgs<Tail, [...Acc, (...args: A) => B]>
		: Acc
	: Acc;

export function pipe<FirstFn extends AnyFunc, F extends AnyFunc[]>(
	arg: Parameters<FirstFn>[0],
	firstFn: FirstFn,
	...fns: PipeArgs<F> extends F ? F : PipeArgs<F>
): LastFnReturnType<F, ReturnType<FirstFn>> {
	return (fns as AnyFunc[]).reduce((acc, fn) => fn(acc), firstFn(arg));
}
