const mongoose = require('mongoose');
const fs = require('fs')

const Schema = mongoose.Schema;
const studySchema = new Schema({

    isFDAReg: {
        type: Boolean
    },
    miliStartD:{
        type: Number
    },
    miliCompD: {
        type: Number
    },
    hasResults: {
        type: Boolean,
        default: false
    },
    url: {
        type: String,
    },
})

const jsonFileData = fs.readFileSync('StudyFields.json');
const json = JSON.parse(jsonFileData)


//array of field names
const jsonFields  = json.StudyFields.Fields;
const extras  ={}
for (let i = 0; i < jsonFields.length; i++) {
    const propKey = jsonFields[i]
    let unique = false
    if(propKey =='NCTId'){
        unique = true
    }
    extras[propKey] = {
        type: String,
        unique: unique
    }
    studySchema.add(extras)
}

module.exports = mongoose.model('Study', studySchema)
