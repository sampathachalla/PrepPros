export type BackendTarget = 'local' | 'tunnel' | 'oci';

const BACKEND_TARGETS: readonly BackendTarget[] = ['local', 'tunnel', 'oci'];
const DEFAULT_OCI_API_URL = 'https://chaps-endowment-savior.ngrok-free.dev';

export function resolveBackendTarget(value: string | undefined): BackendTarget {
  const target = value?.trim().toLowerCase();
  return BACKEND_TARGETS.includes(target as BackendTarget) ? (target as BackendTarget) : 'local';
}

type BackendEnvironment = {
  EXPO_PUBLIC_LOCAL_API_URL?: string;
  EXPO_PUBLIC_TUNNEL_API_URL?: string;
  EXPO_PUBLIC_OCI_API_URL?: string;
  EXPO_PUBLIC_API_URL?: string;
};

const VARIABLE_BY_TARGET: Record<BackendTarget, keyof BackendEnvironment> = {
  local: 'EXPO_PUBLIC_LOCAL_API_URL',
  tunnel: 'EXPO_PUBLIC_TUNNEL_API_URL',
  oci: 'EXPO_PUBLIC_OCI_API_URL',
};

const normalize = (url: string | undefined) => url?.trim().replace(/\/+$/, '') ?? '';

export function resolveBackendConfig(target: BackendTarget, env: BackendEnvironment) {
  const variable = VARIABLE_BY_TARGET[target];
  // Preserve the original local-development variable without letting a LAN URL
  // accidentally override tunnel or OCI builds.
  const rawUrl = target === 'local'
    ? env.EXPO_PUBLIC_LOCAL_API_URL || env.EXPO_PUBLIC_API_URL
    : env[variable];
  return { target, variable, baseUrl: normalize(rawUrl) };
}

/** Builds default to the local API unless a command explicitly selects tunnel or OCI. */
export const BACKEND_TARGET = resolveBackendTarget(process.env.EXPO_PUBLIC_BACKEND_TARGET);

const backend = resolveBackendConfig(BACKEND_TARGET, {
  EXPO_PUBLIC_LOCAL_API_URL: process.env.EXPO_PUBLIC_LOCAL_API_URL,
  EXPO_PUBLIC_TUNNEL_API_URL: process.env.EXPO_PUBLIC_TUNNEL_API_URL,
  EXPO_PUBLIC_OCI_API_URL: process.env.EXPO_PUBLIC_OCI_API_URL,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});

export const API_URL = backend.baseUrl
  || (BACKEND_TARGET === 'oci' ? DEFAULT_OCI_API_URL : 'http://localhost:8000');

export const API_TIMEOUT_MS = 20_000;
