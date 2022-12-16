exports.getControlPanel = (req, res, next) =>{
    try{
        res.render('control-panel')
    }
    catch (err) {
        console.log(err)
    }
}