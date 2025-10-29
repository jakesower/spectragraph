import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";

export default [
	js.configs.recommended,
	prettier,
	{
		plugins: {
			import: importPlugin,
		},
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				clearTimeout: "readonly",
				console: "readonly",
				crypto: "readonly",
				process: "readonly",
				Buffer: "readonly",
				URL: "readonly",
				URLSearchParams: "readonly",
				Headers: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				fetch: "readonly",
				global: "readonly",
				setTimeout: "readonly",
				structuredClone: "readonly",
			},
		},
		rules: {
			"array-callback-return": ["error"],
			"comma-dangle": [
				"error",
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
			"max-classes-per-file": "off",
			"max-len": [
				"error",
				{
					code: 90,
					comments: 125,
					ignorePattern: "^\\s*\\*",
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
			"sort-vars": "error",
			"import/order": [
				"error",
				{
					groups: [
						"builtin",
						"external",
						"internal",
						"parent",
						"sibling",
						"index",
					],
					"newlines-between": "never",
				},
			],
		},
	},
	{
		files: ["**/test/**/*.js"],
		languageOptions: {
			globals: {
				describe: "readonly",
				it: "readonly",
				expect: "readonly",
				beforeEach: "readonly",
				afterEach: "readonly",
				beforeAll: "readonly",
				afterAll: "readonly",
				vi: "readonly",
			},
		},
	},
];
