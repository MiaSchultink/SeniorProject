const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const studySchema= new Schema({
    NCTId:{
        type:String,
        required: true,
        unique:true
    },
    briefTitle:{
        type:String
    },
    status:{
        type:String
    },
    enrolment:{
        type:Number
    },
    minAge:{
        type:Number
    },
    maxAge:{
        type:Number
    },
    condition:{
        type:String
    },
    leadSponsor:{
        type:String
    },
    type:{
        type:String
    },
    phase:{
        type:String
    },
    isFDAReg:{
        type:Boolean
    },
    interventionType:{
        type:String
    },
    startDate:{
        type:String
    },
    duration:{
        type:String
    },
    completionDate:{
        type:String
    },
    primaryOutcomes:{
        type:String,
    },
    pValue:{
        type:Number
    },
    numSeriousEvents:{
        type:Number
    },
    numAffectedBySeriousEvents:{
        type:Number
    },
    precentGeneticTreatment:{
        type:Number
    },
    url:{
        type:String
    }

})

module.exports = mongoose.model('Study', studySchema);
