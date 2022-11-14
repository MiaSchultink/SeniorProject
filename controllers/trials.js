const fetch = require('node-fetch')
const Study = require('../models/study')

const fs = require('fs');

let CONDITION = "Duchenne Muscular Dystrophy";
const KEYWORDS = ['Gene','Gene Therapy', 'Gene Editing', 'Cell Therapy'];
const NUM_STUDIES_GENERATED = 1000;

const generalFields = ["NCTId", "OfficialTitle", "LeadSponsorName", "DetailedDescription", "EnrollmentCount", "IsFDARegulatedDevice", "IsFDARegulatedDrug","InterventionType", "BriefTitle", "Condition", "StudyType","Phase", "OverallStatus","KeyWord"];
const timeFields = ["NCTId", "CompletionDate", "StartDate","TargetDuration"];
const participantFields = ["NCTId", "MaximumAge","MinimumAge"];
const resultFields = ["NCTId","SecondaryOutcomeDescription","PrimaryOutcomeDescription"]
const statsFields = ["NCTId","OutcomeAnalysisPValue","SeriousEventStatsNumEvents","SeriousEventStatsNumAffected"];


function buildURL(fields) {

    const splitCondition = CONDITION.split(" ");
    const urlStart = "https://clinicaltrials.gov/api/query/study_fields?expr=";
    const urlEnd = "&min_rnk=1&max_rnk=" + NUM_STUDIES_GENERATED + "&fmt=JSON";

    let urlMiddle = "";
    if (splitCondition.length > 1) {
        for (let i = 0; i < splitCondition.length - 1; i++) {
            urlMiddle += splitCondition[i] + "+";
        }
        urlMiddle += splitCondition[splitCondition.length - 1];
    }
    else {
        urlMiddle += CONDITION
    }
    urlMiddle += "&fields=";


    for (let i = 0; i < fields.length - 1; i++) {
        urlMiddle += fields[i] + "%2C";
    }
    urlMiddle += fields[fields.length - 1];

    const URL = urlStart + urlMiddle + urlEnd;

    return URL;
}


function containsKeyWords(phrase, keyWords){
    let result = false;
    for(let i=0; i<keyWords.length; i++){
        if(phrase.includes(keyWords[i])){
            result = true;
        }
    }
    return result;
}


async function fetchJSON(fields) {
    const url = buildURL(fields);
    const response = await fetch(url);
    const json = await response.json();
    return json;
}

// gets all json fields
function getJSONFields() {
    let jsonFields = {};
    const xml = fs.readFileSync('StudyFields.xml');
    let json = "";

    xml2js.parseString(xml, { mergeAttrs: true }, (err, result) => {
        if (err) {
            throw err;
        }
        const jsonString = JSON.stringify(result, null, 4);
        json = JSON.parse(jsonString);

    });
    jsonFields = json.StudyFields.FieldList[0].Field;

    return jsonFields
}

async function makeStudies() {
    try {
        await Study.deleteMany().exec();
        const retStudies = [];
        const json = await fetchJSON(generalFields, CONDITION);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        const numStudies = jsonStudies.length;

        for (let i = 0; i < numStudies; i++) {
            console.log(i)
            const isFDA = jsonStudies[i].IsFDARegulatedDevice[0] == "Yes" || jsonStudies[i].IsFDARegulatedDrug[0] == "Yes";

            const studyURL = 'https://clinicaltrials.gov/ct2/show/' + jsonStudies[i].NCTId[0];

            if (jsonStudies[i].Condition[0] == CONDITION &&(jsonStudies[i].InterventionType[0] == "Genetic")) {
                
                const study = new Study({
                    rank: jsonStudies[i].Rank,
                    NCTId: jsonStudies[i].NCTId[0],
                    type: jsonStudies[i].StudyType[0],
                    condition: jsonStudies[i].Condition[0],
                    briefTitle: jsonStudies[i].BriefTitle[0],
                    enrollment: jsonStudies[i].EnrollmentCount[0],
                    isFDAreg: isFDA,
                    status: jsonStudies[i].OverallStatus[0],
                    phase: jsonStudies[i].Phase[0],
                    leadSponsor: jsonStudies[i].LeadSponsorName[0],
                    interventionType: jsonStudies[i].InterventionType[0],
                    url: studyURL
                })
                console.log("Study Id", study.NCTId)
                if(jsonStudies[i].InterventionType[0]!=null){
                    console.log(jsonStudies[i].InterventionType[0]=="Genetic")
                }
        
                await study.save();

                retStudies.push(study)
            }

        }
        return retStudies
    }
    catch (err) {
        console.log(err)
    }
}

async function addTimeFields(){
    try{
       const json = await fetchJSON(timeFields, CONDITION);

       const jsonStudies = json.StudyFieldsResponse.StudyFields;

       for(jsonStudy of jsonStudies){

        const dbStudy = await Study.findOne({ NCTId: jsonStudy.NCTId[0] }).exec();
        console.log(dbStudy)
        if(dbStudy!=null){
            dbStudy.startDate = jsonStudy.StartDate[0];
            dbStudy.completionDate = jsonStudy.CompletionDate[0];
    
            await dbStudy.save();
        }
       
       }
    }
    catch (err) {
        console.log(err)
    }
}
async function addStatsFields(){

}
async function addParticipantFields(){

}
async function addResultsFields(){

}

exports.run = async(req, res, next) =>{

makeStudies();
addTimeFields();
   res.redirect('/')
}
