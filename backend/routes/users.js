const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/users/profile - get my own profile
router.get('/profile', auth, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/users/profile - update name, bio, interests, photoUrl
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio, interests, photoUrl } = req.body;

    if (name !== undefined) req.user.name = name;
    if (bio !== undefined) req.user.bio = bio;
    if (interests !== undefined) req.user.interests = interests;
    if (photoUrl !== undefined) req.user.photoUrl = photoUrl;

    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// PUT /api/users/location - update approximate location for "nearby"
router.put('/location', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: 'latitude and longitude are required' });
    }

    req.user.location = { type: 'Point', coordinates: [longitude, latitude] };
    req.user.locationUpdatedAt = new Date();
    await req.user.save();

    res.json({ message: 'Location updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating location' });
  }
});

// GET /api/users/nearby?radiusKm=10
// Returns nearby users with an approximate/fuzzed distance, never exact coordinates.
router.get('/nearby', auth, async (req, res) => {
  try {
    const radiusKm = parseFloat(req.query.radiusKm) || 25;
    const [lng, lat] = req.user.location.coordinates;

    if (lng === 0 && lat === 0) {
      return res.status(400).json({ message: 'Set your location first to see nearby users' });
    }

    const users = await User.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: { _id: { $ne: req.user._id }, isActive: true },
        },
      },
      { $limit: 50 },
      {
        $project: {
          name: 1,
          photoUrl: 1,
          bio: 1,
          interests: 1,
          distanceMeters: 1,
        },
      },
    ]);

    const results = users.map((u) => {
      // Round distance to reduce precision -> "approximate distance" for privacy
      const roundedMeters = Math.round(u.distanceMeters / 250) * 250;
      const label =
        roundedMeters < 1000
          ? `${roundedMeters} m away`
          : `${(roundedMeters / 1000).toFixed(1)} km away`;

      return {
        id: u._id,
        name: u.name,
        photoUrl: u.photoUrl,
        bio: u.bio,
        interests: u.interests,
        distance: label,
      };
    });

    res.json({ users: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching nearby users' });
  }
});

// GET /api/users/:id - view another user's public profile
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        photoUrl: user.photoUrl,
        bio: user.bio,
        interests: user.interests,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

module.exports = router;
