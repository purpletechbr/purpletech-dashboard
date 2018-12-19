const mongoose = require('mongoose')
const User = mongoose.model('User')
const Project = mongoose.model('Project')
const jwt = require('jwt-simple')
const bcrypt = require('bcrypt-nodejs')

module.exports = app => {
    const login = async (req, res) => {
        if (!req.body.email || !req.body.password) {
            return res.status(400).render('enter', { 
                refresh: null,
                page: '/login',
                message: JSON.stringify('Digite o E-mail e a senha')
            })
        }

        const user = await User.findOne({ email: req.body.email })
        .catch(_ => res.status(500).render('500'))

        if (!user || user.deletedAt) return res.status(400).render('enter', { 
            refresh: null,
            page: '/login',
            message: JSON.stringify('Usuário não encontrado') 
        })
        const isMatch = bcrypt.compareSync(req.body.password, user.password)
        if (!isMatch) return res.status(401).render('enter', { 
            refresh: null,
            page: '/login',
            message: JSON.stringify('E-mail ou senha inválidos') 
        })
        
        const now = Math.floor(Date.now() / 1000)
        const payload = {
            id: user._id,
            iss: 'http://localhost:3000',
            iat: now,
            exp: now + (60 * 60 * 24 * 3)
        }

        await User.findOne({ email: req.body.email }, {
            "_id": 1,
            "name": 1,
            "email": 1,
            "avatar": 1,
            "description": 1,
            "profileChange": 1,
            "admin": 1,
            "createdAt": 1,
            "_idProject": 1
        }).then(async getUser => {
            const project = await Project.find({ _id: getUser._idProject })
            .catch(_ => res.status(500).render('500'))
            req.session.project = project
            req.session.user = getUser
            req.session.token = jwt.encode(payload, process.env.AUTH_SECRET)
            res.redirect('/dashboard')
        }).catch(_ => res.status(500).render('500'))
    }

    const validateToken = async (req, res) => {
        const userToken = req.session.token || null
        try {
            if (userToken) {
                const token = jwt.decode(userToken, process.env.AUTH_SECRET)
                if (new Date(token.exp * 1000) > new Date()) {
                    return res.status(200).render('./dashboard/index', {
                        project: req.session.project,
                        user: req.session.user,
                        page: req.url,
                        message: null
                    })
                }
            }
        } catch (err) {
            return res.status(400).render('enter', { 
                refresh: null,
                page: '/login',
                message: JSON.stringify('Algo deu errado') })
        }
    }

    return { login, validateToken }
}