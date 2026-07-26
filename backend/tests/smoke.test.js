const mongoose = require('mongoose');

describe('Smoke Test - Database Connection', () => {
  it('should successfully connect to the in-memory database and run a trivial operation', async () => {
    // Create a generic schema just to verify mongoose can write and read
    const TestSchema = new mongoose.Schema({ name: String });
    // Use a try-catch pattern for model creation to avoid OverwriteModelError if tests run repeatedly
    const TestModel = mongoose.models.TestSmoke || mongoose.model('TestSmoke', TestSchema);

    // Write
    const doc = await TestModel.create({ name: 'smoke-test-pass' });
    expect(doc.name).toBe('smoke-test-pass');

    // Read
    const found = await TestModel.findOne({ name: 'smoke-test-pass' });
    expect(found).toBeDefined();
    expect(found.name).toBe('smoke-test-pass');
  });
});
