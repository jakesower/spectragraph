/**
 * Creates database operations interface for SQLite
 * @param {Object} db - SQLite database connection
 * @returns {Object} Database operations interface
 */
export function createSQLiteOperations(db) {
	return {
		/**
		 * Clear foreign key references
		 * @param {string} table - Target table name
		 * @param {string} column - Foreign key column name
		 * @param {string} id - ID to clear
		 */
		clearForeignKey(table, column, id) {
			const clearSql = `UPDATE ${table} SET ${column} = NULL WHERE ${column} = ?`;
			const clearStmt = db.prepare(clearSql);
			clearStmt.run(id);
		},

		/**
		 * Update foreign key reference
		 * @param {string} table - Target table name
		 * @param {string} column - Foreign key column name
		 * @param {string} resourceId - Resource ID to set
		 * @param {string} idAttribute - ID attribute name
		 * @param {string} targetId - Target record ID
		 */
		updateForeignKey(table, column, resourceId, idAttribute, targetId) {
			const updateSql = `UPDATE ${table} SET ${column} = ? WHERE ${idAttribute} = ?`;
			const updateStmt = db.prepare(updateSql);
			updateStmt.run(resourceId, targetId);
		},

		/**
		 * Insert many-to-many relationship
		 * @param {string} table - Join table name
		 * @param {string} localColumn - Local column name
		 * @param {string} foreignColumn - Foreign column name
		 * @param {string} localId - Local ID
		 * @param {string} foreignId - Foreign ID
		 */
		insertManyToMany(table, localColumn, foreignColumn, localId, foreignId) {
			const insertSql = `INSERT OR IGNORE INTO ${table} (${localColumn}, ${foreignColumn}) VALUES (?, ?)`;
			const insertStmt = db.prepare(insertSql);
			insertStmt.run(localId, foreignId);
		},

		/**
		 * Delete many-to-many relationships
		 * @param {string} table - Join table name
		 * @param {string} column - Column to match
		 * @param {string} id - ID to match
		 */
		deleteManyToMany(table, column, id) {
			const deleteSql = `DELETE FROM ${table} WHERE ${column} = ?`;
			const deleteStmt = db.prepare(deleteSql);
			deleteStmt.run(id);
		},
	};
}
