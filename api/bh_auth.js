"use strict";

/**

  Bullhorn Login

  Etablish a connection with the Bullhorn API
  an maintain it connected.

**/

const
  rp    = require('request-promise')
, qs    = require('querystring')
, url   = require('url')
, cron  = require('node-cron')
;

let
  CLIENT
, SECRET
, USERNAME
, PASSWORD

, BhRestToken
, restUrl
, expires_in
, refresh_token
;

let STARTED = false;

const GetAuthCode = async (cb) => {

  const options = {
    method: "POST"
  , uri   : "https://auth.bullhornstaffing.com/oauth/authorize"
  , qs    : {
      client_id: CLIENT
    , response_type : "code"
    , action        : "Login"
    }
  , form  : {
      username  : USERNAME
    , password  : PASSWORD
    }
  , json  : true
  }

  const resolveResponse = (r) => {
    if(typeof r.headers != "undefined" && typeof r.headers.location != "undefined"){
      let rqs = r.headers.location;
          rqs = url.parse(rqs);
          rqs = qs.parse(rqs.query);

      if(rqs.code){
        cb(null, rqs.code);
      }else{
        cb({
          errCode: 1
        , errMessage: "Could not found code"
        }, null);
      }

    }else{
      cb({
        errCode: 1
      , errMessage: "Could not found code"
      }, null);
    }
  }

  rp(options)
    .then((res) => {
      resolveResponse(res);
    })
    .catch((err) => {
      resolveResponse(err.response);
    })
  ;

}

const GetAccessToken = async (code, cb) => {
  const options = {
    method: "POST"
  , uri   : "https://auth.bullhornstaffing.com/oauth/token"
  , form  : {
      grant_type    : "authorization_code"
    , client_id     : CLIENT
    , client_secret : SECRET
    , code          : code
    }
  , json  : true
  }

  rp(options)
    .then((res) => {
      cb(null, res);
    })
    .catch((err) => {
      cb({
        errCode: 2
      , errMessage: "Could not get access token"
      }, null);
    })
  ;
}

const GetRefreshToken = async (refresh_token, cb) => {
  const options = {
    method: "POST"
  , uri   : "https://auth.bullhornstaffing.com/oauth/token"
  , form  : {
      grant_type    : "refresh_token"
    , refresh_token : refresh_token
    , client_id     : CLIENT
    , client_secret : SECRET
    }
  , json: true
  }
  rp(options)
    .then((res) => {
      cb(null, res);
    })
    .catch((err) => {
      cb({
        errCode: 4
      , errMessage: "Could not  refresh token"
      }, null);
    })
  ;
}

const GetLogin = async (access_token, cb) => {
  const options = {
    method: "GET"
  , uri   : "https://rest.bullhornstaffing.com/rest-services/login"
  , qs    : {
      version     : '*'
    , access_token: access_token
    }
  , json  : true
  }

  rp(options)
    .then((res) => {
      cb(null, res);
    })
    .catch((err) => {
      cb({
        errCode: 3
      , errMessage: "Could not get login"
      }, null);
    })
  ;
}

const Login = async (cb) => {

  GetAuthCode((err, code) => {
    if(err){
      cb(err, null);
    }else if(code){

      GetAccessToken(code, (err, tokenData) => {
        if(err){
          cb(err, null);
        }else if(tokenData && tokenData.access_token){

          GetLogin(tokenData.access_token, (err, loginData) => {
            if(err){
              cb(err, null);
            }else if(loginData){
              BhRestToken  = loginData.BhRestToken;
              restUrl      = loginData.restUrl;
              expires_in   = tokenData.expires_in;
              refresh_token= tokenData.refresh_token;

              cb(null, {
                BhRestToken  : BhRestToken
              , restUrl      : restUrl
              });

            }
          });

        }
      });

    }
  });

}

const RefreshLogin = (cb) => {
  GetRefreshToken(refresh_token, (err, refreshTokenData) => {
    if(err){
      cb(err, null);
    }else if(refreshTokenData){

      access_token = refreshTokenData.access_token;
      expires_in   = refreshTokenData.expires_in;
      refresh_token= refreshTokenData.refresh_token;

      GetLogin(access_token, (err, refreshLoginData) => {
        if(err){
          cb(err, null);
        }else if(refreshLoginData){
          BhRestToken  = refreshLoginData.BhRestToken;
          restUrl      = refreshLoginData.restUrl;
        }
      });
    }
  });
}

const Start = async (credentials, cb) => {

  CLIENT    = credentials.client;
  SECRET    = credentials.secret;
  USERNAME  = credentials.username;
  PASSWORD  = credentials.password;

  Login((e, login) => {
    if(login){

      cron.schedule('*/6 * * * *', function(){
        STARTED = false;
        RefreshLogin((e, refreshedLogin) => {
          STARTED = true;
        });
      });

      STARTED = true;

      cb(STARTED);
    }
  });
}

const Auth = async (cb) => {

  cb({
    BhRestToken : BhRestToken
  , restUrl     : restUrl
  });

}

module.exports = {

  start   :  Start
, auth    :  Auth

, started : STARTED

}
