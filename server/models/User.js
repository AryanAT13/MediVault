const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    walletAddress: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true // Auto-converts to lowercase to avoid case-sensitive bugs
    },
    userType: {
        type: String,
        enum: ['patient', 'hospital'], // Can only be one of these two
        required: true
    },
    // For Patients: List of hospitals requesting access
    pendingRequests: [{
        hospitalAddress: { type: String, lowercase: true },
        hospitalName: { type: String },
        timestamp: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('User', UserSchema);