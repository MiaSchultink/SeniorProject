const User = require('../models/user');
const crypto = require('crypto')
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail'); 

sgMail.setApiKey(process.env.API_KEY)



exports.getLogIn = (req, res, next) => {
    try{
        res.render('login')
    }
    
    catch (err) {
        console.log(err)
        res.render('error');
    }

  }

exports.getSignUp = (req, res, next) => {
try{
    res.render('sign-up');
}
catch (err) {
    console.log(err)
    res.render('error');
}

};

exports.postLogin = async (req, res, next) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const user = await User.findOne({ email: email }).exec()

        if (!user) {
            res.redirect('/user/login')
        }
        const passwordMatch = await bcrypt.compare(password, user.password)
        console.log(passwordMatch)
        if (passwordMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            req.session.isAdmin = (user.role == 'admin');
            await req.session.save()
            res.redirect('/')
        }
        else {
            res.redirect('/user/login')
        }

    }
    catch (err) {
        console.log(err)
        res.render('error');
    }

};

exports.postSignUp = async (req, res, next) => {
    try {
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;
        const confirmPassword = req.body.confirmPassword;

        const tempUser = await User.findOne({ email: email }).exec();
        if (tempUser) {
            throw new Error('Sign-up failed')
        }
        const hashedPassword = await bcrypt.hash(password, 12)

        const user = new User({
            name: name,
            email: email,
            password: hashedPassword,
            gradients: []
        });

        await user.save();

        const message = {
            to: email,
            from: 'contact@miaschultink.com',
            subject: 'Sign-up Suceeded!',
            html: '<h1>You sucessfully signed up!</h1>'
        }
        sgMail.send(message)
        res.redirect('/user/login')
    }

    catch (err) {
        console.log(err)
        res.render('error')
    }

};

exports.getReset = (req, res, next) => {
    try {
        res.render('reset');
    }
    catch (err) {
        console.log(err)
        res.render('error')
    }
};

exports.postReset = async (req, res, next) => {
    try {
        const token = crypto.randomBytes(32).toString('hex');
        const user = await User.findOne({ email: req.body.email }).exec()
        if (!user) { throw new Error('No accounts with this email') }
        else {
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000
            await user.save()
            const host = (process.env.NODE_ENV == 'development') ?
                'http://localhost:3000' :
                'http://www.miaschultink.com'
            const message = {
                to: req.body.email,
                from: 'contact@miaschultink.com',
                subject: 'Password Reset',
                html: `
        <p>You requested a password reset.</p>
        <p>Click this <a href ="${host}/users/reset/${token}">link</a></p>`
            }
            await sgMail.send(message)
            res.redirect('/');
        }
    }
    catch (err) {
        console.log(err)
        res.render('error')
    }
}

exports.getNewPassword = async (req, res, next) => {
    try {
        const token = req.params.token;
        const user = await User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } }).exec()
        if (user) {
            res.render('new-password', {
                pageTitle: 'New-Password',
                path: 'users/new-password',
                userId: user._id.toString(),
                passwordToken: token
            });
        }
        else {
            res.redirect('/users/reset')
        }
    }
    catch (err) {
        console.log(err)
        res.render('error')
    }
}
exports.postNewPassword = async (req, res, next) => {
    try {
        const newPassword = req.body.password;
        const userId = req.body.userId;
        const passwordToken = req.body.passwordToken;


        const user = await User.findOne({ resetToken: passwordToken, resetTokenExpiration: { $gt: Date.now() }, _id: userId }).exec()
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpiration = undefined;

        await user.save();
        res.redirect('/users/login')
    }
    catch (err) {
        console.log(err)
        res.render('error')
    }
};

exports.logout = (req, res, next) => {
    try{
       req.session.destroy();
       res.redirect('/user/login')
    }
    catch (err) {
        console.log(err)
        res.render('error')
    }
    
};



exports.getUserProfile = async(req, res, next) =>{
    try{
        const user = await User.findById(req.session.user._id).exec();
        res.render('profile',{
            user:user
        })
    }
    catch (err) {
        console.log(err)
        res.render('error')
    }
}

exports.getEditProfile = async(req, res, next) =>{
    try{
        const user = await User.findById(req.session.user._id).exec();
        res.render('edit-profile',{
            user:user
        })
    }
    catch (err) {
        console.log(err)
        res.render('error')
    }
}

exports.editProfile = async(req, res, next) =>{
    try{
        const user = await User.findById(req.session.user._id).exec();
        const name = req.body.name;
        const email = req.body.email;

        user.name = name;
        user.email = email;

        await user.save();
        res.redirect('/')
    }
    catch (err) {
        console.log(err)
        res.render('error')
    }
}


exports.shareSearch = async(req, res, next) =>{
    try{

    }
    catch (err) {
        console.log(err)
        res.render('error')
    }
    
}

