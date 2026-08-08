const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    dateOfBirth: { type: Date, required: true }, // used to enforce 18+
    photoUrl: { type: String, default: '' },
    bio: { type: String, maxlength: 300, default: '' },
    interests: { type: [String], default: [] },
    // GeoJSON point for "nearby users" queries
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    locationUpdatedAt: { type: Date },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ location: '2dsphere' });

// Never expose password or exact coordinates by default
UserSchema.methods.toSafeObject = function (viewerDistanceMeters) {
  return {
    id: this._id,
    name: this.name,
    photoUrl: this.photoUrl,
    bio: this.bio,
    interests: this.interests,
    distance: viewerDistanceMeters != null ? formatDistance(viewerDistanceMeters) : undefined,
  };
};

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

module.exports = mongoose.model('User', UserSchema);
