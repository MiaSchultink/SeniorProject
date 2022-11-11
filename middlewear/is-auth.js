module.exports = (req, res, next)=>{
    if(!req.session.isLoggedIn){
       // console.log('not logged in', req.session.isLoggedIn)
        return res.redirect('/user/login')
    }
    else{
      // console.log('is logged in', req.session.isLoggedIn)
    }
    next();
   }