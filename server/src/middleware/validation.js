import { validationResult } from 'express-validator';
import Joi from 'joi';

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  next();
};

const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  user: {
    register: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required()
        .messages({
          'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
        }),
      firstName: Joi.string().min(2).max(50).required(),
      lastName: Joi.string().min(2).max(50).required(),
      role: Joi.string().valid('admin', 'store_manager', 'delivery_agent', 'customer', 'agent').default('customer'),
      storeId: Joi.string().when('role', {
        is: Joi.string().valid('store_manager', 'delivery_agent'),
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    }),
    
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    }),
    
    updateProfile: Joi.object({
      firstName: Joi.string().min(2).max(50),
      lastName: Joi.string().min(2).max(50),
      preferences: Joi.object({
        notifications: Joi.object({
          email: Joi.boolean(),
          push: Joi.boolean(),
          sms: Joi.boolean()
        }),
        theme: Joi.string().valid('light', 'dark', 'auto')
      })
    })
  },
  
  order: {
    create: Joi.object({
      storeId: Joi.string().required(),
      items: Joi.array().items(
        Joi.object({
          sku: Joi.string().required(),
          quantity: Joi.number().integer().min(1).required()
        })
      ).min(1).required(),
      deliveryAddress: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().required(),
        country: Joi.string().default('US')
      }).required(),
      paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'cash').required(),
      notes: Joi.string().max(500)
    }),
    
    updateStatus: Joi.object({
      status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').required(),
      notes: Joi.string().max(500),
      location: Joi.object({
        lat: Joi.number().min(-90).max(90),
        lng: Joi.number().min(-180).max(180)
      })
    })
  },
  
  inventory: {
    create: Joi.object({
      sku: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string(),
      category: Joi.string().required(),
      storeId: Joi.string().required(),
      quantity: Joi.number().integer().min(0).required(),
      price: Joi.number().min(0).required(),
      cost: Joi.number().min(0),
      reorderPoint: Joi.number().integer().min(0).default(10),
      maxStock: Joi.number().integer().min(1).default(100)
    }),
    
    updateStock: Joi.object({
      action: Joi.string().valid('restock', 'sale', 'adjustment', 'return', 'damage').required(),
      quantity: Joi.number().integer().min(0).required(),
      reason: Joi.string().max(200)
    })
  }
};

export { handleValidationErrors, validateSchema, schemas };