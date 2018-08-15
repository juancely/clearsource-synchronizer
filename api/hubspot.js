"use strict";

const
  path  = require("path")
, rp    = require('request-promise')
;

const Config = require(path.join(__dirname, "../config/config"));

const
  API_URL     = "https://api.hubapi.com"
, API_KEY     = Config.hubspot.api_key
;

const GetContacts = async (cb) => {

  const options = {
    method: "GET"
  , uri   : API_URL + "/contacts/v1/lists/all/contacts/all"
  , qs    : {
      hapikey : API_KEY
    , count   : 100
    , property: ["email"]
    }
  , qsStringifyOptions: {
      arrayFormat: 'repeat'
    }
  , json  : true
  }

  let error, contacts;

  await rp(options)
    .then(async results => {

      contacts = results;

      while(contacts["vid-offset"] && contacts["has-more"]){
        options.qs['vidOffset'] = contacts["vid-offset"];
        await rp(options)
          .then(results => {
            
            if(results['contacts']){
              const c = results['contacts']
              for (let i in c) {
                contacts['contacts'].push(c[i]);
              }
            }

            contacts["vid-offset"] = results["vid-offset"];
            contacts["has-more"] = results["has-more"] ? results["has-more"] : false;

          })
          .catch(e => {
            error = e;
          })
        ;
      }

    })
    .catch(e => {
      error = e;
    })
  ;

  if(contacts && contacts['contacts']){

    contacts = contacts['contacts'];

    for(let i in contacts){

      if(contacts[i].vid && contacts[i].properties && contacts[i].properties.email && contacts[i].properties.email.value){
        const
          vid    = contacts[i].vid
        , email  = contacts[i].properties.email.value
        ;

        contacts[i] = {
          id    : vid
        , email : email
        }

      }else{
        delete(contacts[i]);
      }

    }
  }

  await cb(error, contacts);

}

module.exports = {

  getContacts : GetContacts

}
