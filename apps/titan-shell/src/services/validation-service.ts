import { ValidationEngine } from '@titan/validation';
import type {
  ValidationPipelineResult,
  ValidationStructuralResult,
  ValidationVerdict,
} from '@titan/validation';
import type { ExecutionRecord } from '@titan/execution';
import type { TitanShell } from '../index';

const VALIDATION_ENGINE_ID = 'validation-engine';

/**
 * Thin CLI-side adapter over the Validation Engine's already-public,
 * real methods (`validate`, `getValidationStatus`). No business logic
 * lives here — evidence collection and structural validation both stay
 * inside the engine. `approveValidation`/`rejectValidation` are
 * deliberately not wrapped here: both are confirmed, unconditional
 * `NotImplementedError` stubs.
 */
export class ValidationServiceError extends Error {}

function getEngine(shell: TitanShell): ValidationEngine {
  const engine = shell.registry.get(VALIDATION_ENGINE_ID);
  if (!engine || !(engine instanceof ValidationEngine)) {
    throw new ValidationServiceError('Validation Engine is not registered.');
  }
  return engine;
}

export async function validateExecutionRecord(
  shell: TitanShell,
  record: ExecutionRecord,
): Promise<ValidationPipelineResult> {
  return getEngine(shell).validate({ subject: { record } });
}

export async function getValidationStatus(
  shell: TitanShell,
  verdict: ValidationVerdict,
): Promise<ValidationStructuralResult> {
  return getEngine(shell).getValidationStatus({ verdict });
}
