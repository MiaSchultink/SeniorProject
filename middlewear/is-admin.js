module.exports = (req, res, next)=>{
    if(!req.session.isAdmin){
        return res.redirect('/')
    }
    else{console.log('is admin' ,req.session.isAdmin)}
    next();
   }
   