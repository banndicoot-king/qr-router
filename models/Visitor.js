const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  city: { type: String, default: "Unknown" },
  region: { type: String, default: "Unknown" },
  country: { type: String, default: "Unknown" },
  timezone: { type: String, default: "Unknown" },
  isp: { type: String, default: "Unknown" },
  lat: { type: Number, default: null },
  lon: { type: Number, default: null },
  timestamp: { type: String, required: true },
  device: {
    browser: { type: String, default: "Unknown" },
    os: { type: String, default: "Unknown" },
    type: { type: String, default: "Unknown" },
    vendor: { type: String, default: "Unknown" },
  },
});

module.exports = mongoose.model("Visitor", visitorSchema);
