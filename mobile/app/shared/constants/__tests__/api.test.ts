import { resolveBackendConfig, resolveBackendTarget } from '../api';

describe('PrepPros backend configuration', () => {
  const env = {
    EXPO_PUBLIC_LOCAL_API_URL: 'http://192.168.1.20:8000/',
    EXPO_PUBLIC_TUNNEL_API_URL: 'https://tunnel.example/',
    EXPO_PUBLIC_OCI_API_URL: 'https://oci.example/',
  };

  it.each([
    ['local', 'http://192.168.1.20:8000'],
    ['tunnel', 'https://tunnel.example'],
    ['oci', 'https://oci.example'],
  ] as const)('selects the %s backend centrally', (target, expected) => {
    expect(resolveBackendConfig(target, env).baseUrl).toBe(expected);
  });

  it('supports the legacy API URL only for local development', () => {
    expect(resolveBackendConfig('local', { EXPO_PUBLIC_API_URL: 'http://127.0.0.1:8000/' }).baseUrl)
      .toBe('http://127.0.0.1:8000');
    expect(resolveBackendConfig('oci', { EXPO_PUBLIC_API_URL: 'http://127.0.0.1:8000/' }).baseUrl)
      .toBe('');
  });

  it('defaults invalid or missing configuration to OCI', () => {
    expect(resolveBackendTarget(undefined)).toBe('oci');
    expect(resolveBackendTarget('unexpected')).toBe('oci');
    expect(resolveBackendTarget(' tunnel ')).toBe('tunnel');
  });
});
