// D:\Code\SE2025-17.3\map-server\backend\src\middleware\teamValidation.js
import { body, param, validationResult } from 'express-validator';

// Validation rules for team name
export const validateTeamName = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Team name is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Team name must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Team name can only contain letters, numbers, spaces, hyphens, and underscores'),
];

// Validation rules for team ID parameter
export const validateTeamId = [
  param('teamId')
    .isMongoId()
    .withMessage('Invalid team ID format'),
];

// Combined validation for creating a team
export const validateCreateTeam = [
  ...validateTeamName,
];

// Combined validation for updating a team
export const validateUpdateTeam = [
  ...validateTeamId,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Team name must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Team name can only contain letters, numbers, spaces, hyphens, and underscores'),
];

// Middleware to check validation results
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  
  next();
};