const User = require('../models/user')
const Search = require('../models/search')


exports.getControlPanel = (req, res, next) =>{
    try{
        res.render('control-panel')
    }
    catch (err) {
        console.log(err)
    }
}

exports.getAllUsers = async (req, res, next) =>{
    try{
        const users = await User.find().exec();
        res.render('user-list',{
            users: users
        })
    }
    catch (err) {
        console.log(err)
    }
}

exports.getAllSearches = async (req, res, next) =>{
    try{
        const searches = await Search.find().populate("studies").exec();
        res.render('search-list',{
            searches: searches
        })
    }
    catch (err) {
        console.log(err)
    }
}

exports.deleteUser = async(req, res, next) =>{
    try{
        const user = await User.findById(req.body.userId).exec();
        await user.remove();
        res.redirect('/admin/control-panel')
    }
    catch (err) {
        console.log(err)
    }
}

