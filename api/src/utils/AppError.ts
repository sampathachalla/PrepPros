/** An error whose message is safe to show to API clients. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (resource: string) => new AppError(404, `${resource} not found`);
