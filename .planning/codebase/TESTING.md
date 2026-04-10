# Testing Patterns

**Analysis Date:** 2026-04-10

## Test Framework

### Framework
- No automated test framework configured
- Manual testing via browser interaction

### Assertion Library
- Not applicable (no automated tests)

### Run Commands
```bash
bun run dev              # Run development server
bun run src/index.ts     # Run directly with Bun
```

## Test File Organization

### Location
- No dedicated test directory
- Test files placed alongside implementation when needed:
  - `src/pages/pos-test.js` - Minimal JavaScript test file

### Naming
- Not applicable

### Structure
- Not applicable

## Test Structure

### Suite Organization
- Not applicable

### Patterns
- Not applicable

### Setup/Teardown
- Not applicable

## Mocking

### Framework
- No mocking framework

### Patterns
- Not applicable

### What to Mock
- Not applicable

### What NOT to Mock
- Not applicable

## Fixtures and Factories

### Test Data
- No test data utilities

### Location
- Not applicable

## Coverage

### Requirements
- No coverage requirements enforced

### View Coverage
- Not applicable

## Test Types

### Unit Tests
- Not implemented

### Integration Tests
- Manual API testing via `curl` or Postman

### E2E Tests
- Not implemented
- Manual testing through browser at `http://localhost:3000`

## Manual Testing Notes

### Development Testing Workflow
1. Start development server: `bun run dev`
2. Access application at `http://localhost:3000`
3. Test authentication flow
4. Test POS operations (dine-in, takeaway)
5. Test order creation and payment
6. Check browser console for errors

### Test File: pos-test.js
Location: `src/pages/pos-test.js`

Minimal test file for verifying basic JavaScript functionality:
```javascript
console.log('TEST: Minimal JS loaded');

function startTakeaway() {
  console.log('TEST: startTakeaway called');
  alert('Takeaway works!');
}

function startDineIn() {
  console.log('TEST: startDineIn called');
  alert('Dine-in works!');
}
```

### Manual API Testing
Example curl commands for testing routes:
```bash
# Test orders today
curl http://localhost:3000/api/orders/today

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"tableId": 1, "userId": 1}'

# Get order by ID
curl http://localhost:3000/api/orders/1
```

### Browser-Based Testing
- Use browser developer console for debugging
- Check Network tab for API requests
- Inspect localStorage for cart state
- Use `toast()` function for user feedback testing

### Testing Checklist
- [ ] Login/Authentication works
- [ ] Dashboard loads correctly
- [ ] POS page loads with tables and menus
- [ ] Dine-in order flow works
- [ ] Takeaway order flow works
- [ ] Cart operations (add, remove, quantity) work
- [ ] Payment processing works
- [ ] Receipt generation works
- [ ] Table status updates correctly
- [ ] Error handling displays properly

## Common Patterns

### Async Testing
- Not applicable

### Error Testing
- Manual: Trigger error conditions and verify error messages display

### Console Logging
- Used extensively for debugging
- Example: `console.log('New order response:', data);`

---

*Testing analysis: 2026-04-10*
