# node-express-mongo-boilerplate

## The Aim

This project is aimed to provide a boilerplate for a typical backend REST API application.

I created **model-controller-service** structure.  
I use **joi** to validate Environment Variables.  
I use **express-validator** to validate requests.  
I use **winston** as a logger.  
I use **morgan** handler to log api requests.

## to run

> npm install

Create `.env` file considering the `.env.example`.
Set MongoDB, Redis and SMTP server URLs in the `.env` file.
Chose the server http or https; and provide SSL files in the `/ssl` directory, if necessary.

Choose one of below commands

> nodemon src/server.js  
> npm run dev

## to deploy

I added two remotes `origin` and `heroku`

$ git add remote <github-repo>  
$ git add remote <heroku-repo>

$ git push origin main  
$ git push heroku main
