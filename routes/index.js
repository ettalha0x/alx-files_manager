// Importing necessary modules and controllers
import { Express } from 'express';
import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import UsersController from '../controllers/UsersController';
import FilesController from '../controllers/FilesController';
import { basicAuthenticate, xTokenAuthenticate } from '../middlewares/auth';
import { APIError, errorResponse } from '../middlewares/error';

/**
 * Injects routes with their handlers to the given Express application.
 * @param {Express} api - The Express application object
 */
const injectRoutes = (api) => {
  // Route for getting the status of the application
  api.get('/status', AppController.getStatus);

  // Route for getting the statistics of the application
  api.get('/stats', AppController.getStats);

  // Route for connecting to the application
  api.get('/connect', basicAuthenticate, AuthController.getConnect);

  // Route for disconnecting from the application
  api.get('/disconnect', xTokenAuthenticate, AuthController.getDisconnect);

  // Route for creating a new user
  api.post('/users', UsersController.postNew);

  // Route for getting the current user
  api.get('/users/me', xTokenAuthenticate, UsersController.getMe);

  // Route for uploading a file
  api.post('/files', xTokenAuthenticate, FilesController.postUpload);

  // Route for getting a specific file
  api.get('/files/:id', xTokenAuthenticate, FilesController.getShow);

  // Route for getting all files
  api.get('/files', xTokenAuthenticate, FilesController.getIndex);

  // Route for publishing a file
  api.put('/files/:id/publish', xTokenAuthenticate, FilesController.putPublish);

  // Route for unpublishing a file
  api.put('/files/:id/unpublish', xTokenAuthenticate, FilesController.putUnpublish);

  // Route for getting the data of a file
  api.get('/files/:id/data', FilesController.getFile);

  // Route for handling all other routes that are not defined
  api.all('*', (req, res, next) => {
    errorResponse(new APIError(404, `Cannot ${req.method} ${req.url}`), req, res, next);
  });

  // Middleware for handling errors
  api.use(errorResponse);
};

export default injectRoutes;
