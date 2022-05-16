# node-express-mongo-boilerplate

I created **model-controller-service** structure.  
I use **joi** to validate Environment Variables.  
I use **express-validator** to validate requests.  
I use **winston** as a logger.  
I use **morgan** handler to log api requests.

# to run

npm install

Create .env file considering the .env.example.  
Set MongoDB URL in that .env file.
Set mail server in that .env file.

Choose one of below commands

> nodemon src/server.js  
> npm run dev

I added two remote: origin and heroku
to see: git remot -v
git push origin main
git push heroku main
