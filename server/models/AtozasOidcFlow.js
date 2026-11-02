const mongoose = require('mongoose');

const atozasOidcFlowSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  nonce: { type: String, required: true },
  verifier: { type: String, required: true },
  returnTo: { type: String, default: '/home' },
  createdAt: { type: Date, default: Date.now, expires: 600 },
}, {
  collection: 'atozas_oidc_flows',
  versionKey: false,
});

module.exports = mongoose.models.AtozasOidcFlow
  || mongoose.model('AtozasOidcFlow', atozasOidcFlowSchema);
