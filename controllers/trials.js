const fetch = require('node-fetch')
const Study = require('../models/study')
const User = require('../models/user');
const Search = require('../models/search')

const fs = require('fs');

const NUM_STUDIES_GENERATED = 100;

const generalFields = ["NCTId", "OfficialTitle", "LeadSponsorName", "DetailedDescription", "EnrollmentCount", "IsFDARegulatedDevice", "IsFDARegulatedDrug", "InterventionType", "BriefTitle", "Condition", "StudyType", "Phase", "OverallStatus", "KeyWord"];
const timeFields = ["NCTId", "CompletionDate", "StartDate", "TargetDuration"];
const participantFields = ["NCTId", "MaximumAge", "MinimumAge"];
const resultFields = ["NCTId", "SecondaryOutcomeDescription", "PrimaryOutcomeDescription"]
const statsFields = ["NCTId", "OutcomeAnalysisPValue", "SeriousEventStatsNumEvents", "SeriousEventStatsNumAffected"];


function buildURL(fields, condition) {

    const splitCondition = condition.split(" ");
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
        urlMiddle += condition
    }
    urlMiddle += "&fields=";


    for (let i = 0; i < fields.length - 1; i++) {
        urlMiddle += fields[i] + "%2C";
    }
    urlMiddle += fields[fields.length - 1];

    const URL = urlStart + urlMiddle + urlEnd;

    return URL;
}


async function fetchJSON(fields, condition) {
    const url = buildURL(fields, condition);
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

async function makeStudies(condition) {
    try {
        await Study.deleteMany().exec();
        const retStudies = [];
        const json = await fetchJSON(generalFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {

            const isFDA = jsonStudy.IsFDARegulatedDevice[0] == "Yes" || jsonStudy.IsFDARegulatedDrug[0] == "Yes";
            const studyURL = 'https://clinicaltrials.gov/ct2/show/' + jsonStudy.NCTId[0];

            if (jsonStudy.Condition[0] == condition && (jsonStudy.InterventionType[0] == "Genetic")) {

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

async function addTimeFields(condition) {
    try {
        const json = await fetchJSON(timeFields, condition);
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
async function addStatsFields(condition) {
    try {
        const json = await fetchJSON(statsFields, condition);
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

function checkAndConvertAge(stringAge){
    const splitAge = stringAge.split(" ");
    let numAge = parseInt(splitAge[0]);
    if(splitAge[1]=="Months"){
        numAge = numAge/12;
    }
    else if(splitAge[1] == "Days"){
        numAge = numAge/365;
    }

    return numAge;
}

async function addParticipantFields(condition) {
    try {
        const json = await fetchJSON(participantFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {
            const dbStudy = await Study.findOne({ NCTId: jsonStudy.NCTId[0] }).exec();
            if (dbStudy != null) {
                console.log("Study Id", dbStudy.NCTId)

                if (jsonStudy.MinimumAge[0] != null && !isNaN(parseInt(jsonStudy.MinimumAge[0]))) {
                    const numMinAge = checkAndConvertAge(jsonStudy.MinimumAge[0]);
                    dbStudy.minAge = numMinAge;
                }
                if (jsonStudy.MaximumAge[0] != null && !isNaN(parseInt(jsonStudy.MaximumAge[0]))) {
                    const numMaxAge = checkAndConvertAge(jsonStudy.MaximumAge[0]);
                    dbStudy.maxAge = numMaxAge;
                }
                await dbStudy.save();
            }

        }
    }
    catch (err) {
        console.log(err)
    }
}
async function addResultsFields(condition) {
    try {
        const json = await fetchJSON(resultFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {
            if (jsonStudy != null) {

                const dbStudy = await Study.findOne({ NCTId: jsonStudy.NCTId[0] }).exec();

                if (dbStudy != null) {
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

exports.startNewSearch = async (req, res, next) => {
    const user = await User.findById(req.session.user._id).exec();
    const searchName = req.body.name;
    const condition = req.body.condition;
    const date = new Date();

    try {
        const newSearch = new Search({
            condition: condition,
            name: searchName,
            date:date
        })

        const studies = await makeStudies(condition);
        console.log("Studies made")
        newSearch.studies = studies;

        await addTimeFields(condition);
        console.log("time fields added")
        await addStatsFields(condition);
        console.log("stats fields added")
        await addParticipantFields(condition);
        console.log("participant fields added")
        await addResultsFields(condition);
        console.log("result fields added")

        await newSearch.save();
        user.saved.push(newSearch);
        await user.save();

        res.redirect('/user/saved');
    }
    catch (err) {
        console.log(err)
    }

}


exports.getNewSearch = (req, res, next) => {
    try {
        res.render('new-search');
    }
    catch (err) {
        console.log(err)
    }
}


