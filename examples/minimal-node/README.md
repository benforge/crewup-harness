# Minimal Node Example

This example shows the smallest practical setup for CrewUp. It includes one source file and one smoke test so `crewup inspect`, `crewup init`, and `crewup check` have a real project to read.

## Try It

```bash
cd examples/minimal-node
npm install
npm test
npx crewup doctor
npx crewup install
npx crewup inspect --no-ai
npx crewup init --force
npx crewup check
```

## Project Files

- `src/index.js`: minimal application code
- `test/smoke.test.js`: basic runtime check
