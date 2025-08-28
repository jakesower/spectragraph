/**
 * Error thrown when a store does not support a particular expression.
 * This allows stores to explicitly declare unsupported functionality
 * and enables tests to handle these cases gracefully.
 */
export class ExpressionNotSupportedError extends Error {
	/**
	 * @param {string} expression - The expression that is not supported (e.g., "$matchesRegex")
	 * @param {string} storeName - The name of the store that doesn't support the expression
	 * @param {string} [reason] - Optional reason why the expression is not supported
	 */
	constructor(expression, storeName, reason) {
		const message = reason 
			? `Expression ${expression} is not supported by ${storeName}: ${reason}`
			: `Expression ${expression} is not supported by ${storeName}`;
		
		super(message);
		this.name = "ExpressionNotSupportedError";
		this.expression = expression;
		this.storeName = storeName;
		this.reason = reason;
	}
}