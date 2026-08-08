import { resolveEngineMetadata } from '../engine-utils';
import type { CommandContext, CommandLeaf, CommandResult } from '../types';

interface DoctorCheck {
  readonly name: string;
  readonly pass: boolean;
  readonly detail: string;
}

/**
 * Composed diagnostics only — every check reads state that already exists
 * elsewhere in the shell (engine health, runtime config, Node version).
 * Nothing new is added to any engine to support this.
 */
export const doctorCommand: CommandLeaf = {
  kind: 'leaf',
  name: 'doctor',
  usage: 'doctor',
  description: 'Run a composed diagnostic sweep across the shell and engines.',
  execute: async (context: CommandContext): Promise<CommandResult> => {
    const engines = context.shell.registry.list();

    const engineChecks: DoctorCheck[] = await Promise.all(
      engines.map(async (engine) => {
        const metadata = resolveEngineMetadata(engine);
        try {
          const health = await engine.health();
          return {
            name: metadata.name,
            pass: health.status === 'healthy' || health.status === 'degraded',
            detail: `state=${engine.getState()}, health=${health.status}`,
          };
        } catch (error) {
          return {
            name: metadata.name,
            pass: false,
            detail: `health check threw: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }),
    );

    const checks: DoctorCheck[] = [
      {
        name: 'Registered engines',
        pass: engines.length === 7,
        detail: `${engines.length}/7 registered`,
      },
      ...engineChecks,
      {
        name: 'Node.js runtime',
        pass: true,
        detail: process.version,
      },
    ];

    // A known, accepted, standing gap (Phase 013's hardening review) — not
    // a pass/fail check, since it can never turn green within this phase
    // and doctor's exit code should stay meaningful for scripting. Always
    // shown so the gap stays visible rather than silent.
    const authorizationNote =
      'Authorization: not enforced — no authenticationProvider/authorizationProvider/auditLogger is wired for any engine (see security_policy.md)';

    const lines = [
      ...checks.map(
        (check) => `${check.pass ? '✓' : '✗'} ${check.name}: ${check.detail}`,
      ),
      authorizationNote,
    ];
    const allPass = checks.every((check) => check.pass);

    return {
      success: allPass,
      output: lines.join('\n'),
      data: { checks, authorizationEnforced: false },
    };
  },
};
