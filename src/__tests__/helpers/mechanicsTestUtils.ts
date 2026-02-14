import { readMechanicsDiagnostics } from './mechanicsSpec';
import { ReproInput, withReproBundle } from './reproBundle';

export function runMechanicsAssertion<T>(input: ReproInput, run: () => T): T {
  const diagnostics = readMechanicsDiagnostics();
  return withReproBundle(
    {
      ...input,
      diagnostics,
    },
    run,
  );
}
