import express from 'express';

/**
 * Injects middlewares into the API.
 * @param {Object} api - The API object.
 * @returns {void}
 */
const injectMiddlewares = (api) => {
  api.use(express.json({ limit: '200mb' }));
};

export default injectMiddlewares;
