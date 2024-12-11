/* eslint-disable import/no-named-as-default */
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

/**
 * Controller class for handling application-related requests.
 */
export default class AppController {
  /**
   * Get the status of the application.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  static getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  /**
   * Get the statistics of the application.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  static getStats(req, res) {
    Promise.all([dbClient.nbUsers(), dbClient.nbFiles()])
      .then(([usersCount, filesCount]) => {
        res.status(200).json({ users: usersCount, files: filesCount });
      });
  }
}
