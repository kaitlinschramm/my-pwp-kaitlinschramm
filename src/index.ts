import {Application, Router} from 'express'
import {Request, Response} from 'express'

const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const Recaptcha = require('express-recaptcha') .RecaptchaV2
const formData = require('form-data')
const Mailgun = require('mailgun.js')
//^^uppercase Mailgun is an object
const mailgun = new Mailgun(formData)
//^^lowercase mailgun is a class

const {check, validationResult} = require('express-validator')

const validation = [
    check('firstName','a valid first name is required.').not().isEmpty().trim().escape(),
    check('lastName','a valid last name is required.').not().isEmpty().trim().escape(),
    check('email', 'PLease provide a valid email.').isEmail(),
    check('phoneNumber').optional().trim().escape(),
    check('message', 'A message of 2000 characters or less is required.' ).trim().escape().isLength({min:1, max:2000})
]

const app: Application = express()

app.use(morgan('dev'))

app.use(express.json())

app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())

const recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY)

const mg= mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY})

const handleGetRequest = (request: Request, response: Response) => {
    return response.json('This thing is on!')
}

const handlePostRequest = (request: Request, response: Response) => {
    response.append('Content-Type', 'text/html')

    // @ts-ignore
    //if (request.recaptcha.error) {
       // return response.send(
           // `<div class='alert alert-danger' role='alert'><strong>Oh Snap!</strong>There was a Recaptcha error. Please try again.</div>`
      //  )
   // }

    const errors = validationResult(request)

    if (errors.isEmpty() === false) {
        const currentError = errors.array()[0]
        return response.send(
            `<div class='alert alert-danger' role='alert'><strong>Oh Snap!</strong>&{currentError.msg}</div>`
        )
    }

    const {firstName, email, phoneNumber, message} = request.body
    //const name = request.body.name
    //const email = request.body.email
    //const phoneNumber = request.body.phoneNumber
    //const message = request.body.message
    //^^that is another way to write that

    const mailgunData = {
        to: process.env.MAIL_RECIPIENT,
        from: `${firstName} <postmaster@${process.env.MAILGUN_DOMAIN}>`,
        subject: `${email}:`,
        text: message
    }

    mg.messages.create(process.env.MAILGUN_DOMAIN, mailgunData)
        .then((msg: any) =>
            response.send(`<div class='alert alert-success' role='alert'>Email Successfully Sent</div>`)
        )
        .catch((error: any) =>
            response.send(`<div class='alert alert-danger' role='alert'>Email failed. Please try again.</div>`)
        )
}


const indexRoute = express.Router()

indexRoute.route('/')
    .get(handleGetRequest)
    .post(recaptcha.middleware.verify, validation, handlePostRequest)


app.use('/apis', indexRoute)

app.listen(4200, () => {
    console.log('Express Successfully Built')
})