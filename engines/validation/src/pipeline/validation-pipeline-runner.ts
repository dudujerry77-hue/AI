import { ValidationBuilder } from '../builders/validation-builder';
import { ValidationEvidenceCollector } from '../evidence/validation-evidence-collector';
import type {
  ValidationPipelineResult,
  ValidationSubject,
} from '../models/types';

/**
 * Deterministic, synchronous, offline coordinator that assembles a
 * `ValidationPipelineResult` from a `ValidationSubject` — Milestone 5.
 *
 * `ValidationPipelineRunner.run` delegates verdict construction
 * entirely to `ValidationBuilder` (unchanged since Milestone 3) and
 * evidence collection entirely to `ValidationEvidenceCollector` (new
 * in Milestone 5), resolving a single timestamp once and passing it
 * to both so that a verdict's `createdAt`/`updatedAt` and its
 * evidence's `capturedAt` always agree on a freshly built result. It
 * then composes their outputs into one `ValidationPipelineResult`.
 *
 * This class contains no structural logic of its own beyond that
 * composition: no approval, no rejection, no policy evaluation, no
 * governance enforcement, no escalation determination, no learning
 * integration, no persistence, no networking, no AI logic, and no
 * heuristic behavior. `escalations` remains an empty array, unchanged
 * from Milestone 3 — escalation determination is out of scope for
 * this milestone. No other Titan engine's runtime is called from this
 * module.
 *
 * `run` is a pure function of its input: given the same `subject` and
 * `timestamp`, it always returns an equivalent `ValidationPipelineResult`.
 * It never mutates `subject`.
 */
export class ValidationPipelineRunner {
  constructor(
    private readonly builder: ValidationBuilder = new ValidationBuilder(),
    private readonly evidenceCollector: ValidationEvidenceCollector = new ValidationEvidenceCollector(),
  ) {}

  /**
   * Build a verdict from `subject` via `ValidationBuilder`, collect
   * structural evidence for that verdict via
   * `ValidationEvidenceCollector`, and return the composed
   * `ValidationPipelineResult`.
   *
   * Propagates `ValidationRequestError` unchanged from either
   * delegate when `subject` (or the verdict derived from it) is
   * malformed.
   */
  run(
    subject: ValidationSubject,
    timestamp?: string,
  ): ValidationPipelineResult {
    const resolvedTimestamp = timestamp ?? new Date().toISOString();
    const built = this.builder.build(subject, resolvedTimestamp);
    const evidence = this.evidenceCollector.collect(
      subject,
      built.verdict,
      resolvedTimestamp,
    );

    return {
      verdict: built.verdict,
      evidence,
      escalations: built.escalations,
    };
  }
}
