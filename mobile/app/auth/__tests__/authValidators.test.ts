import { validateLogin, validateSignup } from '../validators/authValidators';

export const authValidatorCases = {
  emptyLogin: validateLogin('', ''),
  validLogin: validateLogin('student@example.com', 'password'),
  mismatchedSignup: validateSignup({
    email: 'student@example.com',
    password: 'password',
    confirmPassword: 'different',
    role: 'Member',
  }),
};

describe('auth validators', () => {
  it('requires login credentials', () => {
    expect(authValidatorCases.emptyLogin).toBe('Enter your email.');
  });

  it('accepts valid login credentials', () => {
    expect(authValidatorCases.validLogin).toBeNull();
  });

  it('signs up with just an email and password', () => {
    const credentials = { email: 'a@b.co', password: 'password', confirmPassword: 'password', role: 'Member' as const };
    expect(validateSignup(credentials)).toBeNull();
    expect(validateSignup({ ...credentials, email: 'not-an-email' })).toMatch(/email/);
  });

  it('rejects mismatched signup passwords', () => {
    expect(authValidatorCases.mismatchedSignup).toBe('Passwords do not match.');
  });
});
