#!/usr/bin/env bash
# Produces a single, deployment-target-agnostic source artifact for Titan
# Core: a tarball of the exact tracked repository content at the current
# commit, produced by `git archive` (a standard git capability already
# fundamental to this workflow, not a new dependency). This is the
# "package" artifact form named in deployment_strategy.md §2 step 6 —
# deliberately not a container image, which would presume a hosting/
# runtime target not yet selected (see
# .titan/phases/phase-015-deployment-readiness.md's Current Blockers).
#
# The artifact is a source distribution: everything needed to `npm ci`,
# `npm run build`, and `npm test` from a completely clean copy, with
# nothing added or removed relative to what git already tracks (no manual
# file list to maintain, no risk of drift as workspaces are added). It is
# inherently traceable to an exact commit, per deployment_strategy.md §4,
# since `git archive` is itself commit-addressed.

set -euo pipefail

ARTIFACT_NAME="titan-core-artifact.tar.gz"
COMMIT="$(git rev-parse HEAD)"

git archive --format=tar.gz --output="$ARTIFACT_NAME" "$COMMIT"

echo "Artifact written: $ARTIFACT_NAME (commit $COMMIT)"
