# ADR 001: Clean Architecture

**Status:** Accepted  
**Date:** 2026-04-14  
**Deciders:** Development Team  
**Technical Story:** Refactor codebase to improve maintainability

---

## Context and Problem Statement

The codebase had grown significantly with a flat structure where all files were mixed together at the top level:

```
src/
├── db/
├── middleware/
├── pages/
├── repositories/
├── routes/
├── services/
├── utils/
├── websocket/
└── ...
```

This structure led to:
- **Unclear boundaries** - Where does business logic belong?
- **Import chaos** - `../../../` relative imports everywhere
- **Difficult testing** - Hard to mock dependencies
- **Tight coupling** - Business logic mixed with framework code

We needed a structure that:
1. Separates concerns clearly
2. Makes dependencies explicit
3. Enables independent testing
4. Scales as the project grows

---

## Decision Drivers

1. **Maintainability** - Code should be easy to understand and modify
2. **Testability** - Business logic should be testable without external dependencies
3. **Scalability** - Structure should support growth
4. **Developer Experience** - Clear conventions reduce cognitive load
5. **Industry Standards** - Follow proven patterns

---

## Considered Options

### Option 1: Keep Current Structure

**Description:** Continue with flat structure, just organize better

**Pros:**
- No migration effort
- Developers already familiar

**Cons:**
- Doesn't solve core issues
- Will get worse as codebase grows
- No clear guidance for new developers

**Verdict:** ❌ Rejected - Doesn't address root problems

---

### Option 2: MVC (Model-View-Controller)

**Description:** Traditional MVC pattern

**Pros:**
- Well-known pattern
- Clear separation of concerns

**Cons:**
- Models often become too large
- Controller logic hard to test
- Database concerns leak into models

**Verdict:** ❌ Rejected - Doesn't provide enough separation

---

### Option 3: Layered Architecture

**Description:** Layers: Presentation → Business → Data Access

**Pros:**
- Clear layers
- Better than flat structure

**Cons:**
- Business logic still coupled to data access
- Hard to swap implementations
- Dependencies can leak upward

**Verdict:** ❌ Rejected - Not enough separation of concerns

---

### Option 4: Clean Architecture (Selected) ✅

**Description:** Uncle Bob's Clean Architecture with dependency rule

**Pros:**
- **Independent of frameworks** - Business logic doesn't depend on Express/Elysia
- **Testable** - Domain layer can be tested without database
- **Independent of UI** - API can change without touching business logic
- **Independent of database** - Can switch from MySQL to PostgreSQL easily
- **Dependency rule** - Dependencies only point inward

**Cons:**
- Learning curve for team
- More directories to navigate
- Initial migration effort

**Verdict:** ✅ **Accepted** - Best long-term solution

---

## Decision

**Adopt Clean Architecture with 4 layers:**

1. **API Layer** (Presentation) - Routes, middleware, pages
2. **Domain Layer** (Business Logic) - Entities, repositories, services
3. **Infrastructure Layer** (External) - Database, WebSocket, email
4. **Shared Layer** (Utilities) - Utils, templates

**Key Principle:** Dependencies only flow inward. Outer layers depend on inner layers, never the reverse.

---

## Implementation

### Phase 1: Infrastructure Layer
- Move `src/db/` → `src/infrastructure/database/`
- Move `src/websocket/` → `src/infrastructure/websocket/`

### Phase 2: Domain Layer
- Move `src/repositories/` → `src/domain/repositories/`
- Move `src/services/` → `src/domain/services/`
- Move `src/schemas/` → `src/domain/schemas/`

### Phase 3: API Layer
- Move `src/routes/` → `src/api/routes/`
- Move `src/middleware/` → `src/api/middleware/`
- Move `src/pages/` → `src/api/pages/`

### Phase 4: Shared Layer
- Move `src/utils/` → `src/shared/utils/`
- Move `src/templates/` → `src/shared/templates/`

### Phase 5: Configuration
- Configure path aliases in tsconfig.json
- Create barrel exports (index.ts)
- Update all imports

---

## Consequences

### Positive

1. **Clear Boundaries** - Each layer has a specific purpose
2. **Testable** - Domain logic can be unit tested without database
3. **Maintainable** - Easier to understand and modify
4. **Scalable** - New features fit into clear structure
5. **Framework Independent** - Could switch from Elysia to Express without touching domain
6. **Database Independent** - Could switch from MySQL to PostgreSQL

### Negative

1. **Learning Curve** - Team needs to understand the structure
2. **More Files** - More directories to navigate
3. **Import Updates** - All imports needed updating (completed in Phase 16)
4. **Documentation** - Need to document the architecture (this ADR!)

### Neutral

- **More Imports** - Using barrel exports mitigates this
- **Boilerplate** - Some repetition in directory structure

---

## Lessons Learned

1. **Incremental migration works** - Did it in 5 waves, tested after each
2. **Path aliases help** - `@/domain/repositories` is cleaner than `../../domain/repositories`
3. **Barrel exports are essential** - Without them, imports become unwieldy
4. **Document early** - Should have had this ADR before starting

---

## Status

**Implemented:** Phase 16 (v2.2 milestone)  
**Status:** Complete and verified  
**Team Adoption:** In progress - developers learning new structure

---

## References

- [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md)

---

## Related Decisions

- **ADR-002: Path Aliases** - To be written
- **ADR-003: Barrel Exports** - To be written
