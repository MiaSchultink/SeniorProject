const mongoose = require('mongoose');
const fs = require('fs')

const Schema = mongoose.Schema;
const studySchema = new Schema({

    isFDAReg: {
        type: Boolean
    },
    hasResults: {
        type: Boolean,
        default: false
    },
    url: {
        type: String,
    },
    timeStamp:{
        type:Date,
        unique: true
    }
})

const jsonFileData = fs.readFileSync('StudyFields.json');
const json = JSON.parse(jsonFileData)


//array of field names
const jsonFields  = json.StudyFields.Fields;
const userSelectedFields = {}

for (let i = 0; i < jsonFields.length; i++) {
    const propKey = jsonFields[i]
    userSelectedFields[propKey] = {
        type: String
    }
    studySchema.add(userSelectedFields)
}

module.exports = mongoose.model('Study', studySchema)
