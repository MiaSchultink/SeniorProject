const fetch = require('node-fetch')
const Study = require('../models/study')
const User = require('../models/user');
const Search = require('../models/search')

const fs = require('fs');
const json2csv = require('json2csv').parse;



const NUM_STUDIES_GENERATED = 100;

const createFields = ["NCTId", "InterventionType", "Condition"]
const generalFields = ["NCTId", "OfficialTitle", "LeadSponsorName", "DetailedDescription", "EnrollmentCount", "IsFDARegulatedDevice", "IsFDARegulatedDrug", "BriefTitle", "StudyType", "Phase", "OverallStatus"];
const timeFields = ["NCTId", "CompletionDate", "StartDate", "TargetDuration"];
const participantFields = ["NCTId", "MaximumAge", "MinimumAge"];
const resultFields = ["NCTId", "SecondaryOutcomeDescription", "PrimaryOutcomeDescription","ResultsFirstPostDate"]
const statsFields = ["NCTId", "OutcomeAnalysisPValue", "SeriousEventStatsNumEvents", "SeriousEventStatsNumAffected"];

const excludeFields = ["NCTId", "MinumumAge", "MaximumAge", "IsFDARegulatedDevice", "IsFDARegulatedDrug","Keyword"];

function combineFields() {

    const allFields = [];
    for(field of createFields){
        if(!allFields.includes(field)){
            allFields.push(field)
        }
    }
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

    for (let i = 0; i < allSelected.length; i += 19) {
        const group = ["NCTId"];
        let j=i;
        while(j<i+19 && j<allSelected.length){
            group.push(allSelected[j])
            j++;
        }
        console.log(group)
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
        const retStudies = [];
        const json = await fetchJSON(createFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {

            if (jsonStudy.Condition[0] == condition && (jsonStudy.InterventionType[0] == "Genetic")) {
                 let study = await Study.findOne({ NCTId: jsonStudy.NCTId[0] }).exec();
                if (study == null) {
                    study = new Study({
                        NCTId: jsonStudy.NCTId[0],
                        Condition: jsonStudy.Condition[0],
                        InterventionType: jsonStudy.InterventionType[0]
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

async function addGeneralFields(condition){
    try{
        const json = await fetchJSON(generalFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;
        for (jsonStudy of jsonStudies) {

            const isFDA = jsonStudy.IsFDARegulatedDevice[0] == "Yes" || jsonStudy.IsFDARegulatedDrug[0] == "Yes";
            const studyURL = 'https://clinicaltrials.gov/ct2/show/' + jsonStudy.NCTId[0];

            const dbStudy = await Study.findOne({NCTId: jsonStudy.NCTId[0]}).exec();
            if(dbStudy!=null){
                for(let i=0; i<generalFields.length; i++){
                    if(!excludeFields.includes(generalFields[i])){
                        console.log(generalFields[i])
                        if(jsonStudy[generalFields[i]][0]!=null){
                            dbStudy[generalFields[i]] = jsonStudy[generalFields[i]][0];
                        }
                        
                    }
                }
                dbStudy.isFDAReg = isFDA;
                dbStudy.url= studyURL;

                await dbStudy.save();
            }
        }
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
                dbStudy.StartDate = jsonStudy.StartDate[0];
                dbStudy.CompletionDate = jsonStudy.CompletionDate[0];
                const miliStartDObjcet = new Date(dbStudy.StartDate);
                const miliStartD = miliStartDObjcet.getTime();
                const miliCompDObject  = new Date(dbStudy.CompletionDate);
                const miliCompD = miliCompDObject.getTime();
                dbStudy.miliStartD = miliStartD;
                dbStudy.miliCompD = miliCompD;
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
                    dbStudy.PValue = parseInt(sonStudy.OutcomeAnalysisPValue[0]);
                }
                console.log("serious events", jsonStudy.SeriousEventStatsNumEvents[0])
                if (jsonStudy.SeriousEventStatsNumEvents[0] != null) {
                    dbStudy.NumSeriousEvents = parseInt(jsonStudy.SeriousEventStatsNumEvents[0]);
                }
                console.log("num affected", jsonStudy.SeriousEventStatsNumAffected[0])
                if (jsonStudy.SeriousEventStatsNumAffected[0] != null) {
                    dbStudy.NumAffectedBySeriousEvents = parseInt(jsonStudy.SeriousEventStatsNumAffected[0]);
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
                        dbStudy.PrimaryOutcomeDescription = jsonStudy.PrimaryOutcomeDescription[0];
                    }
                    if(jsonStudy.ResultsFirstPostDate.length>0){
                        dbStudy.hasResults = true;
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

async function addAdditionalSelectedFields(condition, additionalFields){
    try{
        const groupedFields = groupBy20(additionalFields);

        for(let i=0; i<groupedFields.length; i++){
            const currentFields = groupedFields[i];
            const json = await fetchJSON(currentFields, condition);
            const jsonStudies = json.StudyFieldsResponse.StudyFields;
            for(jsonStudy of jsonStudies){
                const dbStudy = await Study.findOne({NCTId: jsonStudy.NCTId[0]}).exec();
                if(dbStudy!=null){
                    for(let j=0; j<currentFields.length; j++){
                        console.log(jsonStudy[currentFields[j]][0]);
                        console.log(currentFields[j])
                        dbStudy[currentFields[j]] = jsonStudy[currentFields[j]][0];
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
    console.log(req.body)
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
        await addGeneralFields(condition);
        console.log("general fields added")
        await addTimeFields(condition);
        console.log("time fields added")
        await addStatsFields(condition);
        console.log("stats fields added")
        await addParticipantFields(condition);
        console.log("participant fields added")
        await addResultsFields(condition);
        console.log("result fields added")
        const additionalFields =[];
        const keys = Object.keys(req.body);
        for(let k=0; k<keys.length; k++){
            if(keys[k]!="name"&&keys[k]!="condition"&&keys[k]!="_csrf"){
                additionalFields.push(keys[k]);
            }
        }
        await addAdditionalSelectedFields(condition, additionalFields);
        console.log("addional fields added")

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
        const search = await Search.findById(req.params.searchId).populate("studies").exec();
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
    try{
    const search = await Search.findById(req.body.searchId).populate("studies").exec();
    const stringSearch = JSON.stringify(search);
    console.log(stringSearch)
    const fileName = search.name + ".json";

    res.setHeader('Content-disposition', `attachment; filename= "${fileName}"`);
    res.setHeader('Content-type', 'application/json');
    res.write(stringSearch);
    res.end();
    }
    catch (err) {
        console.log(err)
    }
    
}

function jsToCSV(record) {
    // Get the keys of the record (i.e. the field names)
    const fields = Object.keys(record.toJSON());
    const json = JSON.stringify(record);
    const csv = json2csv(json, {fields});
    return csv;
}

function getFields(studies){
    const fields = [];
    for(let i=0; i<studies.length; i++){
        const keys = Object.keys(studies[i].toJSON());
        for(let j=0; j<keys.length; j++){
            if(!fields.includes(keys[j])){
                fields.push(keys[j]);
            }
        }
    }
    return fields;
}

exports.searchToCSV = async (req, res, next) => {
    const search = await Search.findById(req.body.searchId).populate("studies").exec();
    const studies = search.studies;
    const fields= getFields(studies)
    const options = {fields}
    const csv = json2csv(studies, options)
    const fileName = search.name + ".csv"
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.write(csv)
    res.end();
}

