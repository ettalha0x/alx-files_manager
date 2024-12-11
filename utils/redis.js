import { promisify } from 'util';
import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.isClientConnected = true;
    this.client.on('error', (err) => {
      console.error('Redis client failed to connect:', err.message || err.toString());
      this.isClientConnected = false;
    });
    this.client.on('connect', () => {
      this.isClientConnected = true;
    });
  }

  // Checks if the client is connected to the Redis server
  isAlive() {
    return this.isClientConnected;
  }

  // Retrieves the value of a given key
  async get(key) {
    return promisify(this.client.GET).bind(this.client)(key);
  }

  // Stores a key and its value along with an expiration time
  async set(key, value, duration) {
    await promisify(this.client.SETEX)
      .bind(this.client)(key, duration, value);
  }

  // Removes the value of a given key
  async del(key) {
    await promisify(this.client.DEL).bind(this.client)(key);
  }
}

export const redisClient = new RedisClient();
export default redisClient;
