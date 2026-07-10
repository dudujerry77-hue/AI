# Authorization

**Document Class:** Technical Governance
**Authority:** Subordinate to `security_policy.md`.

## Role-Based Access Control

Titan AI must enforce authorization through explicit roles and permissions. Authorization must be evaluated server-side and must not trust client-supplied role claims alone.

## Roles

| Role | Description | Typical Permissions |
|---|---|---|
| Owner | Full control over the platform | Manage users, secrets, policies, deployments, billing |
| Admin | Platform administration | Manage engines, configuration, access, incidents |
| Developer | Build and test workflows | Create and update work, run non-privileged tasks |
| Reviewer | Review and approve changes | Review code, approve workflows, inspect logs |
| Guest | Read-only observation with minimal scope | Read non-sensitive status and approved public documentation |
| AI Agent | Automated execution identity constrained by governance | Execute assigned tasks within approved scope and policy gates |

## Permission Matrix

Legend: `allow` means generally permitted, `deny` means prohibited by default, `conditional` means permitted only with explicit policy checks and approvals where required.

| Permission | Owner | Admin | Developer | Reviewer | Guest | AI Agent |
|---|---|---|---|---|---|---|
| View non-sensitive project status | allow | allow | allow | allow | allow | allow |
| View sensitive operational data | allow | conditional | deny | conditional | deny | deny |
| Manage users and role assignments | allow | conditional | deny | deny | deny | deny |
| Manage authentication and access policies | allow | conditional | deny | deny | deny | deny |
| Manage secrets and secret policies | allow | conditional | deny | deny | deny | deny |
| Trigger privileged runtime operations | conditional | conditional | deny | deny | deny | conditional |
| Execute standard development tasks | allow | allow | allow | conditional | deny | conditional |
| Approve governance or release gates | allow | conditional | deny | allow | deny | deny |
| Review audit logs | allow | allow | conditional | allow | deny | conditional |
| Modify production configuration | conditional | conditional | deny | deny | deny | deny |
| Initiate incident response actions | allow | allow | conditional | conditional | deny | conditional |

## Ownership and Role Stewardship

- Owner is the ultimate policy authority for access governance in this repository.
- Admin operates day-to-day access control and incident-level authorization actions under owner-defined policy.
- AI Agent identities are service principals with least-privilege defaults and must never inherit owner-equivalent authority.
- Guest accounts must remain read-only and must never receive elevated privileges through implicit group inheritance.

## Authorization Rules

- Permissions are granted by role, not by implicit trust.
- Privileged actions require explicit checks.
- Separating administrative roles from runtime execution roles reduces blast radius.
- Cross-engine operations must enforce policy at the boundary.
