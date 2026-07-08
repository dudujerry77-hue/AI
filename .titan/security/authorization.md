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
| Viewer | Read-only observation | Read dashboards, reports, status, audit logs |
| Billing | Financial and subscription operations | Manage billing records and subscriptions only |

## Authorization Rules

- Permissions are granted by role, not by implicit trust.
- Privileged actions require explicit checks.
- Separating administrative roles from runtime execution roles reduces blast radius.
- Cross-engine operations must enforce policy at the boundary.
