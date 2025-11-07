# Feature Development Checklist

Quick checklist for implementing and testing new features in AutoCut.

## Before Starting

- [ ] Read relevant sections in `CLAUDE.md`
- [ ] Review existing tests in `tests/` directory
- [ ] Understand how similar features work
- [ ] Check if WebAV Opus patch is applied (Linux/WSL2)

## During Development

### Code Implementation
- [ ] Update state object if needed (`src/app.ts`)
- [ ] Implement feature logic
- [ ] Handle in `renderFrame()` if affects preview
- [ ] Handle in `exportVideo()` if affects export
- [ ] Add proper TypeScript types in `src/types/`
- [ ] Add console logging for debugging (`console.log('[FEATURE]', ...)`)

### Unit Tests
- [ ] Write unit tests in `tests/` directory
- [ ] Test normal cases
- [ ] Test edge cases
- [ ] Test error handling
- [ ] Run tests: `npm test`
- [ ] Verify all 61 unit tests pass

## After Implementation - MANDATORY TESTING

### ✅ Step 1: Unit Tests
```bash
npm test
```
**Expected**: All 61 tests pass
- [ ] All unit tests pass
- [ ] No TypeScript errors
- [ ] No warnings in test output

### ✅ Step 2: E2E Tests
```bash
# Start dev server (terminal 1)
npm run dev

# Run E2E tests (terminal 2)
npm run test:e2e

# OR run all tests at once
npm run test:all
```

**Expected**: All 6 tests pass in ~53 seconds
- [ ] ✅ Application loads
- [ ] ✅ Video upload works
- [ ] ✅ Clip splitting works
- [ ] ✅ Filter application works
- [ ] ✅ Playback speed works
- [ ] ✅ **Export with filters works** (MOST CRITICAL)

### ✅ Step 3: Manual Verification
- [ ] Open app in browser: `http://localhost:8000`
- [ ] Upload a test video
- [ ] Test your new feature manually
- [ ] Verify export still works end-to-end
- [ ] Check browser console for errors
- [ ] Test on different video files if applicable

## If Tests Fail

### Unit Tests Fail
1. Check error message in test output
2. Review test expectations
3. Fix code or update tests
4. Re-run: `npm test`

### E2E Tests Fail
1. Check screenshot in `test-results/` directory
2. Watch video recording of failure
3. Review browser console logs in test output
4. Common issues:
   - [ ] WebAV Opus patch not applied? See `E2E_TESTING.md`
   - [ ] Vite cache issue? Run `rm -rf node_modules/.vite/deps`
   - [ ] Dev server not running? Start `npm run dev`
   - [ ] Port 8000 in use? Run `pkill -f vite`

### Export Test Fails (Most Critical)
If "should export video with filters" fails:
1. Check if Opus patch applied:
   ```bash
   grep 'codec: "opus"' node_modules/@webav/av-cliper/dist/av-cliper.js
   ```
2. If not, apply patch:
   ```bash
   sed -i 's/codec: "aac"/codec: "opus"/g' node_modules/@webav/av-cliper/dist/av-cliper.js
   rm -rf node_modules/.vite/deps
   npm run dev
   ```
3. Re-run tests: `npm run test:e2e`

## Documentation Updates

- [ ] Update `CLAUDE.md` if adding new patterns
- [ ] Update `README.md` if user-facing feature
- [ ] Update `E2E_TESTING.md` if changing test requirements
- [ ] Add comments in code for complex logic
- [ ] Update this checklist if new steps needed

## Before Committing

- [ ] All 67 tests pass (61 unit + 6 E2E)
- [ ] No console errors in browser
- [ ] Code follows existing patterns
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Build works: `npm run build`
- [ ] Documentation updated

## Commit Checklist

```bash
# Verify everything works
npm run typecheck     # TypeScript
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run build         # Production build

# If all pass, commit
git add .
git commit -m "feat: your feature description

- Implementation details
- Tests added/updated
- All 67 tests passing"
```

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run typecheck        # Check TypeScript

# Testing
npm test                 # Unit tests (61)
npm run test:watch       # Unit tests in watch mode
npm run test:e2e         # E2E tests (6)
npm run test:all         # All tests (67)

# Troubleshooting
rm -rf node_modules/.vite/deps  # Clear Vite cache
pkill -f vite                    # Kill dev server
grep opus node_modules/@webav/av-cliper/dist/av-cliper.js  # Check patch

# Apply Opus patch (Linux/WSL2)
sed -i 's/codec: "aac"/codec: "opus"/g' node_modules/@webav/av-cliper/dist/av-cliper.js
```

## Success Criteria

Your feature is complete when:
1. ✅ Feature works as intended
2. ✅ All 61 unit tests pass
3. ✅ All 6 E2E tests pass
4. ✅ Export test specifically passes (most critical)
5. ✅ No console errors
6. ✅ TypeScript compiles without errors
7. ✅ Documentation updated
8. ✅ Code committed

## Resources

- **Developer Guide**: [CLAUDE.md](./CLAUDE.md)
- **E2E Testing**: [E2E_TESTING.md](./E2E_TESTING.md)
- **Test Summary**: [TESTING_SUMMARY.md](./TESTING_SUMMARY.md)
- **Main README**: [README.md](./README.md)

---

**Remember**: If E2E tests fail, the feature is NOT complete!

The export test is the most critical - it verifies that the entire video editing pipeline works correctly with audio, filters, and codec compatibility.

**Never skip E2E tests!** They catch issues that unit tests miss.
