module.exports = {
	env: {
		es2022: true,
		node: true,
	},
	plugins: ["@typescript-eslint"],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"prettier",
	],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: 12,
		sourceType: "module",
	},
	root: true,
	rules: {
		"array-callback-return": ["error"],
		"comma-dangle": [
			2,
			{
				arrays: "always-multiline",
				objects: "always-multiline",
				imports: "always-multiline",
				exports: "always-multiline",
				functions: "always-multiline",
			},
		],
		curly: ["error", "multi-line"],
		eqeqeq: ["error", "always", { null: "ignore" }],
		"func-names": "off",
		"function-paren-newline": "off",
		"import/prefer-default-export": "off",
		indent: [
			"error",
			"tab",
			{
				flatTernaryExpressions: false,
			},
		],
		"max-classes-per-file": "off",
		"max-len": [
			"error",
			{
				code: 90,
				comments: 125,
				ignoreStrings: true,
				ignoreTemplateLiterals: true,
				tabWidth: 2,
			},
		],
		"no-nested-ternary": "off",
		"no-param-reassign": "error",
		"no-use-before-define": ["error", { functions: false }],
		"prefer-destructuring": ["warn", { array: false, object: true }],
		"object-curly-spacing": ["error", "always"],
		quotes: ["error", "double", { avoidEscape: true }],
		semi: ["error", "always"],
		// "sort-imports": ["error", {
		//   allowSeparatedGroups: true,
		//   ignoreCase: true,
		//   // memberSyntaxOrder: false,
		// }],
		"sort-vars": "error",
	},
	settings: {},
};
