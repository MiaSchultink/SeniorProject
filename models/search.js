const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const searchSchema = new Schema({
    condition:{
        type:String
    },
    name:{
        type:String,
        unique: true
    },
    studies: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Study'
        }
    ],
    precentGenetic:{
        type:Number
    },
    date:{
        type:Date
    },
    stringDate:{
        type:String
    },
    userSelectedFields:{
        type: [String]
    }

})

module.exports = mongoose.model('Search', searchSchema);
