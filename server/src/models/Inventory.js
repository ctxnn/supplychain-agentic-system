import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  reserved: {
    type: Number,
    default: 0,
    min: [0, 'Reserved quantity cannot be negative']
  },
  available: {
    type: Number,
    default: function() {
      return this.quantity - this.reserved;
    }
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price must be positive']
  },
  cost: {
    type: Number,
    min: [0, 'Cost must be positive']
  },
  reorderPoint: {
    type: Number,
    default: 10,
    min: [0, 'Reorder point must be positive']
  },
  maxStock: {
    type: Number,
    default: 100,
    min: [1, 'Max stock must be at least 1']
  },
  supplier: {
    name: String,
    contactInfo: {
      email: String,
      phone: String,
      address: String
    },
    leadTime: {
      type: Number,
      default: 7 // days
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number,
    unit: {
      type: String,
      enum: ['cm', 'in', 'kg', 'lb'],
      default: 'cm'
    }
  },
  location: {
    aisle: String,
    shelf: String,
    bin: String
  },
  barcodes: [String],
  images: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  lastRestocked: {
    type: Date
  },
  expirationDate: {
    type: Date
  },
  stockHistory: [{
    action: {
      type: String,
      enum: ['restock', 'sale', 'adjustment', 'return', 'damage'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    previousQuantity: {
      type: Number,
      required: true
    },
    reason: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
inventorySchema.index({ storeId: 1, sku: 1 }, { unique: true });
inventorySchema.index({ storeId: 1, category: 1 });
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ reorderPoint: 1 });
inventorySchema.index({ isActive: 1 });

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.quantity <= this.reorderPoint) return 'low_stock';
  if (this.quantity >= this.maxStock * 0.8) return 'well_stocked';
  return 'normal';
});

// Virtual for available quantity
inventorySchema.virtual('availableQuantity').get(function() {
  return Math.max(0, this.quantity - this.reserved);
});

// Pre-save middleware to update available quantity
inventorySchema.pre('save', function(next) {
  this.available = Math.max(0, this.quantity - this.reserved);
  next();
});

// Method to reserve stock
inventorySchema.methods.reserveStock = function(quantity) {
  if (this.availableQuantity < quantity) {
    throw new Error('Insufficient stock available');
  }
  this.reserved += quantity;
  return this.save();
};

// Method to release reserved stock
inventorySchema.methods.releaseReservedStock = function(quantity) {
  this.reserved = Math.max(0, this.reserved - quantity);
  return this.save();
};

// Method to update stock with history
inventorySchema.methods.updateStock = function(action, quantity, reason, userId) {
  const previousQuantity = this.quantity;
  
  this.stockHistory.push({
    action,
    quantity,
    previousQuantity,
    reason,
    userId
  });
  
  switch (action) {
    case 'restock':
      this.quantity += quantity;
      this.lastRestocked = new Date();
      break;
    case 'sale':
      this.quantity = Math.max(0, this.quantity - quantity);
      this.reserved = Math.max(0, this.reserved - quantity);
      break;
    case 'adjustment':
      this.quantity = Math.max(0, quantity);
      break;
    case 'damage':
      this.quantity = Math.max(0, this.quantity - quantity);
      break;
    case 'return':
      this.quantity += quantity;
      break;
  }
  
  return this.save();
};

export default mongoose.model('Inventory', inventorySchema);