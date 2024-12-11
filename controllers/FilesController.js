/* eslint-disable import/no-named-as-default */
/* eslint-disable no-unused-vars */
import { tmpdir } from 'os';
import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import { v4 as uuidv4 } from 'uuid';
import {
  mkdir, writeFile, stat, existsSync, realpath,
} from 'fs';
import { join as joinPath } from 'path';
import { Request, Response } from 'express';
import { contentType } from 'mime-types';
import mongoDBCore from 'mongodb/lib/core';
import dbClient from '../utils/db';
import { getUserFromXToken } from '../utils/auth';

// Define valid file types
const VALID_FILE_TYPES = {
  folder: 'folder',
  file: 'file',
  image: 'image',
};

// Define root folder ID and default root folder name
const ROOT_FOLDER_ID = 0;
const DEFAULT_ROOT_FOLDER = 'files_manager';

// Promisify file system functions
const mkDirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);
const realpathAsync = promisify(realpath);

// Define maximum number of files per page
const MAX_FILES_PER_PAGE = 20;

// Create a file queue for thumbnail generation
const fileQueue = new Queue('thumbnail generation');

// Define null ID
const NULL_ID = Buffer.alloc(24, '0').toString('utf-8');

// Check if a given ID is valid
const isValidId = (id) => {
  const size = 24;
  let i = 0;
  const charRanges = [
    [48, 57],
    [97, 102],
    [65, 70],
  ];
  if (typeof id !== 'string' || id.length !== size) {
    return false;
  }
  while (i < size) {
    const c = id[i];
    const code = c.charCodeAt(0);

    if (!charRanges.some((range) => code >= range[0] && code <= range[1])) {
      return false;
    }
    i += 1;
  }
  return true;
};

