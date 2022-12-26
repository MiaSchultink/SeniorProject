const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const snapShotSchema = new Schema({
    study:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Study'
    },
    fields:{
        type: [String]
    },
    timeStamp:{
        type:Date,
        required: true,
        uniqe: true
    }
    
})

module.exports = mongoose.model('Snapshot', snapShotSchema);
