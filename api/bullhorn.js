"use strict";

const
  path  = require("path")
, rp    = require('request-promise')
;

const Config = require(path.join(__dirname, "../config/config"));

const BullhornAuth = require(path.join(__dirname, "./bh_auth"));
const BH = new BullhornAuth({
  client  : Config.bullhorn.client   //  Client ID
, secret  : Config.bullhorn.secret   //  Client Secret
, username: Config.bullhorn.username //  Username
, password: Config.bullhorn.password //  Password
});
