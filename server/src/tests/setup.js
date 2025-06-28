import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

// Setup test database
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Mock Redis
jest.mock('../config/redis.js', () => ({
  connectRedis: jest.fn(),
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  }))
}));

// Mock queues
jest.mock('../config/queues.js', () => ({
  setupQueues: jest.fn(),
  getQueues: jest.fn(() => ({
    orderQueue: {
      add: jest.fn(),
      process: jest.fn(),
      getWaiting: jest.fn(() => []),
      getActive: jest.fn(() => []),
      getCompleted: jest.fn(() => []),
      getFailed: jest.fn(() => [])
    },
    inventoryQueue: {
      add: jest.fn(),
      process: jest.fn(),
      getWaiting: jest.fn(() => []),
      getActive: jest.fn(() => []),
      getCompleted: jest.fn(() => []),
      getFailed: jest.fn(() => [])
    },
    notificationQueue: {
      add: jest.fn(),
      process: jest.fn(),
      getWaiting: jest.fn(() => []),
      getActive: jest.fn(() => []),
      getCompleted: jest.fn(() => []),
      getFailed: jest.fn(() => [])
    }
  }))
}));

// Test utilities
export const createTestUser = async (userData = {}) => {
  const User = (await import('../models/User.js')).default;
  
  const defaultUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'customer'
  };
  
  const user = new User({ ...defaultUser, ...userData });
  return await user.save();
};

export const createTestStore = async (storeData = {}) => {
  const Store = (await import('../models/Store.js')).default;
  
  const defaultStore = {
    storeId: 'TEST-STORE-001',
    name: 'Test Store',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'US'
    },
    location: {
      type: 'Point',
      coordinates: [-86.7816, 36.1627]
    },
    managerId: new mongoose.Types.ObjectId(),
    status: 'active'
  };
  
  const store = new Store({ ...defaultStore, ...storeData });
  return await store.save();
};

export const createTestInventory = async (inventoryData = {}) => {
  const Inventory = (await import('../models/Inventory.js')).default;
  
  const defaultInventory = {
    sku: 'TEST-SKU-001',
    name: 'Test Product',
    category: 'Test Category',
    storeId: new mongoose.Types.ObjectId(),
    quantity: 100,
    reserved: 0,
    price: 9.99,
    reorderPoint: 10,
    maxStock: 200
  };
  
  const inventory = new Inventory({ ...defaultInventory, ...inventoryData });
  return await inventory.save();
};

export const createTestOrder = async (orderData = {}) => {
  const Order = (await import('../models/Order.js')).default;
  
  const defaultOrder = {
    orderId: 'TEST-ORD-001',
    customerId: new mongoose.Types.ObjectId(),
    storeId: new mongoose.Types.ObjectId(),
    items: [{
      sku: 'TEST-SKU-001',
      name: 'Test Product',
      quantity: 2,
      price: 9.99,
      category: 'Test Category'
    }],
    status: 'pending',
    totalAmount: 19.98,
    deliveryAddress: {
      street: '456 Customer St',
      city: 'Customer City',
      state: 'CS',
      zipCode: '54321',
      country: 'US'
    },
    payment: {
      method: 'credit_card',
      status: 'pending',
      amount: 19.98
    }
  };
  
  const order = new Order({ ...defaultOrder, ...orderData });
  return await order.save();
};