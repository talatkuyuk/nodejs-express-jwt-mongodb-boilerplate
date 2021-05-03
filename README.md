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

nodemon src/server.js