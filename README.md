# Starting server
* node app.js

# Start testing
* npm test


# start mongodb
* docker run -d --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=pass mongo
* mongosh "mongodb://admin:pass@localhost:27017"

# Third party tool
* mongodb
* Jest Test Framework
* Express Framework