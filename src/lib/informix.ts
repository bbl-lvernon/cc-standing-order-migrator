"use strict";
import { Database } from "ibm_db"; // Ensure you have ibm_db installed
import dotenv from "dotenv";
// Load environment variables globally
dotenv.config();
export class bbankInformix {
    connectionString: string = ``;

    constructor() {
        // Constructing the Informix connection string
        this.connectionString = `DATABASE=${process.env.DATABASE};HOSTNAME=${process.env.HOST};PORT=${process.env.PORT};UID=${process.env.UID};PWD=${process.env.PASS};INFORMIXSERVER=${process.env.INFORMIXSERVER};PRO=olsoctcp`;
    }

    async executeQuery(sqlQuery: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.openConnection(this.connectionString).then((informixConn: any) => {
                informixConn.query(sqlQuery).then(
                    resp => resolve(resp),
                    err => reject(err)
                );
            }).catch(err => reject(err));
        });
    }

    async openConnection(connectionString: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const callback = (err: any, db: Database) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(db);
                }
            };
            // Open Informix connection
            const informix = require("ibm_db");
            console.log('connectionString ' + JSON.stringify(this.connectionString));
            informix.open(connectionString, callback);
        });
    }
}
