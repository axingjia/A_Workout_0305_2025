# Starting server
* node app.js

# Start testing
* npm test


# start mongodb
* docker run -it --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=pass mongo --noauth
* mongosh "mongodb://admin:pass@localhost:27017" --authenticationDatabase admin


# Third party tool
* mongodb
* Jest Test Framework
* Express Framework

# API Requirements
* Your API should implement the following endpoints:
* Authentication Endpoints
1.	POST /api/auth/signup: create a new user account.
2.	POST /api/auth/login: log in to an existing user account and receive an access token.
Note Endpoints
1.	GET /api/notes: get a list of all notes for the authenticated user.
2.	GET /api/notes/ get a note by ID for the authenticated user.
3.	POST /api/notes: create a new note for the authenticated user.
4.	PUT /api/notes/ update an existing note by ID for the authenticated user.
5.	DELETE /api/notes/ delete a note by ID for the authenticated user.
6.	POST /api/notes/:id/share: share a note with another user for the authenticated user.
7.	GET /api/search?q=:query: search for notes based on keywords for the authenticated user.
