## 1. Canonical tileset metadata

- [x] 1.1 Update `public/assets/mazes/tileset.tsx` to include complete collision properties for all used demo tile IDs.
- [x] 1.2 Normalize TSX image source paths to repository asset paths consumed by conversion output.
- [x] 1.3 Normalize `public/assets/mazes/default/demo.tmx` tileset source path to the canonical `tileset.tsx`.

## 2. Converter hardening

- [x] 2.1 Refactor `scripts/convert-demo-map.mjs` to parse collision metadata directly from `tileset.tsx`.
- [x] 2.2 Remove `pacman.json` collision fallback dependency from demo conversion.
- [x] 2.3 Add strict fail-fast validation for used tile IDs and required collision properties.
- [x] 2.4 Preserve existing trim, chunk flattening, and gid/flip flag behavior.

## 3. Demo artifact regeneration

- [x] 3.1 Regenerate `public/assets/mazes/default/demo.json` using `pnpm run map:demo:convert`.
- [x] 3.2 Verify converted tile collision signatures match canonical TSX metadata for used IDs.

## 4. Contract and behavior tests

- [x] 4.1 Extend `src/__tests__/demoMapContract.test.ts` to validate TSX-to-demo collision parity.
- [x] 4.2 Add representative interior blocked-edge assertions for demo traversal behavior.
- [x] 4.3 Keep existing parser/default-map contract coverage passing.

## 5. Validation gates

- [x] 5.1 Run `pnpm run typecheck`.
- [x] 5.2 Run `pnpm run lint`.
- [x] 5.3 Run `pnpm run test`.
- [x] 5.4 Run `pnpm run spec:check`.
