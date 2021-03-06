"use strict";

const passport = require('passport')
const GoogleStrategy = require('@passport-next/passport-google-oauth2').Strategy
const mongoose = require('mongoose')
const User = mongoose.model('User')
const gravatar = require('gravatar')
const axios = require('axios')
const moment = require('moment')
moment.locale('pt-br')

passport.serializeUser(function(user, done) {
    done(null, user)
})
  
passport.deserializeUser(function(obj, done) {
    done(null, obj)
})

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_GOOGLE_ID,
    clientSecret: process.env.CLIENT_GOOGLE_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {  
    await User.findOne({ googleId: profile.id }, async function(err, user) {
        if(err) return done(err, user)
        if(user && user.facebookId) {
            user = 'Você já está cadastrado com sua conta no Facebook'
            return done(err, user)
        }
        if(!user && !profile.emails[0].value) {
            user = 'A sua conta do Google deve ter um Email'
            return done(err, user)
        }
        if(!user) {
            const userFromDB = await User.findOne({ email: profile.emails[0].value })
            .catch(err => done(err, user))   
            if(userFromDB) {
                user = 'Esse Email já está registrado'
                return done(err, user)
            }

            let avatar
            if(profile.photos[0].value) {
                await axios.get(profile.photos[0].value)
                .then(_ => avatar = profile.photos[0].value)
                .catch(_ => avatar = gravatar.url(profile.emails[0].value, {
                    s: '200',
                    r: 'x',
                    d: 'retro'
                }, true))
            } else {
                avatar = gravatar.url(profile.emails[0].value, {
                    s: '200',
                    r: 'x',
                    d: 'retro'
                }, true)
            }

            await new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                phone: 'Sem telefone',
                admin: false,  
                avatar,
                firstAccess: true,
                firstProject: true,
                noPassword: true,
                createdAt: moment().format('L'),
                googleId: profile.id
            }).save().then(user => done(err, user))            
            .catch(err => done(err, user))   
        } else return done(err, user)
    })
}))