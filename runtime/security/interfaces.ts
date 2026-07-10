export interface AuthenticationContext {
  readonly actorId?: string;
  readonly token?: string;
  readonly sessionId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface AuthenticationResult {
  readonly authenticated: boolean;
  readonly actorId?: string;
  readonly method?: string;
  readonly reason?: string;
}

export interface AuthorizationContext {
  readonly actorId: string;
  readonly roles: readonly string[];
  readonly resource: string;
  readonly action: string;
  readonly metadata?: Record<string, unknown>;
}

export interface AuthorizationResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface PermissionCheckRequest {
  readonly actorId: string;
  readonly permission: string;
  readonly resource?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  readonly timestamp: string;
  readonly actorId: string;
  readonly action: string;
  readonly target: string;
  readonly result: 'success' | 'failure' | 'denied';
  readonly correlationId: string;
  readonly severity?: 'info' | 'warn' | 'error';
  readonly metadata?: Record<string, unknown>;
}

export interface SecretRequest {
  readonly key: string;
  readonly actorId?: string;
  readonly purpose?: string;
}

export interface AuthenticationProvider {
  authenticate(context: AuthenticationContext): Promise<AuthenticationResult>;
}

export interface AuthorizationProvider {
  authorize(context: AuthorizationContext): Promise<AuthorizationResult>;
}

export interface AuditLogger {
  log(entry: AuditLogEntry): Promise<void>;
}

export interface PermissionChecker {
  hasPermission(request: PermissionCheckRequest): Promise<boolean>;
}

export interface SecretProvider {
  getSecret(request: SecretRequest): Promise<string>;
  hasSecret(key: string): Promise<boolean>;
}
