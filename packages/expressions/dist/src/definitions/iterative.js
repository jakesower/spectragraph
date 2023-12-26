const $filter = {
    apply: (subexpr, arg, apply) => arg.filter((item) => apply(subexpr, item)),
    controlsEvaluation: true,
};
const $flatMap = {
    apply: (subexpr, arg, apply) => arg.flatMap((item) => apply(subexpr, item)),
    controlsEvaluation: true,
};
const $map = {
    apply: (subexpr, arg, apply) => arg.map((item) => apply(subexpr, item)),
    controlsEvaluation: true,
};
export const iterativeDefinitions = {
    $filter,
    $flatMap,
    $map,
};
// apply: ([items, subexpr], arg) => {
// 	console.log(items, subexpr, arg);
// 	console.log('e', evaluate(items, arg))
// 	evaluate(items, arg).flatMap((item) => evaluate(subexpr, item))
// },
