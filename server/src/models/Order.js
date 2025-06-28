import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price must be positive']
  },
  category: {
    type: String,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount must be positive']
  },
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'US' },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  deliveryAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  route: {
    waypoints: [{
      lat: Number,
      lng: Number,
      address: String,
      timestamp: Date
    }],
    distance: Number,
    estimatedTime: Number,
    optimizationMode: {
      type: String,
      enum: ['time', 'fuel', 'distance'],
      default: 'time'
    }
  },
  tracking: {
    currentLocation: {
      lat: Number,
      lng: Number,
      timestamp: Date
    },
    statusHistory: [{
      status: String,
      timestamp: { type: Date, default: Date.now },
      location: {
        lat: Number,
        lng: Number
      },
      notes: String
    }]
  },
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'cash'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    amount: Number
  },
  notes: {
    customer: String,
    internal: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ orderId: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ storeId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ deliveryAgentId: 1 });
orderSchema.index({ 'deliveryAddress.zipCode': 1 });

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Pre-save middleware to calculate total amount
orderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.totalAmount = this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
  next();
});

// Method to add status update
orderSchema.methods.addStatusUpdate = function(status, location, notes) {
  this.tracking.statusHistory.push({
    status,
    location,
    notes,
    timestamp: new Date()
  });
  this.status = status;
  return this.save();
};

export default mongoose.model('Order', orderSchema);