"use strict";

const
  path    = require("path")
, mongodb = require("mongodb")
, sleep   = require('system-sleep')
;

const Config = require(path.join(__dirname, "./config/config"));

const
  hubspot   = require(path.join(__dirname, "./api/hubspot"))
, bullhorn  = require(path.join(__dirname, "./api/bullhorn"))

, MongoClient = mongodb.MongoClient
, MongoUrl    = "mongodb://" + Config.database.host + ":" + Config.database.port + "/" + Config.database.dbname
;

let DBO, DBO_CLOSE = false;

const deleteCollection = async (collection, cb) => {
  DBO
  .collection(collection)
  .find({})
  .toArray((e, docs) => {

    if(e){
      cb(e, null);
    }else if(docs.length > 0){
      DBO
      .collection(collection)
      .drop((e, droped) => {

        if(e){
          cb(e, null);
        }else if(droped){
          cb(null, true);
        }

      });
    }else{
      cb(null, true);
    }

  });
}

const getFromHubspot = async (cb) => {

  hubspot
  .getContacts(async (e, contacts) => {

    if(e){

      cb(e, null);

    }else if(contacts && contacts.length > 0){

      DBO
      .collection('synchronize_hubspot_contacts')
      .insertMany(contacts, (e, insert) => {
        cb(e, true);
      });

    }else{

      cb(null, null);

    }

  });

}

const synchronize = async () => {

  deleteCollection('synchronize_error', (e, deleted) => {

    if(e){
      console.log(e);
      DBO.close();
      process.exit();
    }else if(deleted){

      DBO.collection('synchronize_hubspot_contacts')
      .find({})
      .toArray((e, contacts) => {

        if(e){
          console.log(e);
          DBO.close();
          process.exit();
        }else if(contacts.length > 0){

          for(let i in contacts){

            const contact = contacts[i];
            console.log("Synchonizing email: " + contact.email + " - contact: " + (parseInt(i) + 1) + "/" + contacts.length)

            DBO.collection('synchronized')
            .find({
              "email": contact.email
            })
            .toArray(async (e, synchro) => {

              if(e){
                console.log(e);
                DBO.close();
                process.exit();
              }else if(synchro.length > 0){

                const sync = synchro[0];
                bullhorn.getCandidateByID(sync.bh_id, (e, candidate) => {

                  if(e){

                    DBO
                    .collection('synchronize_error')
                    .insertOne({
                      "error" : e
                    , "type"  : "comparing"
                    , "data"  : {
                        "sync": sync
                      }
                    }, (e, insert) => {
                      console.log("New error inserted");
                    });

                  }else if(candidate){

                    if(candidate.email != sync.email){

                      DBO
                      .collection('synchronize_warning')
                      .insertOne({
                        "info"  : "Synchronized ids doesn't match email"
                      , "data"  : {
                          "hs_data" : contact
                        , "bh_data" : candidate
                        }
                      }, (e, insert) => {
                        console.log("New warning inserted");
                      });

                    }else{

                      console.log("Allready synchronized");

                    }

                  }

                });

              }else{

                bullhorn.getCandidateByEmail(contact.email, (e, candidate) => {
                  if(e){

                    DBO
                    .collection('synchronize_error')
                    .insertOne({
                      "error" : e
                    , "type"  : "getting"
                    , "data"  : {
                        "hs_data": contact
                      }
                    }, (e, insert) => {
                      console.log("New error inserted");
                    });

                  }else{

                    if(candidate){

                      DBO
                      .collection('synchronized')
                      .insertOne({
                        "email" : contact.email
                      , "hs_id" : contact.id
                      , "bh_id" : candidate.id
                      }, (e, insert) => {
                        console.log("New match inserted");
                      });

                    }

                  }
                });

              }

            });

            sleep(1000);

            // if((parseInt(i) + 1) >= contacts.length){
            //   console.log("Synchronization ended, try to synchronize failed");
            //
            //   DBO.collection('synchronized_error')
            //   .find({})
            //   .toArray((e, synchro) => {
            //
            //   });
            //
            // }

          }

        }else{

          console.log("Nothing to synchronize");
          DBO.close();
          process.exit();

        }

      });

    }

  });

}

const run = async () => {
  if(process.env.MODE){

    if(process.env.MODE == "DEFAULT"){

      synchronize();

    }else if(process.env.MODE == "UPDATE"){

      deleteCollection('synchronize_hubspot_contacts', (e, deleted) => {

        if(e){
          console.log(e);
          DBO.close();
          process.exit();
        }else if(deleted){

          getFromHubspot((e, inserted) => {

            if(e){
              console.log(e);
              DBO.close();
              process.exit();
            }else if(inserted){
              synchronize();
            }

          });

        }

      });

    }else if(process.env.MODE == "CLEAN"){

      deleteCollection('synchronize_hubspot_contacts', (e, deleted) => {

        if(e){
          console.log(e);
          DBO_CLOSE = true;
          process.exit();
        }else if(deleted){

          deleteCollection('synchronized', (e, deleted) => {

            if(e){
              console.log(e);
              DBO_CLOSE = true;
              process.exit();
            }else if(deleted){

              getFromHubspot((e, inserted) => {

                if(e){
                  console.log(e);
                  DBO_CLOSE = true;
                  process.exit();
                }else if(inserted){
                  synchronize();
                }

              });

            }

          });

        }

      });

    }else{

      console.log("Please set a valid mode: DEFAULT, UPDATE, CLEAN");
      console.log("MODE=[DEFAULT, UPDATE, CLEAN] node index");
      DBO_CLOSE = true;
      process.exit();

    }

  }else{
    console.log("Please set a mode: DEFAULT, UPDATE, CLEAN");
    console.log("MODE=[DEFAULT, UPDATE, CLEAN] node index");
    DBO_CLOSE = true;
    process.exit();
  }

}

MongoClient.connect(MongoUrl, { useNewUrlParser: true }, (e, db) => {

  if(e){

    console.log("Error loading database");
    db.close();
    process.exit();

  }else if(db){

    DBO = db.db(Config.database.dbname);

    run();

    let dbclose = setInterval(() => {

      if(DBO_CLOSE){
        db.close();
        DBO = null;
      }

    }, 1000);

  }

});
