"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const utils_1 = require("@polygraph/utils");
// performs a deep clone and ensures all invertable relationships line up
function copyAndClean(schema, data) {
    const copy = utils_1.deepClone;
}
function MemoryStore(schema, { initialData: {} }) {
    // TODO: check data for integrity on init
    let store = utils_1.deepClone(initialData);
    return {
        fetchResource: (type, id) => {
            return store[type][id];
        },
        fetchGraph: () => { },
        create: () => { },
        update: () => { },
        delete: () => { },
        // pg level
        merge: () => { },
        query: () => { },
        replace: () => { },
        // are these relationship methods replaceable with merge/replace above?
        // replaceRelationship({ type: 'bear', id: '1', relationship: 'home', foreignId: '2' })
        // ~equivalent to~
        // replace({ type: 'bear', id: '1' }, { type: 'bears', id: '1', home: '2' })
        // appendRelationships({ type: 'bear', id: '1', relationship: 'powers', foreignIds: ['2'] })
        // ~NOT equivalent to~
        // merge({ type: 'bear', id: '1' }, { type: 'bears', id: '1', powers: ['2'] })
        // it appears that the singular e.g. "replaceRelationship" can go, while "replaceRelationships" should stay,
        // but there's no harm in keeping them all?
        replaceRelationship: () => { },
        replaceRelationships: () => { },
        appendRelationships: () => { },
        deleteRelationship: () => { },
        deleteRelationships: () => { },
    };
}
exports.MemoryStore = MemoryStore;
