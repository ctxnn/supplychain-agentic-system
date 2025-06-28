import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  storeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'US' }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'closed', 'temporarily_closed'],
    default: 'active'
  },
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  contactInfo: {
    phone: String,
    email: String,
    fax: String
  },
  capacity: {
    maxOrders: { type: Number, default: 100 },
    maxDeliveryRadius: { type: Number, default: 25 }, // km
    staffCount: { type: Number, default: 10 }
  },
  services: [{
    type: String,
    enum: ['pickup', 'delivery', 'curbside', 'express']
  }],
  deliveryZones: [{
    name: String,
    zipCodes: [String],
    deliveryFee: Number,
    minimumOrder: Number
  }],
  metrics: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    customerSatisfaction: { type: Number, default: 0, min: 0, max: 5 },
    deliveryTime: { type: Number, default: 0 }, // minutes
    lastUpdated: { type: Date, default: Date.now }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial index for location-based queries
storeSchema.index({ location: '2dsphere' });
storeSchema.index({ storeId: 1 });
storeSchema.index({ status: 1 });
storeSchema.index({ managerId: 1 });
storeSchema.index({ 'address.zipCode': 1 });

// Virtual for full address
storeSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
});

// Method to check if store is open
storeSchema.methods.isOpen = function(date = new Date()) {
  if (this.status !== 'active') return false;
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[date.getDay()];
  const hours = this.operatingHours[dayName];
  
  if (!hours || !hours.open || !hours.close) return false;
  
  const currentTime = date.getHours() * 60 + date.getMinutes();
  const [openHour, openMin] = hours.open.split(':').map(Number);
  const [closeHour, closeMin] = hours.close.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  
  return currentTime >= openTime && currentTime <= closeTime;
};

// Method to calculate distance to a point
storeSchema.methods.distanceTo = function(lat, lng) {
  const [storeLng, storeLat] = this.location.coordinates;
  const R = 6371; // Earth's radius in km
  const dLat = (lat - storeLat) * Math.PI / 180;
  const dLng = (lng - storeLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(storeLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Method to update metrics
storeSchema.methods.updateMetrics = function(orderData) {
  this.metrics.totalOrders += 1;
  this.metrics.totalRevenue += orderData.amount;
  this.metrics.averageOrderValue = this.metrics.totalRevenue / this.metrics.totalOrders;
  this.metrics.lastUpdated = new Date();
  return this.save();
};

export default mongoose.model('Store', storeSchema);