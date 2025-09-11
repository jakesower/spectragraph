/**
 * Example: Per-Resource Cache Key Generation
 * 
 * This example shows how to replicate redzone-store's caching patterns
 * using per-resource cache key generators in multi-api-store.
 */

import { createMultiApiStore } from '../src/multi-api-store.js';

// Example schema (simplified)
const schema = {
  resources: {
    organizations: {
      idAttribute: 'id',
      attributes: { id: { type: 'string' }, name: { type: 'string' } },
      relationships: {}
    },
    fires: {
      idAttribute: 'id', 
      attributes: { id: { type: 'string' }, name: { type: 'string' } },
      relationships: {}
    },
    fireUpdates: {
      idAttribute: 'id',
      attributes: { id: { type: 'string' }, content: { type: 'string' } },
      relationships: {
        fire: { type: 'fires', cardinality: 'one', inverse: 'fireUpdates' }
      }
    },
    assets: {
      idAttribute: 'id',
      attributes: { id: { type: 'string' }, address: { type: 'string' } },
      relationships: {}
    },
    exposures: {
      idAttribute: 'id',
      attributes: { id: { type: 'string' } },
      relationships: {}
    }
  }
};

// Example: Replicating redzone-store caching patterns
const config = {
  cache: {
    enabled: true,
    defaultTTL: 5 * 60 * 1000, // 5 minutes default
  },
  resources: {
    // Simple collection caching (like organizations-api.js)
    organizations: {
      get: async () => {
        const response = await fetch('/api/organizations');
        return response.json();
      },
      cacheKeyGenerator: () => 'organizations', // Simple static key
    },

    // Collection caching with data transformation (like fires-api.js)  
    fires: {
      get: async () => {
        const response = await fetch('/api/fires');
        const data = await response.json();
        return data.fires.map(fire => ({ ...fire, transformed: true }));
      },
      cacheKeyGenerator: () => 'fires', // Cache the transformed result
    },

    // Individual resource caching (like assets-api.js)
    assets: {
      get: async (query, context) => {
        if (!query.id) {
          throw new Error('Assets can only be loaded by ID');
        }
        
        const { organizationIds } = context;
        // Try multiple orgs to find the asset
        for (const orgId of organizationIds) {
          try {
            const response = await fetch(`/api/organizations/${orgId}/assets/${query.id}`);
            return await response.json();
          } catch (err) {
            if (err.status === 404) continue;
            throw err;
          }
        }
        return null;
      },
      cacheKeyGenerator: (query) => `asset-${query.id}`, // Per-asset caching
    },

    // Parent-context caching (like fire-updates-api.js)
    fireUpdates: {
      get: async (query, context) => {
        const fireId = context.parentQuery.id;
        const response = await fetch(`/api/fires/${fireId}/fire-updates`);
        return response.json();
      },
      cacheKeyGenerator: (query, context) => `fireUpdates-${context.parentQuery.id}`,
    },

    // Organization-scoped caching (like exposures-api.js)
    exposures: {
      get: async (query, context) => {
        const { organizationIds = [] } = context;
        const exposuresByOrg = await Promise.all(
          organizationIds.map(async (orgId) => {
            const response = await fetch(`/api/organizations/${orgId}/exposures`);
            return response.json();
          })
        );
        return exposuresByOrg.flat();
      },
      cacheKeyGenerator: (query, context) => {
        // Cache per organization (first org ID for simplicity)
        const orgId = context.organizationIds?.[0];
        return orgId ? `allExposures-${orgId}` : 'exposures-default';
      },
    },
  },

  // Special handlers can also define their own caching patterns
  specialHandlers: [
    {
      test: (query, context) => 
        query.type === 'exposures' && 
        context.organizationIds?.length > 1,
      handler: async (query, context) => {
        // Custom handler with its own caching logic
        // withCache will use the exposures cacheKeyGenerator defined above
        const { withCache } = context;
        return withCache(query, async () => {
          // Multi-org exposure loading logic
          return [];
        }, { context });
      }
    }
  ]
};

// Create the store
const store = createMultiApiStore(schema, config);

// Usage examples:

// 1. Simple collection caching
// Cache key: "organizations"
const orgs = await store.query({ type: 'organizations', select: ['name'] });

// 2. Individual resource caching  
// Cache key: "asset-12345"
const asset = await store.query({ 
  type: 'assets', 
  id: '12345', 
  select: ['address'] 
});

// 3. Parent-context caching
// Cache key: "fireUpdates-fire456"  
const fireUpdates = await store.query({
  type: 'fires',
  id: 'fire456', 
  select: ['name', { fireUpdates: { select: ['content'] } }]
});

// 4. Organization-scoped caching
// Cache key: "allExposures-org789"
const exposures = await store.query(
  { type: 'exposures', select: ['id'] },
  { organizationIds: ['org789'] }
);

export { store, config, schema };