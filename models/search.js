const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const searchSchema = new Schema({
    studies: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Study'
        }
    ],
    precentGenetic:{
        type:Number
    }

})

module.exports = mongoose.model('Search', searchSchema);
