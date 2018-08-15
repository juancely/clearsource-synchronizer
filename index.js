"use strict";

const
  path    = require("path")
, mongodb = require("mongodb")
;

const Config = require(path.join(__dirname, "./config/config"));

const
  hubspot = require(path.join(__dirname, "./api/hubspot"))

, MongoClient = mongodb.MongoClient
, MongoUrl    = "mongodb://localhost:27017/" + Config.database.dbname
;

const GetContactsFromHubspot = async (cb) => {
  await hubspot.getContacts()
    .then(contacts => {

      cb(null, contacts);

    })
    .catch(error => {

      cb(error, null);

    })
  ;
}

// let DBO;
//
// MongoClient.connect(MongoUrl, { useNewUrlParser: true }, async (err, db) => {
//   if(err){
//     console.log("DB | Error connecting to database");
//   }else{
//     DBO = db.db(Config.database.dbname);
//   }
// });

if(process.env.LOAD){

  console.log("ok load");

}
