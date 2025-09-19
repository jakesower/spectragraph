/**
 * Example: Replicating Redzone-Store's Exposures API Pattern
 * 
 * This example shows how to exactly replicate the redzone-store exposures-api.js
 * caching pattern using manual cache mode in multi-api-store.
 */

import { createMultiApiStore } from '../src/multi-api-store.js';

// Simplified schema
const schema = {
  resources: {
    exposures: {
      idAttribute: 'id',
      attributes: {
        id: { type: 'string' },
        fireId: { type: 'string' },
        organizationId: { type: 'string' },
        assetExposures: { type: 'array' }
      },
      relationships: {
        fire: { type: 'fires', cardinality: 'one' },
        organization: { type: 'organizations', cardinality: 'one' }
      }
    }
  }
};

// Mock transport function
const perilExposureServiceTransport = {
  getData: async (url) => {
    // Simulate different responses for different orgs
    if (url.includes('/organizations/org1/exposures')) {
      return {
        exposures: [
          {
            fire_id: 'fire123',
            organization_id: 'org1',
            asset_exposures: [
              {
                asset: { id: 'asset1', address: '123 Main St' }
              }
            ]
          }
        ]
      };
    }
    
    if (url.includes('/organizations/org2/exposures')) {
      return {
        exposures: [
          {
            fire_id: 'fire456',
            organization_id: 'org2', 
            asset_exposures: [
              {
                asset: { id: 'asset2', address: '456 Oak Ave' }
              }
            ]
          }
        ]
      };
    }
    
    return { exposures: [] };
  }
};

// Helper function to camelize object keys (simplified)
const camelizeObjectKeys = (obj) => {
  if (Array.isArray(obj)) return obj.map(camelizeObjectKeys);
  if (obj === null || typeof obj !== 'object') return obj;
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = camelizeObjectKeys(value);
  }
  return result;
};

const config = {
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
  },
  resources: {
    exposures: {
      // Enable manual caching - handler controls all caching decisions
      cache: { manual: true },
      
      // Exact replication of redzone-store exposures-api.js
      query: async (query, context) => {
        const { organizationIds = [], withCache } = context;

        // This is the EXACT pattern from redzone-store exposures-api.js
        const exposuresByOrg = await Promise.all(
          organizationIds.map((orgId) =>
            withCache(`allExposures-${orgId}`, async () => {
              const { exposures } = await perilExposureServiceTransport.getData(
                `/organizations/${orgId}/exposures`,
              );

              return exposures.map((exposure) =>
                camelizeObjectKeys({
                  ...exposure,
                  id: `${exposure.fire_id}__${exposure.organization_id}`,
                  fire: { type: 'fires', id: exposure.fire_id },
                  organization: { type: 'organizations', id: exposure.organization_id },
                  assetExposures: exposure.asset_exposures.map((assetExposure) =>
                    camelizeObjectKeys({
                      ...assetExposure,
                      id: `ae-${assetExposure.asset.id}`,
                      asset: camelizeObjectKeys({
                        ...assetExposure.asset,
                        organization: { type: 'organizations', id: orgId },
                      }),
                    }),
                  ),
                }),
              );
            }),
          ),
        );

        return exposuresByOrg.flat();
      }
    }
  }
};

// Create the store
const store = createMultiApiStore(schema, config);

// Usage example
async function demonstrateExposuresPattern() {
  console.log('=== Multi-API Store Manual Cache Demo ===\n');

  // First query - will fetch from both orgs and cache each separately
  console.log('1. First query (will fetch and cache per org):');
  const exposures1 = await store.query(
    { type: 'exposures', select: ['id', 'fireId'] },
    { organizationIds: ['org1', 'org2'] }
  );
  console.log(`   Found ${exposures1.length} exposures`);
  console.log(`   Cache keys: allExposures-org1, allExposures-org2\n`);

  // Second query with same orgs - will use cache
  console.log('2. Second query with same orgs (will use cache):');
  const exposures2 = await store.query(
    { type: 'exposures', select: ['id', 'fireId'] },
    { organizationIds: ['org1', 'org2'] }
  );
  console.log(`   Found ${exposures2.length} exposures (from cache)\n`);

  // Query with only org1 - will use cached org1 data
  console.log('3. Query with only org1 (will use cached data):');
  const exposures3 = await store.query(
    { type: 'exposures', select: ['id', 'fireId'] },
    { organizationIds: ['org1'] }
  );
  console.log(`   Found ${exposures3.length} exposures (org1 from cache)\n`);

  // Query with org3 - will fetch new data and cache it
  console.log('4. Query with new org3 (will fetch and cache):');
  const exposures4 = await store.query(
    { type: 'exposures', select: ['id', 'fireId'] },
    { organizationIds: ['org3'] }
  );
  console.log(`   Found ${exposures4.length} exposures`);
  console.log(`   New cache key: allExposures-org3\n`);

  console.log('=== Cache Benefits ===');
  console.log('✅ Per-organization caching (fine-grained)');
  console.log('✅ Exact redzone-store behavior replication');
  console.log('✅ Multiple cache operations per query');
  console.log('✅ Handler controls all caching decisions');
  console.log('✅ Mixed automatic/manual caching in same store');
}

// Export for use
export { store, config, schema, demonstrateExposuresPattern };