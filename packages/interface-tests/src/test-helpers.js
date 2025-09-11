import {
	ExpressionNotSupportedError,
	StoreOperationNotSupportedError,
} from "@data-prism/core";

/**
 * Helper function to test expressions that may not be supported by all stores.
 * If the store throws an ExpressionNotSupportedError, the test is skipped.
 * Otherwise, the test runs normally.
 */
export async function testExpressionOrSkip(testFn) {
	try {
		await testFn();
	} catch (error) {
		if (error instanceof ExpressionNotSupportedError) {
			// Skip this test - the store doesn't support this expression
			console.log(`Skipping test: ${error.message}`);
			return;
		}
		// Re-throw any other errors
		throw error;
	}
}

/**
 * Helper function to test store operations that may not be supported by all stores.
 * If the store throws a StoreOperationNotSupportedError, the test is skipped.
 * Otherwise, the test runs normally.
 */
export async function testOperationOrSkip(testFn) {
	try {
		await testFn();
	} catch (error) {
		if (error instanceof StoreOperationNotSupportedError) {
			// Skip this test - the store doesn't support this operation
			console.log(`Skipping test: ${error.message}`);
			return;
		}
		// Re-throw any other errors
		throw error;
	}
}

/**
 * Check if a store supports a specific operation by attempting to perform it.
 * Returns true if the operation is supported, false if StoreOperationNotSupportedError is thrown.
 * @param {function} createStore - Function to create store instances
 * @param {import('@data-prism/core').Schema} schema - Schema to use for test
 * @param {string} operation - Operation to test ('create', 'update', 'delete')
 * @returns {Promise<boolean>} Whether the operation is supported
 */
export async function checkOperationSupport(createStore, schema, operation) {
	try {
		const testStore = createStore(schema);

		switch (operation) {
			case "create": {
				await testStore.create({
					type: "bears",
					attributes: {
						name: "Test Bear",
						yearIntroduced: 2024,
						bellyBadge: "test badge",
						furColor: "test color",
					},
				});
				break;
			}
			case "update": {
				// First create a resource to update
				const created = await testStore.create({
					type: "bears",
					attributes: {
						name: "Test Bear",
						yearIntroduced: 2024,
						bellyBadge: "test badge",
						furColor: "test color",
					},
				});
				await testStore.update({
					type: "bears",
					id: created.id,
					attributes: {
						name: "Updated Test Bear",
					},
				});
				break;
			}
			case "delete": {
				// First create a resource to delete
				const created = await testStore.create({
					type: "bears",
					attributes: {
						name: "Test Bear",
						yearIntroduced: 2024,
						bellyBadge: "test badge",
						furColor: "test color",
					},
				});
				await testStore.delete({
					type: "bears",
					id: created.id,
				});
				break;
			}
			case "upsert": {
				await testStore.upsert({
					type: "bears",
					attributes: {
						name: "Test Bear",
						yearIntroduced: 2024,
						bellyBadge: "test badge",
						furColor: "test color",
					},
				});
				break;
			}
			case "merge": {
				await testStore.merge({
					type: "bears",
					attributes: {
						name: "Test Bear",
						yearIntroduced: 2024,
						bellyBadge: "test badge",
						furColor: "test color",
					},
				});
				break;
			}
			default:
				throw new Error(`Unknown operation: ${operation}`);
		}
		return true;
	} catch (error) {
		console.log("error", error);
		if (error instanceof StoreOperationNotSupportedError) {
			return false;
		}
		// Re-throw any other errors (these represent real implementation issues)
		throw error;
	}
}
