
const config = require('./config');
const app = require('./core/express');

app.listen(config.port, function () {
    console.log('Server started on port ' + config.port);
});