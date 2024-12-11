/* eslint-disable import/no-named-as-default */
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';

/**
 * Controller class for handling authentication related operations.
 */
export default class AuthController {
  /**
   * Handles the request to establish a connection for a user.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<void>} - A promise that resolves when the connection is established.
   */
  static async getConnect(req, res) {
    const { user } = req;
    const token = uuidv4();

    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);
    res.status(200).json({ token });
  }

  /**
   * Handles the request to disconnect a user.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<void>} - A promise that resolves when the user is disconnected.
   */
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    await redisClient.del(`auth_${token}`);
    res.status(204).send();
  }
}
