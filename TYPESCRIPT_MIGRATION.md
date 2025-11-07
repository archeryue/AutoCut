# TypeScript Migration - AutoCut v2.0

## Overview
AutoCut has been successfully migrated from JavaScript to TypeScript for better type safety, IDE support, and maintainability as the project scales.

## Changes Made

### Project Structure
```
AutoCut/
├── src/
│   ├── app.ts                 # Main application (converted from js/app.js)
│   └── types/
│       ├── app.ts             # Application-specific types
│       └── webav.d.ts         # WebAV library type definitions
├── tests/                     # All tests converted to TypeScript
│   ├── setup.ts
│   ├── mocks/
│   │   └── webav.ts
│   ├── *.test.ts              # All test files
├── public/                    # Static assets (CSS, favicon)
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
└── package.json               # Updated scripts
```

### New Commands
```bash
# Development (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Run tests
npm test
npm run test:watch   # Watch mode
npm run test:ui      # Visual UI
```

### TypeScript Configuration
- **Target**: ES2020
- **Module**: ESNext
- **Strict Mode**: Disabled (for easier migration, can be enabled gradually)
- **Source Maps**: Enabled
- **Module Resolution**: Bundler

### Type Safety Benefits
1. **WebAV Integration**: Uses WebAV's official TypeScript definitions from npm package
   - MP4Clip, OffscreenSprite, Combinator types
   - Proper property names (e.g., `audioChanCount` instead of `audioChannels`)
2. **State Management**: Strongly typed application state and sprite state
3. **Function Signatures**: All functions have explicit parameter and return types
4. **IDE Support**: Better autocomplete, refactoring, and error detection
5. **Build Integration**: Vite bundles WebAV from npm instead of relying on CDN

### Key Type Definitions

#### AppState
```typescript
interface AppState {
  materials: Material[];
  sprites: SpriteState[];
  selectedSpriteId: string | null;
  currentTime: number;
  isPlaying: boolean;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  audioContext: AudioContext | null;
  nextAudioTime: number;
  zoom: number;
}
```

#### SpriteState
```typescript
interface SpriteState {
  id: string;
  materialId: string;
  clip: MP4Clip;
  sprite: OffscreenSprite;
  startTime: number;
  duration: number;
  filters: FilterSettings;
  playbackRate: number;
  opacity: number;
}
```

### Build System
- **Vite**: Modern build tool with TypeScript support out of the box
- **Hot Module Replacement**: Instant updates during development
- **Optimized Production Builds**: Tree-shaking, minification, code splitting

### Testing
- All 61 tests migrated to TypeScript
- Tests continue to use mocks for WebAV classes
- Vitest configuration integrated into vite.config.ts

### Backward Compatibility
- The old `js/app.js` file has been replaced with `src/app.ts`
- CDN import for WebAV remains unchanged
- HTML references updated to `/src/app.ts` (Vite handles TypeScript)

### Future Improvements
Once the migration is stable, consider:
1. **Enable Strict Mode**: Gradually enable TypeScript strict checks
2. **Stricter Types**: Remove `any` types and add more specific type guards
3. **Modularization**: Split app.ts into smaller, focused modules
4. **Component Architecture**: Consider a framework like React/Vue/Svelte
5. **State Management Library**: Consider Zustand/Jotai for complex state

### Migration Notes for Developers
- When adding new features, create proper TypeScript types
- Use the existing type definitions in `src/types/` as reference
- Run `npm run typecheck` before committing to catch type errors
- **WebAV Types**: We use WebAV's official TypeScript definitions from the npm package
  - Import from `@webav/av-cliper` package
  - Note: WebAV uses `audioChanCount` (not `audioChannels`)
  - Vite bundles WebAV from npm for better type safety and build optimization

## Branch Strategy
Following the project's branch strategy:
- `main`: Production branch
- `develop`: Development branch

All TypeScript work merged into `develop` first, then to `main` when stable.
