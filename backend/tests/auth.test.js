const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/routes/authRoutes');

// Mock express app for testing the route isolated from the DB layer
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock the DB module so we don't need a live DB for unit tests
jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

const db = require('../src/db');
const bcrypt = require('bcryptjs');

describe('Auth API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // User not found

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'fake@example.com', password: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return a token for valid credentials', async () => {
      // Mock user found
      const mockHashedPassword = await bcrypt.hash('password123', 1);
      db.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: 1, 
          email: 'admin@example.com', 
          password_hash: mockHashedPassword, 
          role: 'admin', 
          status: 'active' 
        }] 
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.role).toBe('admin');
    });
  });
});