export default class FilesController {
  /**
   * Uploads a file.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async postUpload(req, res) {
    // Get user from request
    const { user } = req;

    // Get name, type, parentId, isPublic, and base64Data from request body
    const name = req.body ? req.body.name : null;
    const type = req.body ? req.body.type : null;
    const parentId = req.body && req.body.parentId ? req.body.parentId : ROOT_FOLDER_ID;
    const isPublic = req.body && req.body.isPublic ? req.body.isPublic : false;
    const base64Data = req.body && req.body.data ? req.body.data : '';

    // Validate name
    if (!name) {
      res.status(400).json({ error: 'Missing name' });
      return;
    }

    // Validate type
    if (!type || !Object.values(VALID_FILE_TYPES).includes(type)) {
      res.status(400).json({ error: 'Missing type' });
      return;
    }

    // Validate data for non-folder types
    if (!req.body.data && type !== VALID_FILE_TYPES.folder) {
      res.status(400).json({ error: 'Missing data' });
      return;
    }

    // Validate parent folder
    if ((parentId !== ROOT_FOLDER_ID) && (parentId !== ROOT_FOLDER_ID.toString())) {
      const file = await (await dbClient.filesCollection())
        .findOne({
          _id: new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
        });

      if (!file) {
        res.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (file.type !== VALID_FILE_TYPES.folder) {
        res.status(400).json({ error: 'Parent is not a folder' });
        return;
      }
    }

    // Get user ID
    const userId = user._id.toString();

    // Get base directory
    const baseDir = `${process.env.FOLDER_PATH || ''}`.trim().length > 0
      ? process.env.FOLDER_PATH.trim()
      : joinPath(tmpdir(), DEFAULT_ROOT_FOLDER);

    // Create new file object
    const newFile = {
      userId: new mongoDBCore.BSON.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: (parentId === ROOT_FOLDER_ID) || (parentId === ROOT_FOLDER_ID.toString())
        ? '0'
        : new mongoDBCore.BSON.ObjectId(parentId),
    };

    // Create base directory if it doesn't exist
    await mkDirAsync(baseDir, { recursive: true });

    // Handle non-folder types
    if (type !== VALID_FILE_TYPES.folder) {
      const localPath = joinPath(baseDir, uuidv4());
      await writeFileAsync(localPath, Buffer.from(base64Data, 'base64'));
      newFile.localPath = localPath;
    }

    // Insert new file into database
    const insertionInfo = await (await dbClient.filesCollection())
      .insertOne(newFile);
    const fileId = insertionInfo.insertedId.toString();

    // Start thumbnail generation worker for image files
    if (type === VALID_FILE_TYPES.image) {
      const jobName = `Image thumbnail [${userId}-${fileId}]`;
      fileQueue.add({ userId, fileId, name: jobName });
    }

    // Return response with file information
    res.status(201).json({
      id: fileId,
      userId,
      name,
      type,
      isPublic,
      parentId: (parentId === ROOT_FOLDER_ID) || (parentId === ROOT_FOLDER_ID.toString())
        ? 0
        : parentId,
    });
  }

  /**
   * Retrieves a file by ID.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async getShow(req, res) {
    // Get user from request
    const { user } = req;

    // Get file ID from request parameters
    const id = req.params ? req.params.id : NULL_ID;

    // Get user ID
    const userId = user._id.toString();

    // Find file in database
    const file = await (await dbClient.filesCollection())
      .findOne({
        _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
        userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
      });

    // Return response with file information
    if (!file) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId === ROOT_FOLDER_ID.toString()
        ? 0
        : file.parentId.toString(),
    });
  }

  /**
   * Retrieves files associated with a specific user.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async getIndex(req, res) {
    // Get user from request
    const { user } = req;

    // Get parent ID and page number from request query
    const parentId = req.query.parentId || ROOT_FOLDER_ID.toString();
    const page = /\d+/.test((req.query.page || '').toString())
      ? Number.parseInt(req.query.page, 10)
      : 0;

    // Define files filter
    const filesFilter = {
      userId: user._id,
      parentId: parentId === ROOT_FOLDER_ID.toString()
        ? parentId
        : new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
    };

    // Retrieve files from database
    const files = await (await (await dbClient.filesCollection())
      .aggregate([
        { $match: filesFilter },
        { $sort: { _id: -1 } },
        { $skip: page * MAX_FILES_PER_PAGE },
        { $limit: MAX_FILES_PER_PAGE },
        {
          $project: {
            _id: 0,
            id: '$_id',
            userId: '$userId',
            name: '$name',
            type: '$type',
            isPublic: '$isPublic',
            parentId: {
              $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' },
            },
          },
        },
      ])).toArray();

    // Return response with files
    res.status(200).json(files);
  }

  /**
   * Publishes a file.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async putPublish(req, res) {
    // Get user from request
    const { user } = req;

    // Get file ID from request parameters
    const { id } = req.params;

    // Get user ID
    const userId = user._id.toString();

    // Define file filter
    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    };

    // Find file in database
    const file = await (await dbClient.filesCollection())
      .findOne(fileFilter);

    // Return error if file not found
    if (!file) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Update file to set isPublic to true
    await (await dbClient.filesCollection())
      .updateOne(fileFilter, { $set: { isPublic: true } });

    // Return response with updated file information
    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId === ROOT_FOLDER_ID.toString()
        ? 0
        : file.parentId.toString(),
    });
  }

  /**
   * Unpublishes a file.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async putUnpublish(req, res) {
    // Get user from request
    const { user } = req;

    // Get file ID from request parameters
    const { id } = req.params;

    // Get user ID
    const userId = user._id.toString();

    // Define file filter
    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    };

    // Find file in database
    const file = await (await dbClient.filesCollection())
      .findOne(fileFilter);

    // Return error if file not found
    if (!file) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Update file to set isPublic to false
    await (await dbClient.filesCollection())
      .updateOne(fileFilter, { $set: { isPublic: false } });

    // Return response with updated file information
    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId === ROOT_FOLDER_ID.toString()
        ? 0
        : file.parentId.toString(),
    });
  }

  /**
   * Retrieves the content of a file.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   */
  static async getFile(req, res) {
    // Get user from request
    const user = await getUserFromXToken(req);

    // Get file ID from request parameters
    const { id } = req.params;

    // Get size from request query
    const size = req.query.size || null;

    // Get user ID
    const userId = user ? user._id.toString() : '';

    // Define file filter
    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
    };

    // Find file in database
    const file = await (await dbClient.filesCollection())
      .findOne(fileFilter);

    // Return error if file not found or user doesn't have access
    if (!file || (!file.isPublic && (file.userId.toString() !== userId))) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Return error if file is a folder
    if (file.type === VALID_FILE_TYPES.folder) {
      res.status(400).json({ error: 'A folder doesn\'t have content' });
      return;
    }

    // Get file path
    let filePath = file.localPath;

    // Append size to file path if specified
    if (size) {
      filePath = `${file.localPath}_${size}`;
    }

    // Check if file exists
    if (existsSync(filePath)) {
      const fileInfo = await statAsync(filePath);

      // Return error if file is not a regular file
      if (!fileInfo.isFile()) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
    } else {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Get absolute file path
    const absoluteFilePath = await realpathAsync(filePath);

    // Set content type header and send file
    res.setHeader('Content-Type', contentType(file.name) || 'text/plain; charset=utf-8');
    res.status(200).sendFile(absoluteFilePath);
  }
}
