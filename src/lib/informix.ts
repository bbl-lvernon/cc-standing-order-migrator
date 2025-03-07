"use strict";

//const ibmdb =  require('ibm_db');
import * as ibmdb from 'ibm_db';
// import * as bblmainConfig from '../config/bblmain-ifx.datasource.json';
import dotenv from 'dotenv';
// const dotenvExpand = require('dotenv-expand');
dotenv.config();

let connectionString: string;
let db: ibmdb.Database;

let bblmainConfig ={
  "host": `${process.env.IFX_HOSTNAME}`,
  "port": process.env.IFX_PORT,
  "user": `${process.env.IFX_UID}`,
  "password": `${process.env.IFX_PWD}`,
  "database": `${process.env.IFX_DATABASE}`
}

export class bbankInformix {
    constructor() {
      // Initializaing connection to informix
      connectionString = `DATABASE=${bblmainConfig.database};HOSTNAME=${bblmainConfig.host};PORT=${bblmainConfig.port};UID=${bblmainConfig.user};PWD=${bblmainConfig.password};PROTOCOL=TCPIP`;
    }
    
    async openConnection() {
      // opens a synchronous connection 
      let dbConnected: any;
      try{
         console.log('Connection String: ' + connectionString);
        db = ibmdb.openSync(connectionString);
        dbConnected = db.connected;
        console.log('Connection Opened... ');
      } catch(err){
        dbConnected = false;
        console.log('There was an error opening the database connection: ' + err);
      }
      
      return dbConnected;
    }

    // execute regular query
    async executeQuery(sql: string) {
      let data: any;
      data = await db.query(sql);

      return data;
    }

    // Can be used for UPDATE, INSERT and DELETE. Returns the number of rows affected
    async executeNonQuery(sql: string): Promise<any> {
      let data: any;
      let statement = db.prepareSync(sql);
      // data = statement.executeNonQuerySync();
      data = await statement.executeNonQuery();

      return data;
    }
  
    // close this connection when finished...
    async closeConnection() {
      ibmdb.close(db);
      console.log('Informix Connection Closed...');
    } 

}