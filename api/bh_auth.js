"use strict";

/**

  Bullhorn Login Class

  This classe etablish a connection with the Bullhorn API
  an maintain it connected.

**/

const
  rp =  require('request-promise')
, qs =  require('querystring')
, url=  require('url')
;

// Define private methods
const
  GetAuthCode     = Symbol('GetAuthCode')
, GetAccessToken  = Symbol('GetAccessToken')
, GetRefreshToken = Symbol('GetRefreshToken')
, GetLogin        = Symbol('GetLogin')

, startCounter    = Symbol('startCounter')
, Login           = Symbol('Login')
;

module.exports = class BullhornLogin {
  constructor(credentials){
    if(credentials && credentials.client, credentials.secret, credentials.username, credentials.password){
      this.client   = credentials.client; this.secret   = credentials.secret;
      this.username = credentials.username; this.password = credentials.password;

      this.logged = false;
      this.isLogged();
    }else{
      console.error("Require Bullhorn credentials to log in.");
      return false;
    }
  }

  [GetAuthCode] (cb) {
    const options = {
      method: "POST"
    , uri   : "https://auth.bullhornstaffing.com/oauth/authorize"
    , qs    : {
        client_id: this.client
      , response_type : "code"
      , action        : "Login"
      }
    , form  : {
        username  : this.username
      , password  : this.password
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

  [GetAccessToken] (code, cb) {
    const options = {
      method: "POST"
    , uri   : "https://auth.bullhornstaffing.com/oauth/token"
    , form  : {
        grant_type    : "authorization_code"
      , client_id     : this.client
      , client_secret : this.secret
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

  [GetRefreshToken] (refresh_token, cb) {
    const options = {
      method: "POST"
    , uri   : "https://auth.bullhornstaffing.com/oauth/token"
    , form  : {
        grant_type    : "refresh_token"
      , refresh_token : refresh_token
      , client_id     : this.client
      , client_secret : this.secret
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

  [GetLogin] (access_token, cb) {
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

  // Decrease -1 the counter each second
  [startCounter] () {
    if(this.expires_in){
      let counter = setInterval(() => {
        if(this.expires_in < 1){
          this[GetRefreshToken](this.refresh_token, (err, refreshTokenData) => {
            if(err){
              console.error(err);
            }else if(refreshTokenData){
              this.access_token = refreshTokenData.access_token;
              this.expires_in   = refreshTokenData.expires_in;
              this.refresh_token= refreshTokenData.refresh_token;

              this[GetLogin](this.access_token, (err, refreshLoginData) => {
                if(err){
                  console.error(err);
                }else if(refreshLoginData){
                  this.BhRestToken  = refreshLoginData.BhRestToken;
                  this.restUrl      = refreshLoginData.restUrl;
                  this[startCounter]();
                }
              });
            }
          });
          clearInterval(counter);
        }else{
          this.expires_in--;
        }
      }, 1000);
    }
  }

  [Login] (cb) {
    if(this.BhRestToken && this.restUrl){
      cb(null, {
        BhRestToken  : this.BhRestToken
      , restUrl      : this.restUrl
      });
    }else{
      this[GetAuthCode]((err, code) => {
        if(err){
          cb(err, null);
        }else if(code){

          this[GetAccessToken](code, (err, tokenData) => {
            if(err){
              cb(err, null);
            }else if(tokenData && tokenData.access_token){

              this[GetLogin](tokenData.access_token, (err, loginData) => {
                if(err){
                  cb(err, null);
                }else if(loginData){
                  this.BhRestToken  = loginData.BhRestToken;
                  this.restUrl      = loginData.restUrl;
                  this.expires_in   = tokenData.expires_in;
                  this.refresh_token= tokenData.refresh_token;

                  cb(null, {
                    BhRestToken  : this.BhRestToken
                  , restUrl      : this.restUrl
                  });

                  this[startCounter]();
                }
              });

            }
          });

        }
      });
    }

  }

  isLogged(){
    setInterval(() => {
      if(this.BhRestToken && this.restUrl){
        this.logged = true;
      }else{
        this.logged = false;
      }
    },500);
  }

  auth(cb){

    this[Login]( async (err, auth) => {

      await cb(err, auth);

    });

  }
}
