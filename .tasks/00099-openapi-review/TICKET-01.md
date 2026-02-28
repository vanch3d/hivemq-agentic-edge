# OPENAPI-01: Add API Security Declarations

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P0 Critical
**Type:** Security
**Review sections:** 1, 9

## Problem

The API implements JWT-based Bearer token authentication, but the OpenAPI spec contains:

- No `securitySchemes` under `components`
- No global `security` declaration
- No per-operation `security` annotations
- Sensitive fields (`keystorePassword`, `privateKeyPassword`, `truststorePassword`, `Bridge.password`, `FirstUseInformation.prefillPassword`, `PulseActivationToken.token`) not marked as `writeOnly: true`

This means generated SDKs cannot distinguish public from authenticated endpoints, documentation tools show no auth requirements, and an agentic system has no way to know when a token is needed.

## Scope

### 5 items — Security scheme + endpoint annotations + writeOnly

1. Add a `securitySchemes` definition under `components`:
   ```yaml
   components:
     securitySchemes:
       bearerAuth:
         type: http
         scheme: bearer
         bearerFormat: JWT
   ```

2. Add a global `security` declaration (applies to all endpoints by default):
   ```yaml
   security:
     - bearerAuth: []
   ```

3. Override with empty `security: []` on public endpoints:
   - `POST /api/v1/auth/authenticate`
   - `POST /api/v1/auth/refresh-token`
   - `POST /api/v1/auth/validate-token`
   - `GET /api/v1/health/liveness`
   - `GET /api/v1/health/readiness`
   - `GET /api/v1/frontend/configuration`
   - `GET /api/v1/frontend/notifications`
   - `GET /`

4. Mark sensitive fields as `writeOnly: true`:
   - `TlsConfiguration.keystorePassword`
   - `TlsConfiguration.privateKeyPassword`
   - `TlsConfiguration.truststorePassword`
   - `Bridge.password`
   - `FirstUseInformation.prefillPassword`
   - `PulseActivationToken.token`

5. Remove cleartext password from `getBridgeByName` example (`password: password`).
