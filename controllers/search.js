const fetch = require('node-fetch')
const Study = require('../models/study')
const User = require('../models/user');
const Search = require('../models/search')

const fs = require('fs');
const jsPDF = require('jspdf')

const NUM_STUDIES_GENERATED = 100;

const generalFields = ["NCTId", "OfficialTitle", "LeadSponsorName", "DetailedDescription", "EnrollmentCount", "IsFDARegulatedDevice", "IsFDARegulatedDrug", "InterventionType", "BriefTitle", "Condition", "StudyType", "Phase", "OverallStatus", "KeyWord"];
const timeFields = ["NCTId", "CompletionDate", "StartDate", "TargetDuration"];
const participantFields = ["NCTId", "MaximumAge", "MinimumAge"];
const resultFields = ["NCTId", "SecondaryOutcomeDescription", "PrimaryOutcomeDescription"]
const statsFields = ["NCTId", "OutcomeAnalysisPValue", "SeriousEventStatsNumEvents", "SeriousEventStatsNumAffected"];


function combineFields() {

    const allFields = [];
    for (field of generalFields) {
        if (!allFields.includes(field)) {
            allFields.push(field)
        }
    }
    for (field of timeFields) {
        if (!allFields.includes(field)) {
            allFields.push(field)
        }
    }
    for (field of participantFields) {
        if (!allFields.includes(field)) {
            allFields.push(field)
        }
    }
    for (field of resultFields) {
        if (!allFields.includes(field)) {
            allFields.push(field)
        }
    }
    for (field of statsFields) {
        if (!allFields.includes(field)) {
            allFields.push(field)
        }
    }

    return allFields;
}
function generateUnselectedFields() {
    const selected = combineFields();
    const unselected = [];
    const jsonFieldsObject = getJSONFields();
    const jsonFields = jsonFieldsObject.StudyFields.Fields;
    for (field of jsonFields) {
        if (!selected.includes(field)) {
            unselected.push(field)
        }
    }
    return unselected;
}

function groupBy20(allSelected) {
    const groups = [];

    for (let i = 0; i < allSelected.length; i += 20) {
        const group = [];
        for (let j = i; j < i + 20; j++) {
            group.push(allSelected[j])
        }
        groups.push(group)
    }
    return groups
}

function getDayMonthYear(date) {
    const dateString = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    return dateString;
}

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


//get json fields using json file
function getJSONFields() {
    const jsonFileData = fs.readFileSync('StudyFields.json');
    const json = JSON.parse(jsonFileData);
    return json
}

//get json fields using xml file
function getJSONFieldsFromXMl() {
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
                let study = await Study.findOne({ NCTId: jsonStudy.NCTId[0] }).exec();
                if (study == null) {
                    study = new Study({
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

function checkAndConvertAge(stringAge) {
    const splitAge = stringAge.split(" ");
    let numAge = parseInt(splitAge[0]);
    if (splitAge[1] == "Months") {
        numAge = numAge / 12;
    }
    else if (splitAge[1] == "Days") {
        numAge = numAge / 365;
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
    const stringDate = getDayMonthYear(date);

    try {
        const newSearch = new Search({
            condition: condition,
            name: searchName,
            date: date,
            stringDate: stringDate
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

        res.redirect('/search/saved');
    }
    catch (err) {
        console.log(err)
    }

}

exports.getNewSearch = (req, res, next) => {
    try {
        const unselected = generateUnselectedFields();
        const selected = combineFields();
        res.render('new-search', {
            unselected: unselected,
            selected: selected
        });
    }
    catch (err) {
        console.log(err)
    }
}

exports.deleteSearch = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user._id).exec();
        const search = await Search.findById(req.body.searchId).exec();

        user.saved.pull(search);
        await search.remove();

        await user.save();
        res.redirect('/search/saved')
    }
    catch (err) {
        console.log(err)
    }

}

exports.getEditSearch = async (req, res, next) => {
    try {
    }
    catch (err) {
        console.log(err)
    }
}


exports.getSavedSearches = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user._id).populate('saved').exec();
        res.render("saved-searches", {
            user: user
        })
    }
    catch (err) {
        console.log(err)
        res.render('error')
    }

}

exports.getSingleSearch = async (req, res, next) => {
    try {
        const search = await Search.findById(req.params.searchId).populate('studies').exec();
        console.log("keys", Object.keys(search.studies[0].toJSON()))
        const excludeFields = ["__v", "_id"];

        console.log("search", search)
        res.render('view-search', {
            search: search,
            excludeFields: excludeFields
        })
    }
    catch (err) {
        console.log(err)
    }
}

exports.filterStudies = async (req, res, next) => {
    try {
        const search = await Search.findById(req.params.searchId).populate('studies').exec();


    }
    catch (err) {
        console.log(err)
    }
}

exports.searchToJson = async (req, res, next) => {
    const search = await Search.findById(req.body.searchId).exec();
    const stringSearch = JSON.stringify(search)
    const fileName = search.name + ".json"

    const file = fs.writeFileSync(fileName, stringSearch, (err) => {
        if (err) {
            console.error(err);
        }
    });
    res.download(fileName);
    fs.unlinkSync(fileName);
}

function toCSV(record) {
    // Get the keys of the record (i.e. the field names)
    const keys = Object.keys(record);
    // Create an array to store the values for each field
    const values = keys.map(key => record[key]);
    // Join the keys and values into a single CSV string and return it
    return `${keys.join(',')}\n${values.join(',')}`;
}

exports.searchToCSV = async (req, res, next) => {
    const search = await Search.findById(req.body.searchId).exec();
    const fileName = search.name + ".csv"

    const csvString = toCSV(search);
    fs.writeFilesync(fileName, csvString)
    res.download(fileName);
    fs.unlinkSync(fileName)
    res.redirect('/search/saved');
}

exports.searchToPDF = async (req, res, next) => {
    const search = await Search.findById(req.body.searchId).exec();
    const fileName = search.name + ".pdf";
    const csvContents = toCSV(search);
    let rows = csvContents.split('\n');

    // Create a new PDF document
    let doc = new jsPDF();
    // Iterate through the rows and add them to the PDF
    rows.forEach((row) => {
        doc.text(row, 10, 10);
    });

    // Save the PDF
    doc.save(fileName);

    res.download(fileName);
    fs.unlinkSync(fileName)
    res.redirect('/search/saved')
}



