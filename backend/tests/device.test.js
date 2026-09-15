const request = require('supertest');
const express = require('express');
const deviceRoutes = require('../src/routes/deviceRoutes');

const app = express();
app.use(express.json());

// Mock middleware to simulate a logged-in student
jest.mock('../src/middleware/auth', () => ({
  protect: (req, res, next) => {
    req.user = { id: 2, role: 'student' }; // Mock student
    next();
  },
  authorize: () => (req, res, next) => next()
}));

app.use('/api/devices', deviceRoutes);

// Mock the DB
jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

const db = require('../src/db');

describe('Device API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/devices/register', () => {
    it('should return 400 if student tries to register more than one device (unique constraint violation)', async () => {
      // 1. Mock student fetch
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); 
      
      // 2. Mock device check (no existing identifier found)
      db.query.mockResolvedValueOnce({ rows: [] }); 

      // 3. Mock DB Insert throwing a UNIQUE constraint violation (mimicking student_id constraint)
      db.query.mockRejectedValueOnce({
        code: '23505',
        constraint: 'devices_student_id_key'
      });

      const response = await request(app)
        .post('/api/devices/register')
        .send({ device_identifier: 'NEW_DEVICE_123' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already have a registered device');
    });
  });
});
