// Credential Management API — not yet in TypeScript's default DOM lib
// https://developer.mozilla.org/en-US/docs/Web/API/Credential_Management_API

interface PasswordCredentialData {
  id: string;
  password: string;
  name?: string;
  iconURL?: string;
}

declare class PasswordCredential extends Credential {
  constructor(data: PasswordCredentialData);
  readonly password: string;
}

interface Window {
  PasswordCredential?: typeof PasswordCredential;
}
