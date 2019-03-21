const express = require('express');
const {
    check,
    body
} = require('express-validator/check');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', 
[
    body('email')
    .isEmail()
    .withMessage('Please Enter a valid email address')
    .normalizeEmail(),
    body('password','Password is not correct')
    .isLength({min:5})
    .isAlphanumeric()
    .trim()
],
authController.getLogin);

router.post('/login', authController.postLogin);

router.get('/signup', authController.getSignup);

router.post('/signup',
    [check('email')
        .isEmail()
        .withMessage('please enter a valid email.')
        .custom((value, {
            req
        }) => {
            // if (value === 'test@test.com') {
            //     throw new Error('This email address is forbidden.');
            // }
            // return true;
            return User.findOne({
                    email: value
                })
                .then(userDoc => {
                    if (userDoc) {
                        return Promise.reject('Email exists already, please pick a different one.');
                    }
                });
            // .catch(err => console.log(err));
        })
        .normalizeEmail(),
        body('password',
            'please enter a password with only numbers and text and atleast 5 characters.'
        )
        .isLength({
            min: 5
        })
        .isAlphanumeric()
        .trim(),
        body('confirmPassword')
        .trim()
        .custom((value, {
            req
        }) => {
            if (value !== req.body.password) {
                throw new Error('passwords do not match.')
            }
            return true;
        })
    ],
    authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;