const express = require('express');
const router = express.Router();
const Federation = require('../models/Federation');

// GET: Available States (Distinct states where active federations exist)
router.get('/states', async (req, res) => {
  try {
    const states = await Federation.distinct('state', { isActive: true });
    res.json({ success: true, states: states.sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Federations by State (e.g., /api/federations?state=Maharashtra)
router.get('/', async (req, res) => {
  try {
    const { state } = req.query;
    let query = { isActive: true };
    if (state) {
      query.state = state;
    }
    const federations = await Federation.find(query).sort({ federationName: 1 });
    res.json({ success: true, federations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST: Add new Federation (Admin only - middleware can be added here)
router.post('/', async (req, res) => {
  try {
    const { federationName, state, country } = req.body;
    const newFederation = new Federation({
      federationName,
      state,
      country: country || 'India'
    });
    const savedFederation = await newFederation.save();
    res.status(201).json({ success: true, federation: savedFederation });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Federation already exists in this state.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;