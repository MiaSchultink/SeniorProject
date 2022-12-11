const fetch = require('node-fetch')
const Study = require('../models/study')

const fs = require('fs');

let CONDITION = "Duchenne Muscular Dystrophy";
const NUM_STUDIES_GENERATED = 1000;

const generalFields = ["NCTId", "OfficialTitle", "LeadSponsorName", "DetailedDescription", "EnrollmentCount", "IsFDARegulatedDevice", "IsFDARegulatedDrug", "InterventionType", "BriefTitle", "Condition", "StudyType", "Phase", "OverallStatus", "KeyWord"];
const timeFields = ["NCTId", "CompletionDate", "StartDate", "TargetDuration"];
const participantFields = ["NCTId", "MaximumAge", "MinimumAge"];
const resultFields = ["NCTId", "SecondaryOutcomeDescription", "PrimaryOutcomeDescription"]
const statsFields = ["NCTId", "OutcomeAnalysisPValue", "SeriousEventStatsNumEvents", "SeriousEventStatsNumAffected"];


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

        for (jsonStudy of jsonStudies) {

            const isFDA = jsonStudy.IsFDARegulatedDevice[0] == "Yes" || jsonStudy.IsFDARegulatedDrug[0] == "Yes";
            const studyURL = 'https://clinicaltrials.gov/ct2/show/' + jsonStudy.NCTId[0];

            if (jsonStudy.Condition[0] == CONDITION && (jsonStudy.InterventionType[0] == "Genetic")) {

                const study = new Study({
                    rank: jsonStudy.Rank,
                    NCTId: jsonStudy.NCTId[0],
                    type: jsonStudy.StudyType[0],
                    condition: jsonStudy.Condition[0],
                    briefTitle: jsonStudy.BriefTitle[0],
                    enrollment: jsonStudy.EnrollmentCount[0],
                    isFDAreg: isFDA,
                    status: jsonStudy.OverallStatus[0],
                    phase: jsonStudy.Phase[0],
                    leadSponsor: jsonStudy.LeadSponsorName[0],
                    interventionType: jsonStudy.InterventionType[0],
                    url: studyURL
                })
                console.log("Study Id", study.NCTId)
                if (jsonStudy.InterventionType[0] != null) {
                    console.log('has intervention type', jsonStudy.InterventionType[0] == "Genetic")
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

async function addTimeFields() {
    try {
        const json = await fetchJSON(timeFields, CONDITION);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {

            const dbStudy = await Study.findOne({ NCTId: jsonStudy.NCTId[0] }).exec();
            if (dbStudy != null) {
                console.log("Study Id", dbStudy.NCTId)
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
async function addStatsFields() {
    try {
        const json = await fetchJSON(statsFields, CONDITION);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {

            const dbStudy = await Study.findOne({ NCTId: jsonStudy.NCTId[0] }).exec();
            if (dbStudy != null) {
                console.log("Study Id", dbStudy.NCTId);
                console.log('p value', jsonStudy.OutcomeAnalysisPValue[0])
                if (jsonStudy.OutcomeAnalysisPValue[0] != null) {
                    dbStudy.pValue = parseInt(sonStudy.OutcomeAnalysisPValue[0]);
                }
                console.log("serious events", jsonStudy.SeriousEventStatsNumEvents[0])
                if (jsonStudy.SeriousEventStatsNumEvents[0] != null) {
                    dbStudy.numSeriousEvents = parseInt(jsonStudy.SeriousEventStatsNumEvents[0]);
                }
                console.log("num affected", jsonStudy.SeriousEventStatsNumAffected[0])
                if (jsonStudy.SeriousEventStatsNumAffected[0] != null) {
                    dbStudy.numAffectedBySeriousEvents = parseInt(jsonStudy.SeriousEventStatsNumAffected[0]);
                }
                await dbStudy.save();
            }

        }
    }
    catch (err) {
        console.log(err)
    }
}
async function addParticipantFields() {
    try {
        const json = await fetchJSON(participantFields, CONDITION);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {
            const dbStudy = await Study.findOne({ NCTId: jsonStudy.NCTId[0] }).exec();
            if (dbStudy != null) {
                console.log("Study Id", dbStudy.NCTId)
                if (jsonStudy.MinimumAge[0] !=null && !isNaN(parseInt(jsonStudy.MinimumAge[0]))) {
                    dbStudy.minAge = parseInt(jsonStudy.MinimumAge[0])
                }
                if (jsonStudy.MaximumAge[0] != null && !isNaN(parseInt(jsonStudy.MaximumAge[0]))) {
                    dbStudy.maxAge = parseInt(jsonStudy.MaximumAge[0])
                }
                await dbStudy.save();
            }

        }
    }
    catch (err) {
        console.log(err)
    }
}
async function addResultsFields() {
    try {
        const json = await fetchJSON(resultFields, CONDITION);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {
            if (jsonStudy != null) {
      
                const dbStudy = await Study.findOne({ NCTId: jsonStudy.NCTId[0] }).exec();
        
                if(dbStudy!=null){
                    console.log("Study Id", dbStudy.NCTId)
                    if (jsonStudy.PrimaryOutcomeDescription[0] != null) {
                        dbStudy.primaryOutcomes = jsonStudy.PrimaryOutcomeDescription[0];
                    }
                    await dbStudy.save();
                }
               
            }
        }
    }
    catch (err) {
        console.log(err)
    }
}

exports.run = async (req, res, next) => {

    // await makeStudies();
    // console.log("Studies made")
    // await addTimeFields();
    // console.log("time info added")
    // await addStatsFields();
    // console.log("Stats info added");
    // await addParticipantFields();
    // console.log("participant fields added")
    await addResultsFields();
    console.log("results added");
    res.redirect('/');
}
