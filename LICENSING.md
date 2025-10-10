# SpectraGraph Licensing Guide

## Philosophy

SpectraGraph is AGPL-3.0 to ensure improvements to the core library benefit everyone. The architecture is designed so you can build proprietary software **on top of** SpectraGraph without triggering copyleft obligations.

## Why AGPL?

AGPL ensures that if you improve SpectraGraph itself and distribute those improvements (including via network services), you share those improvements back with the community. This creates a sustainable ecosystem where:

1. **You benefit** from community improvements to the core library
2. **The community benefits** from your improvements to the core library
3. **Everyone builds freely** on top of the stable, open foundation

The license is specifically chosen to allow companies to use SpectraGraph for internal projects while maintaining the open-source ethos.

**A personal note from the author:** AGPL enables a model where I can work on SpectraGraph during my day job for features that directly benefit my employer, while ensuring that _both_ my employer _and_ the community gain value from that work. My employer gets the functionality they need, and I build a sustainable open-source project that benefits my career and the broader community. This alignment of incentives has been crucial to SpectraGraph's development and quality.

## Common Scenarios

### ✅ Using SpectraGraph (No Copyleft Obligations)

#### Building a Custom Store

```javascript
// my-company-store/index.js (PROPRIETARY - totally fine)
import { validateQuery, normalizeQuery } from "@spectragraph/core";

export function createCompanyStore(schema, config) {
  return {
    query: async (q) => {
      validateQuery(schema, q);
      // your proprietary query logic here
      // connect to your internal systems, etc.
    },
    create: async (resource) => {
      /* ... */
    },
    update: async (resource) => {
      /* ... */
    },
    delete: async (resource) => {
      /* ... */
    },
  };
}
```

**Status:** No copyleft triggered. Your store is independent work that imports SpectraGraph as a library.

#### Using in a Commercial Application

```javascript
// app.js (PROPRIETARY - totally fine)
import { createMemoryStore } from "@spectragraph/memory-store";
import { createPostgresStore } from "@spectragraph/postgres-store";

const store = createPostgresStore(schema, pgConfig);

// Build your commercial SaaS product
// Charge customers
// Keep your application code proprietary
```

**Status:** No copyleft triggered. You're using SpectraGraph as a dependency, like using React or Express.

#### Internal Company Tools

```javascript
// internal-api/index.js (PROPRIETARY - totally fine)
import { createMultiApiStore } from "@spectragraph/multi-api-store";

// Wrapper for internal use
export const companyAPI = createMultiApiStore(internalSchema, {
  // Your proprietary configuration
  // Connect to internal databases, APIs, etc.
});
```

**Status:** No copyleft triggered. Internal tools don't constitute "distribution."

#### Building a Database Product

```javascript
// my-database-product/index.js (PROPRIETARY - totally fine)
import { createMemoryStore } from "@spectragraph/memory-store";

class MyProprietaryDatabase {
  constructor() {
    this.store = createMemoryStore(schema, data);
    // Your proprietary optimizations, caching, clustering, etc.
  }

  // Your proprietary API
  async query(sql) {
    /* convert SQL to SpectraGraph queries */
  }
}
```

**Status:** No copyleft triggered as long as you're not modifying SpectraGraph's source code.

### ⚠️ Modifications That Trigger AGPL

#### Patching Core Internals

```javascript
// BAD: forking @spectragraph/core/src/query.js to change validation logic
// If you distribute this modified version (including as a network service),
// you must open source your modifications under AGPL-3.0
```

**Better approach:** Open an issue or PR! Share your improvements with the community and everyone benefits.

#### Forking a Store Implementation

```javascript
// CAREFUL: copying @spectragraph/postgres-store and modifying it
// Distribution of modified versions requires AGPL compliance
```

**Better approach:** Extend via composition or contribute enhancements upstream.

### Commercial Licensing Available

If your organization needs:

- **Warranty and indemnification** beyond AGPL terms
- **Patent grants** with explicit coverage
- **Written confirmation** that your use case doesn't trigger copyleft
- **Legal CYA** for risk-averse procurement and legal departments
- **Priority support** or custom store development

**Commercial licenses are available.**

Contact: jake@jakesower.com

**Pricing philosophy:** Reasonable rates aimed at enterprises with legal/compliance requirements, not at startups or individual developers. If you can use the AGPL version, please do. I want your adoption and contributions, not your money.

## Frequently Asked Questions

### Q: Can I build a proprietary database product using SpectraGraph?

**A:** Yes, absolutely. As long as you're using SpectraGraph as a library dependency and not modifying its source code, you can build any commercial product on top of it. Your database product's code remains proprietary.

### Q: My company's lawyers are scared of AGPL. What do I tell them?

**A:** "We're using it as an unmodified library dependency, not modifying SpectraGraph's source code. This is like using Linux via AWS. The AGPL covers the library itself, not applications built on it."

If that doesn't satisfy your legal team, commercial licenses are available specifically for this situation.

### Q: What if I want to contribute improvements to SpectraGraph?

**A:** Please do! Pull requests are welcome. Contributions will be licensed under AGPL-3.0 to maintain consistency with the project. This ensures everyone benefits from improvements.

### Q: Can I fork SpectraGraph for internal company use without distributing it?

**A:** Yes. AGPL's copyleft only triggers on distribution (including providing network services). Internal forks for internal company use don't require source disclosure. However, contributing improvements back helps everyone, including future-you.

### Q: What constitutes "distribution" under AGPL?

**A:** Distribution includes:

- Publishing modified versions to npm or other package registries
- Providing network services to external users using modified SpectraGraph
- Embedding modified SpectraGraph in software you sell or give away

Distribution does NOT include:

- Internal company use
- Using unmodified SpectraGraph in your commercial products

See the [full AGPL-3.0 license text](https://www.gnu.org/licenses/agpl-3.0.en.html) for precise legal definitions.

### Q: Will you re-license SpectraGraph to MIT or Apache 2.0?

**A:** No. AGPL ensures that improvements to the core library flow back to the community, creating a sustainable ecosystem. However, the architecture is specifically designed to minimize copyleft friction. You can build proprietary software on top without legal concerns.

For organizations that need different terms, commercial licenses are available.

### Q: What about patents?

**A:** AGPL-3.0 includes patent grant provisions. If you need additional patent coverage or indemnification, commercial licenses can provide that.

### Q: I found a bug/optimization. Do I have to share it?

**A:** Only if you distribute your modified version. But please do share! Bug fixes and optimizations help everyone, including your future self when you upgrade. Open a GitHub issue or PR.

### Q: Can I use SpectraGraph in a government project?

**A:** AGPL doesn't restrict use cases. However, if your project requires specific compliance certifications, warranties, or export controls, contact me about commercial licensing terms.

## Resources

- [AGPL-3.0 Full License Text](https://www.gnu.org/licenses/agpl-3.0.en.html)
- [FSF's AGPL-3.0 FAQ](https://www.gnu.org/licenses/gpl-faq.html#AGPLv3)
- [SpectraGraph GitHub Issues](https://github.com/jakesower/spectragraph/issues) - for questions about licensing scenarios
- Commercial Licensing: jake@jakesower.com
