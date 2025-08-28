/**
 * Creates database operations interface for PostgreSQL
 * @param {Object} db - PostgreSQL database connection
 * @returns {Object} Database operations interface
 */
export function createPostgreSQLOperations(db) {
	return {
		/**
		 * Clear foreign key references
		 * @param {string} table - Target table name
		 * @param {string} column - Foreign key column name
		 * @param {string} id - ID to clear
		 * @returns {Promise<void>}
		 */
		async clearForeignKey(table, column, id) {
			await db.query(
				`UPDATE ${table} SET ${column} = NULL WHERE ${column} = $1`,
				[id],
			);
		},

		/**
		 * Update foreign key reference
		 * @param {string} table - Target table name
		 * @param {string} column - Foreign key column name
		 * @param {string} resourceId - Resource ID to set
		 * @param {string} idAttribute - ID attribute name
		 * @param {string} targetId - Target record ID
		 * @returns {Promise<void>}
		 */
		async updateForeignKey(table, column, resourceId, idAttribute, targetId) {
			await db.query(
				`UPDATE ${table} SET ${column} = $1 WHERE ${idAttribute} = $2`,
				[resourceId, targetId],
			);
		},

		/**
		 * Insert many-to-many relationship
		 * @param {string} table - Join table name
		 * @param {string} localColumn - Local column name
		 * @param {string} foreignColumn - Foreign column name
		 * @param {string} localId - Local ID
		 * @param {string} foreignId - Foreign ID
		 * @returns {Promise<void>}
		 */
		async insertManyToMany(
			table,
			localColumn,
			foreignColumn,
			localId,
			foreignId,
		) {
			await db.query(
				`INSERT INTO ${table} (${localColumn}, ${foreignColumn}) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
				[localId, foreignId],
			);
		},

		/**
		 * Delete many-to-many relationships
		 * @param {string} table - Join table name
		 * @param {string} column - Column to match
		 * @param {string} id - ID to match
		 * @returns {Promise<void>}
		 */
		async deleteManyToMany(table, column, id) {
			await db.query(`DELETE FROM ${table} WHERE ${column} = $1`, [id]);
		},
	};
}
