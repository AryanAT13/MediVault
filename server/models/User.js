const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    walletAddress: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    userType: {
        type: String,
        enum: ['patient', 'hospital'],
        required: true
    },
    pendingRequests: [{
        hospitalAddress: { type: String, lowercase: true },
        hospitalName: { type: String },
        timestamp: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('User', UserSchema);