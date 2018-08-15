"use strict";

const
  path  = require("path")
, rp    = require('request-promise')
, sleep = require('system-sleep')
;

const Config = require(path.join(__dirname, "../config/config"));

const BH = require(path.join(__dirname, "./bh_auth"));

let BH_STARTED = false;

BH.start({
  client  : Config.bullhorn.client   //  Client ID
, secret  : Config.bullhorn.secret   //  Client Secret
, username: Config.bullhorn.username //  Username
, password: Config.bullhorn.password //  Password
}, (started) => {

  BH_STARTED = started

});

const Get = async (by, value, cb) => {
  BH.auth(async(auth) => {

    if(auth){

      let options = {
        method: "GET"
      , uri   : auth.restUrl + "search/Candidate"
      , qs    : {
          BhRestToken : auth.BhRestToken
        , query       : ""+by+":" + value
        , fields      : "id, email"
        , start       : 0
        , count       : 1
        }
      , json  : true
      }

      await rp(options)
        .then(async result => {

          if(result.data && result.data[0] && result.data[0].id){
            await cb(null, result.data[0]);
          }

        })
        .catch(async e => {
          await cb(e, null);
        })
      ;

    }

  });
}

const GetCandidateByID = async (ID, cb) => {

  while(BH_STARTED == false){
    console.log("Waiting for Bullhorn");
    BH_STARTED = BH.started;
    sleep(12000);
  }

  Get("id", ID, async (e, candidate) => {
    await cb(e, candidate);
  });

}

const GetCandidateByEmail = async (email, cb) => {

  while(BH_STARTED != true){
    console.log("Waiting for Bullhorn");
    BH_STARTED = BH.started;
    sleep(12000);
  }

  await Get("email", email, async (e, candidate) => {
    await cb(e, candidate);
  });

}

module.exports = {

  getCandidateByID    : GetCandidateByID
, getCandidateByEmail : GetCandidateByEmail

}
