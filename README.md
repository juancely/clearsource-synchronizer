# Clearsource Synchronizer

A script to synchonize contacts and canditates IDs between Hubspot and Bullhorn APIs.

## Run modes

### Default mode

By default you start the script using:

 **MODE=DEFAULT node index**

The script will only check the database.

### Load mode

Start the script using:

 **MODE=UPDATE node index**

The script will load all contacts from Hubspot and update the database.

### Clean mode

Start the script using:

 **MODE=CLEAN node index**

The script will delete database, load all contacts from Hubspot and update the database.
