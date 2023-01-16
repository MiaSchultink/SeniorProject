const fetch = require('node-fetch')
const Study = require('../models/study')
const User = require('../models/user');
const Search = require('../models/search');

const fs = require('fs');
const { type } = require('os');
const json2csv = require('json2csv').parse;



const NUM_STUDIES_GENERATED = 1000;

const createFields = ["NCTId", "InterventionType", "Condition"]
const generalFields = ["NCTId", "OfficialTitle","LeadSponsorName", "DetailedDescription", "EnrollmentCount", "DesignPrimaryPurpose", "IsFDARegulatedDevice", "IsFDARegulatedDrug", "BriefTitle", "StudyType", "Phase", "OverallStatus"];
const timeFields = ["NCTId", "CompletionDate", "StartDate", "TargetDuration"];
const locationFields = ["NCTId", "LocationCity", "LocationCountry", "LocationFacility"];
const participantFields = ["NCTId", "MaximumAge", "MinimumAge"];
const resultFields = ["NCTId", "SecondaryOutcomeDescription", "PrimaryOutcomeDescription", "ResultsFirstPostDate"]
const statsFields = ["NCTId", "OutcomeAnalysisPValue", "SeriousEventStatsNumEvents", "SeriousEventStatsNumAffected"];

const excludeFields = ["NCTId", "MinimumAge", "MaximumAge", "IsFDARegulatedDevice", "IsFDARegulatedDrug", "Keyword"];

