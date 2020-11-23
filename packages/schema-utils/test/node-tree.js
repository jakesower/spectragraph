const { expandSchema } = require('../src');

module.exports = expandSchema({
  resources: {
    applications: {
      attributes: {
        appSettingsVersion: {
          type: {
            live: { type: 'number' },
            staging: { type: 'number' },
          },
        },
        channel: { type: 'string' },
        content: { type: 'string' },
        deleted: { type: 'boolean' },
        description: { type: 'string' },
        isGeoExpanded: { type: 'boolean' },
        lastPublished: { type: 'date' },
        lastPublishedBy: { type: 'string' },
        locale: { type: 'string' },
        name: { type: 'string' },
        owners: {
          type: [
            {
              businessUnit: { type: 'string' },
              name: { type: 'string' },
            },
          ],
        },
        productOwner: { type: 'string' },
        sdpIsEnabled: { type: 'boolean' },
        // updateLive: {
        //     error: { type: "string" },
        //     running: { type: "boolean" },
        // },
      },
      relationships: {
        nodes: {
          cardinality: 'many',
          inverse: 'application',
          keyField: null,
          type: 'nodes',
        },
        rootNodes: {
          cardinality: 'many',
          inverse: 'application',
          keyField: null,
          type: 'nodes',
        },
        trees: {
          cardinality: 'many',
          inverse: 'application',
          keyField: null,
          type: 'trees',
        },
      },
      singular: 'application',
    },
    nodes: {
      attributes: {
        // actions: { type: [] },
        // apiDetails: {
        //     ref: { type: "string" },
        //     synced: { type: "boolean" },
        //     type: {
        //         api: { type: "string" },
        //         params: {
        //             type: [{
        //                 field: { type: "string" },
        //                 source: { type: "string" },
        //                 value: { type: "string" },
        //             }],
        //         },
        //     },
        // },
        deleted: { type: 'boolean' },
        ref: { type: 'string' },
        variant: { type: 'string' },
      },
      relationships: {
        application: {
          cardinality: 'one',
          inverses: ['nodes', 'rootNodes'],
          type: 'applications',
        },
        tree: {
          cardinality: 'one',
          inverses: ['nodes', 'rootNode'],
          type: 'trees',
        },
      },
    },
    trees: {
      attributes: {
        // coreDetails: {
        //     lastPublished: { type: "date" },
        //     lastPublishedBy: { type: "string" },
        //     liveVersion: { type: "number" },
        //     stagingVersion: { type: "number" },
        //     status: { type: "string" },
        //     updatedAt: { type: "date" },
        //     updatedBy: { type: "string" },
        //     updateErrors: { type: "string" },
        // },
        isSnippet: { type: 'boolean' },
        // variants: [
        //     {
        //     },
        // ],
      },
      relationships: {
        application: {
          cardinality: 'one',
          inverse: 'trees',
          keyField: 'application',
          type: 'applications',
        },
        nodes: {
          cardinality: 'many',
          inverse: 'tree',
          keyField: null,
          type: 'nodes',
        },
        rootNode: {
          cardinality: 'one',
          inverse: 'tree',
          keyField: null,
          type: 'nodes',
        },
      },
      singular: 'tree',
    },
  },
});
