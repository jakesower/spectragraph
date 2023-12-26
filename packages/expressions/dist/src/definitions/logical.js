const $and = {
    name: "and",
    apply: (params, arg, apply) => params.every((subexpr) => apply(subexpr, arg)),
    controlsEvaluation: true,
    evaluate: (params) => params.every(Boolean),
    schema: {
        type: "boolean",
    },
};
const $or = {
    name: "or",
    apply: (params, arg, apply) => params.some((subexpr) => apply(subexpr, arg)),
    controlsEvaluation: true,
    evaluate: (params) => params.some(Boolean),
    schema: {
        type: "boolean",
    },
};
const $not = {
    name: "not",
    apply: (subexpr, arg, apply) => !apply(subexpr, arg),
    controlsEvaluation: true,
    schema: { type: "boolean" },
};
export const logicalDefinitions = {
    $and,
    $not,
    $or,
};