function combineFields() {

    const allFields = [];
    for (field of createFields) {
        if (!allFields.includes(field)) {
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
    for (field of locationFields){
        if(!allFields.includes(field)){
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
        let j = i;
        while (j < i + 19 && j < allSelected.length) {
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

function fixConditionString(condStr){
    const trimmed = condStr.trim();
    const lower = trimmed.toLowerCase();
    const words = lower.split(" ");
    let result = "";
    for(let i=0; i<words.length; i++){
        const word = words[i].charAt(0).toUpperCase() + words[i].slice(1);
        result += word+" ";
    }
    result = result.trim();
    return result;
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

async function addStudyFields(condition, study, userSelectedFields) {

    await addGeneralFields(condition, study);
    console.log("general added")
    await addTimeFields(condition, study);
    console.log("time added")
    await addLocationFields(condition, study)
    console.log("locations added")
    await addStatsFields(condition, study);
    console.log("stats added")
    await addParticipantFields(condition, study);
    console.log("part added")
    await addResultsFields(condition, study);
    console.log("results added")
    await addAdditionalSelectedFields(condition, userSelectedFields, study)
    console.log("extra added")

    const currnetTime = new Date();
    const timeStamp = currnetTime.getTime();
    study.timeStamp = timeStamp
    await study.save();
}

async function makeStudies(search) {
    try {
        const retStudies = [];
        const json = await fetchJSON(createFields, search.condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {

            if (jsonStudy.Condition[0] == search.condition && (jsonStudy.InterventionType[0] == "Genetic")) {

                const study = new Study({
                    NCTId: jsonStudy.NCTId[0],
                    Condition: jsonStudy.Condition[0],
                    InterventionType: jsonStudy.InterventionType[0]
                })
                console.log("study made")
                await addStudyFields(search.condition, study, search.userSelectedFields)
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

async function updateStudies(search) {
    try {
        const json = await fetchJSON(createFields, search.condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {
            for(searchResult of search.studies){
                if(searchResult.NCTId == jsonStudy.NCTId[0]){
                    const study = await Study.findById(searchResult._id).exec();
                    await addStudyFields(search.condition, study, search.userSelectedFields);
                    const currentTime = new Date();
                    const timeStamp = currentTime.getTime();
                    study.timeStamp = timeStamp;
                    await study.save();
                }
            }
        }
    }
    catch (err) {
        console.log(err)
    }
}

async function addGeneralFields(condition, dbStudy) {
    try {
        const json = await fetchJSON(generalFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;
        for (jsonStudy of jsonStudies) {

            const isFDA = jsonStudy.IsFDARegulatedDevice[0] == "Yes" || jsonStudy.IsFDARegulatedDrug[0] == "Yes";
            const studyURL = 'https://clinicaltrials.gov/ct2/show/' + jsonStudy.NCTId[0];

            if (dbStudy.NCTId == jsonStudy.NCTId[0]) {
                for (let i = 0; i < generalFields.length; i++) {
                    if (!excludeFields.includes(generalFields[i])) {
                        console.log(generalFields[i])
                        if (jsonStudy[generalFields[i]][0] != null) {
                            dbStudy[generalFields[i]] = jsonStudy[generalFields[i]][0];
                        }

                    }
                }
                dbStudy.isFDAReg = isFDA;
                dbStudy.url = studyURL;

                await dbStudy.save();
            }
        }
    }
    catch (err) {
        console.log(err)
    }
}

async function addTimeFields(condition, dbStudy) {
    try {
        const json = await fetchJSON(timeFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {

            if (dbStudy.NCTId == jsonStudy.NCTId[0]) {
                console.log("Study Id", dbStudy.NCTId)
                dbStudy.StartDate = jsonStudy.StartDate[0];
                dbStudy.CompletionDate = jsonStudy.CompletionDate[0];
                await dbStudy.save();
            }

        }
    }
    catch (err) {
        console.log(err)
    }
}
async function addLocationFields(condition, dbStudy){
    try{
        const json = await fetchJSON(locationFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for(jsonStudy of jsonStudies){
            if(dbStudy.NCTId == jsonStudy.NCTId[0]){
                
                if(jsonStudy.LocationCountry[0] !=null){
                    dbStudy.LocationCountry = jsonStudy.LocationCountry[0];
                }
                if(jsonStudy.LocationCity[0] != null){
                    dbStudy.LocationCity = jsonStudy.LocationCity[0];
                }
                if(jsonStudy.LocationFacility[0] != null){
                    dbStudy.LocationFacility = jsonStudy.LocationFacility[0];
                }
                await dbStudy.save();
            }
        }
    }
    catch (err) {
        console.log(err)
    }
}

async function addStatsFields(condition, dbStudy) {
    try {
        const json = await fetchJSON(statsFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {

            if (dbStudy.NCTId == jsonStudy.NCTId[0]) {
                if (jsonStudy.OutcomeAnalysisPValue[0] != null) {
                    dbStudy.PValue = parseInt(sonStudy.OutcomeAnalysisPValue[0]);
                }
                if (jsonStudy.SeriousEventStatsNumEvents[0] != null) {
                    dbStudy.NumSeriousEvents = parseInt(jsonStudy.SeriousEventStatsNumEvents[0]);
                }
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

async function addParticipantFields(condition, dbStudy) {
    try {
        const json = await fetchJSON(participantFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {
            if (dbStudy.NCTId == jsonStudy.NCTId[0]) {
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
async function addResultsFields(condition, dbStudy) {
    try {
        const json = await fetchJSON(resultFields, condition);
        const jsonStudies = json.StudyFieldsResponse.StudyFields;

        for (jsonStudy of jsonStudies) {

            if (dbStudy.NCTId == jsonStudy.NCTId[0]) {
                console.log("Study Id", dbStudy.NCTId)
                if (jsonStudy.PrimaryOutcomeDescription[0] != null) {
                    dbStudy.PrimaryOutcomeDescription = jsonStudy.PrimaryOutcomeDescription[0];
                }
                if (jsonStudy.ResultsFirstPostDate.length > 0) {
                    dbStudy.hasResults = true;
                }
                await dbStudy.save();
            }
        }
    }
    catch (err) {
        console.log(err)
    }
}

async function addAdditionalSelectedFields(condition, additionalFields, dbStudy) {
    try {
        const groupedFields = groupBy20(additionalFields);

        for (let i = 0; i < groupedFields.length; i++) {
            const currentFields = groupedFields[i];
            const json = await fetchJSON(currentFields, condition);
            const jsonStudies = json.StudyFieldsResponse.StudyFields;
            for (jsonStudy of jsonStudies) {
                if (dbStudy.NCTId == jsonStudy.NCTId[0]) {
                    for (let j = 0; j < currentFields.length; j++) {
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

exports.startNewSearch = async (req, res, next) => {
    const user = await User.findById(req.session.user._id).exec();
    const searchName = req.body.name;
    const condition = req.body.condition;
    const fixedCondition = fixConditionString(condition);
    const date = new Date();
    const stringDate = getDayMonthYear(date);
    try {
        const newSearch = new Search({
            condition: fixedCondition,
            name: searchName,
            date: date,
            stringDate: stringDate
        })

        const additionalFields = [];
        const keys = Object.keys(req.body);
        for (let k = 0; k < keys.length; k++) {
            if (keys[k] != "name" && keys[k] != "condition" && keys[k] != "_csrf") {
                additionalFields.push(keys[k]);
            }
        }
        newSearch.userSelectedFields = additionalFields;

        const studies = await makeStudies(newSearch);
        newSearch.studies = studies;
        await newSearch.save();
        user.saved.push(newSearch);
        await user.save();

        res.redirect('/search/saved');
    }
    catch (err) {
        console.log(err)
    }

}

exports.getEditSearch = async (req, res, next) => {
    try {
        const search = await Search.findById(req.params.searchId).exec();
        res.render('edit-search',{
            search:search
        })
    }
    catch (err) {
        console.log(err)
    }
}

exports.editSearch = async(req, res, next) =>{
    try{
        const search = await Search.findById(req.body.searchId).exec();
        const newName = req.body.searchName;
        search.name = newName;
        await search.save();
        res.redirect('/search/saved')
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

/**
 * 
 * @param {*} search must be populated with studies
 */
function getStudyTypeList(search){
    const studies = search.studies;
    const types = [];
    for(let i=0; i<studies.length; i++){
        if(studies[i].StudyType!=null && !types.includes(studies[i].StudyType)){
            types.push(studies[i].StudyType);
        }
    }
    console.log(types)
    return types;
}

function getStudyStatusList(search){
    const studies = search.studies;
    const stats = [];
    for(let i=0; i<studies.length; i++){
        if(studies[i].OverallStatus!=null && !stats.includes(studies[i].OverallStatus)){
            stats.push(studies[i].OverallStatus);
        }
    }
    return stats;
}

function getStudyPhaseList(search){
    const studies = search.studies;
    const phases = [];
    for(let i=0; i<studies.length; i++){
        if(studies[i].Phase!=null && !phases.includes(studies[i].Phase)){
            phases.push(studies[i].Phase);
        }
    }
    return phases;
}

function getStudyLocationCity(search){
    const studies = search.studies;
    const cities = [];
    for(let i=0; i<studies.length; i++){
        if(studies[i].LocationCity!=null && !cities.includes(studies[i].LocationCity)){
            cities.push(studies[i].LocationCity);
        }
    }
    return cities;
}

function getLocationFascility(search){
    const studies = search.studies;
    const places = [];
    for(let i=0; i<studies.length; i++){
        if(studies[i].LocationFascility!=null && !places.includes(studies[i].LocationFascility)){
            places.push(studies[i].LocationFascility);
        }
    }
    return places;
}

exports.filterStudies = async (req, res, next) => {
    try {
        const search = await Search.findById(req.body.searchId).populate('studies').exec();
        const keys = Object.keys(req.body);
        const filters =[];

        for(let i=0; i<keys.length; i++){
            if(keys[i]!="_csrf"&&keys[i]!="searchId"){
                filters.push(keys[i]);
            }
        }

        const types = getStudyTypeList(search);
        const filteredTypes = [];
        for(t of types){
            if(filters.includes(t)){
                filteredTypes.push(t);
            }
        }
      
        const stats = getStudyStatusList(search);
        const filteredStats = [];
        for(s of stats){
            if(filters.includes(s)){
                filteredStats.push(s)
            }
        }
        const phases = getStudyPhaseList(search);
        const filteredPhases = [];
        for(p of phases){
            if(filters.includes(p)){
                filteredPhases.push(p);
            }
        }
        const excludeFields = ["__v", "_id"];


        let filteredStudies = [];

        if(req.body.hasResults=="yes"){
            filteredStudies = [];
            for(let i = 0; i<search.studies.length; i++){
                if(search.studies[i].hasResults){
                    filteredStudies.push(search.studies[i]);
                }
            }
        }
        else if(req.body.hasResults=="no"){
            filteredStudies = [];
            for(let i=0; i<search.studies.length; i++){
                if(!search.studies[i].hasResults){
                    filteredStudies.push(search.studies[i]);
                }
            }
        }

        console.log(filteredStudies)
        for(let j=0; j<filteredStudies.length; j++){
            if(filteredStudies.length>0 && !filteredTypes.includes(filteredStudies[j].StudyType)){
                filetedStudies = filteredStudies.splice(j,1);
            }
        }
        console.log(filteredStudies)
        for(let j=0; j<filteredStudies.length; j++){
            if(filteredStudies.length>0 && !filteredStats.includes(filteredStudies[j].OverallStatus)){
                filteredStudies = filteredStudies.splice(j,1);
            }
        }
        for(let j=0; j<filteredStudies.length; j++){
            if(filteredStudies.length>0 && !filteredPhases.includes(filteredStudies[j].Phase)){
               filteredStudies =  filteredStudies.splice(j,1);
            }
        }
           
        const filtered = true
        res.render('view-search',{
            search: search,
            studies: filteredStudies,
            excludeFields: excludeFields,
            types: types,
            stats: stats,
            phases: phases,
            filtered: filtered
        })
    }
    catch (err) {
        console.log(err)
    }
}

exports.getSingleSearch = async (req, res, next) => {
    try {
        const search = await Search.findById(req.params.searchId).populate("studies").exec();
        const types = getStudyTypeList(search);
        const stats = getStudyStatusList(search);
        const phases = getStudyPhaseList(search);
        const excludeFields = ["__v", "_id"];
        const filtered = false;

        res.render('view-search', {
            search: search,
            studies: search.studies,
            excludeFields: excludeFields,
            types: types,
            stats: stats,
            phases: phases,
            filtered: filtered
        })
    }
    catch (err) {
        console.log(err)
    }
}

exports.searchToJson = async (req, res, next) => {
    try {
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

function getFields(studies) {
    const fields = [];
    for (let i = 0; i < studies.length; i++) {
        const keys = Object.keys(studies[i].toJSON());
        for (let j = 0; j < keys.length; j++) {
            if (!fields.includes(keys[j])) {
                fields.push(keys[j]);
            }
        }
    }
    return fields;
}

exports.searchToCSV = async (req, res, next) => {
    const search = await Search.findById(req.body.searchId).populate("studies").exec();
    const studies = search.studies;
    const fields = getFields(studies)
    const options = { fields }
    const csv = json2csv(studies, options)
    const fileName = search.name + ".csv"
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.write(csv)
    res.end();
}

exports.updateSearch = async(req, res, next) =>{
    const search = await Search.findById(req.body.searchId).populate("studies").exec();
    console.log(search)
    await updateStudies(search);
    const currentTime = new Date();
    const timeStamp = currentTime.getTime();
    search.timeStamp = timeStamp;
    await search.save();
    res.redirect('/search/saved')
}


exports.deleteSearch = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user._id).exec();
        const search = await Search.findById(req.body.searchId).populate("studies").exec();

        user.saved.pull(search);
        const studies = search.studies;
        for(let i=0; i<studies.length; i++){
            await studies[i].remove()
        }
        await search.remove();

        await user.save();
        res.redirect('/search/saved')
    }
    catch (err) {
        console.log(err)
    }

}

