import envLoader from '../utils/env_loader';

/**
 * Starts the server and listens for incoming requests on the specified port.
 * @param {Object} api - The API object to be used for handling requests.
 */
const startServer = (api) => {
  envLoader();
  const port = process.env.PORT || 5000;
  const env = process.env.npm_lifecycle_event || 'dev';
  api.listen(port, () => {
    console.log(`[${env}] API has started listening at port:${port}`);
  });
};

export default startServer;
