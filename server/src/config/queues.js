import Queue from 'bull';
import { getRedisClient } from './redis.js';
import { logger } from '../utils/logger.js';
import { processOrderQueue } from '../workers/orderProcessor.js';
import { processInventoryQueue } from '../workers/inventoryProcessor.js';
import { processNotificationQueue } from '../workers/notificationProcessor.js';

let orderQueue;
let inventoryQueue;
let notificationQueue;

const setupQueues = async () => {
  try {
    const redisConfig = {
      redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || 'localhost',
      }
    };

    // Initialize queues
    orderQueue = new Queue('order processing', redisConfig);
    inventoryQueue = new Queue('inventory processing', redisConfig);
    notificationQueue = new Queue('notification processing', redisConfig);

    // Setup queue processors
    orderQueue.process(5, processOrderQueue);
    inventoryQueue.process(10, processInventoryQueue);
    notificationQueue.process(20, processNotificationQueue);

    // Queue event handlers
    orderQueue.on('completed', (job) => {
      logger.info(`Order job ${job.id} completed`);
    });

    orderQueue.on('failed', (job, err) => {
      logger.error(`Order job ${job.id} failed:`, err);
    });

    inventoryQueue.on('completed', (job) => {
      logger.info(`Inventory job ${job.id} completed`);
    });

    inventoryQueue.on('failed', (job, err) => {
      logger.error(`Inventory job ${job.id} failed:`, err);
    });

    notificationQueue.on('completed', (job) => {
      logger.info(`Notification job ${job.id} completed`);
    });

    notificationQueue.on('failed', (job, err) => {
      logger.error(`Notification job ${job.id} failed:`, err);
    });

    logger.info('📋 Message queues initialized successfully');
    
  } catch (error) {
    logger.error('Queue setup failed:', error);
    throw error;
  }
};

const getQueues = () => ({
  orderQueue,
  inventoryQueue,
  notificationQueue
});

export { setupQueues, getQueues };