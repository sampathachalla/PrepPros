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
