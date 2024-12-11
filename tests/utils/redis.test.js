/**
 * Test suite for the RedisClient utility.
 */

/* eslint-disable import/no-named-as-default */
import { expect } from 'chai';
import redisClient from '../../utils/redis';

/**
 * Test case: Client is alive
 * Description: Checks if the Redis client is alive.
 */
describe('+ RedisClient utility', () => {
  before(function (done) {
    this.timeout(10000);
    setTimeout(done, 4000);
  });

  it('+ Client is alive', () => {
    expect(redisClient.isAlive()).to.equal(true);
  });

  /**
   * Test case: Setting and getting a value
   * Description: Sets a value in Redis and retrieves it to check if it matches the expected value.
   */
  it('+ Setting and getting a value', async function () {
    await redisClient.set('test_key', 345, 10);
    expect(await redisClient.get('test_key')).to.equal('345');
  });

  /**
   * Test case: Setting and getting an expired value
   * Description: Sets a value in Redis with an expiration time, waits for the expiration, and checks if the value is still present.
   */
  it('+ Setting and getting an expired value', async function () {
    await redisClient.set('test_key', 356, 1);
    setTimeout(async () => {
      expect(await redisClient.get('test_key')).to.not.equal('356');
    }, 2000);
  });

  /**
   * Test case: Setting and getting a deleted value
   * Description: Sets a value in Redis, deletes it, waits for a short period, and checks if the value is null.
   */
  it('+ Setting and getting a deleted value', async function () {
    await redisClient.set('test_key', 345, 10);
    await redisClient.del('test_key');
    setTimeout(async () => {
      console.log('del: test_key ->', await redisClient.get('test_key'));
      expect(await redisClient.get('test_key')).to.be.null;
    }, 2000);
  });
});
