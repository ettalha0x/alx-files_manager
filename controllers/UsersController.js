/* eslint-disable import/no-named-as-default */
import sha1 from 'sha1';
import Queue from 'bull/lib/queue';
import dbClient from '../utils/db';

const userQueue = new Queue('email sending');

/**
 * Controller class for handling user-related operations.
 */
export default class UsersController {
  /**
   * Create a new user.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<void>} - A promise that resolves when the user is created.
   */
  static async postNew(req, res) {
    // Retrieve email and password from the request body
    const email = req.body ? req.body.email : null;
    const password = req.body ? req.body.password : null;

    // Check if email is missing
    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }

    // Check if password is missing
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    // Check if user with the same email already exists
    const user = await (await dbClient.usersCollection()).findOne({ email });
    if (user) {
      res.status(400).json({ error: 'Already exist' });
      return;
    }

    // Insert the new user into the database
    const insertionInfo = await (await dbClient.usersCollection())
      .insertOne({ email, password: sha1(password) });
    const userId = insertionInfo.insertedId.toString();

    // Add the user to the user queue
    userQueue.add({ userId });

    // Return the created user's email and ID
    res.status(201).json({ email, id: userId });
  }

  /**
   * Get the details of the currently authenticated user.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {void}
   */
  static async getMe(req, res) {
    const { user } = req;

    // Return the email and ID of the authenticated user
    res.status(200).json({ email: user.email, id: user._id.toString() });
  }
}
