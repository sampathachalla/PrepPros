import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import axios from 'axios';
import { resendConfirmation } from '../services/authService';

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('resendConfirmation', () => {
  it('sends the normalized identifier to the API', async () => {
    jest.mocked(axios.post).mockResolvedValueOnce({ data: {} });
    await resendConfirmation('  Sam_Chef ');
    expect(jest.mocked(axios.post).mock.calls[0].slice(0, 2)).toEqual([
      expect.stringMatching(/\/auth\/resend-confirmation$/),
      { identifier: 'sam_chef' },
    ]);
  });
});
