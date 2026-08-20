import mongoose from 'mongoose';

describe('Smoke Test', () => {
  it('should connect to in-memory mongo', async () => {
    const connection = mongoose.connection;
    expect(connection.readyState).toBe(1);
  });
});
