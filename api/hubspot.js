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

const GetContacts = async () => {
  let options = {
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

  let
    Contacts  = null
  ;

  await rp(options)
    .then(async results => {

      Contacts = results;

      while(Contacts["vid-offset"] && Contacts["has-more"]){
        options.qs['vidOffset'] = Contacts["vid-offset"];
        await rp(options)
          .then(results => {
            // console.log(results);
            if(results['contacts']){
              const c = results['contacts']
              for (let i in c) {
                Contacts['contacts'].push(c[i]);
              }
            }

            Contacts["vid-offset"] = results["vid-offset"];
            Contacts["has-more"] = results["has-more"] ? results["has-more"] : false;

          })
          .catch(error => {
            return error;
          })
        ;
      }
    })
    .catch(error => {
      return error;
    })
  ;

  if(Contacts && Contacts['contacts']){

    Contacts = Contacts['contacts'];

    for(let i in Contacts){

      if(Contacts[i].vid && Contacts[i].properties && Contacts[i].properties.email && Contacts[i].properties.email.value){
        const
          vid    = Contacts[i].vid
        , email  = Contacts[i].properties.email.value
        ;

        Contacts[i] = {
          id    : vid
        , email : email
        }

      }else{
        delete(Contacts[i]);
      }

    }
  }

  return Contacts;
}

module.exports = {

  getContacts : GetContacts

}
