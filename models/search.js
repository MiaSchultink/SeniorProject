const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const searchSchema = new Schema({
    condition:{
        type:String
    },
    studies: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Study'
        }
    ],
    name:{
        type:String
    },
    precentGenetic:{
        type:Number
    }

})

module.exports = mongoose.model('Search', searchSchema);
