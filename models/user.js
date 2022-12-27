const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const userSchema = new Schema({

    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    resetToken: String,
    resetTokenExpiration: Date,
    job: {
        type: String
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'user'],
        default: 'user'
    },
    saved:
        [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Search'
            }
        ],
});

module.exports = mongoose.model('User', userSchema);