import express from 'express';
import startServer from './libs/boot';
import injectRoutes from './routes';
import injectMiddlewares from './libs/middlewares';

/**
 * The server instance for the files manager application.
 * @type {Express}
 */
const server = express();

injectMiddlewares(server);
injectRoutes(server);
startServer(server);

export default server;
