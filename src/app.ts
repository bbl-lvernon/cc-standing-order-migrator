// dependencies

import path from 'path';
import moment from 'moment';
import axios from 'axios';
import _, { isLength, StringNullableChain, toNumber } from 'lodash';
import * as winston from 'winston';
import dayjs from 'dayjs';
//import db drivers
import { bbankInformix  } from './lib/informix';
//import loggers
import logger from './logger/logger';
import dotenv from 'dotenv';
dotenv.config();
const ifx = new bbankInformix();

// config


export class StandingOrderMigration {
        private lineNo = 1;
    private orders;
    private apiCallStatus;

    private today = new Date();
    private yyyy = this.today.getFullYear().toString();
    private dd = String(this.today.getDate()).padStart(2, '0');
    private mm = String(this.today.getMonth() + 1).padStart(2, '0'); // Months are 0-based in JavaScript

//TODO  fix constructor below??    
//constructor(private env: any) {}

constructor() {}
      public async main():  Promise<void> {
        try{
        logger.info('------ cc-standing-order-migrator EXTRACT PROCESS STARTED ------');
        logger.info('------ 1/2 loadOrders PROCESS STARTED                  ---------');
        this.orders = await this.loadOrders();
        logger.info('------ 1/2 loadOrders PROCESS COMPLETED                ---------');
        const sent = await this.sendOrders(this.orders);
        logger.info('------ 2/2 sendOrders complete                             -----');
        logger.info(`------ 2/2 ${sent}/${this.orders.length} standing orders sent to API for processing-----`);
        } catch(err){
            logger.error(`Program ending due to error`);
            throw err;
        }  

    }
    private async loadOrders(): Promise<any> {
        try{
        logger.info('Obtaining database payload...');
        // 	1. Execute a query to retrieve customer information from the database on all active cards.
        //  2. Process the query results and return the data as an array.
        const today = dayjs().format('YYYYMMDD')
        await ifx.openConnection();
        const sql = `SELECT FIRST 10 ccardsitf.*, ccard3.ccardnameaddr 
        FROM ccardsitf
        LEFT JOIN ccard3 ON ccardsitf.ccardno = ccard3.ccardno
        WHERE startdate <= '${today}'  AND enddate >= '${today}'
        AND ccard3.ccardno IN (SELECT ccardno FROM ccard3 WHERE ccardstatus = 1)
        AND ccardsitf.frequency = '4';`;

        // const sql =`select ccard3.ccardno,ccardtype,fbeaccount,itfdategen,frequency,fixeddate,
        // amount,fixedamount, amountpercent, itferrdescri, ccard3.ccardnameaddr 
        // from ccardsitf_exe  
        // LEFT JOIN ccard3 ON ccardsitf_exe.ccardno = ccard3.ccardno
        // WHERE ccard3.ccardno IN (SELECT ccardno FROM ccard3 WHERE ccardstatus = 1)
        // AND itfdategen >= '20250125'`

        logger.info('Informix ccardsitf SQL QUERY: ' + sql);
            let sqlResult = await ifx.executeQuery(sql);
            logger.info(`------ 2/2 Number of Schedule Transfers Recieved : ${sqlResult.length} ---`);
            await ifx.closeConnection();
            return sqlResult;
        }catch(err){
         logger.error('Unable to retrieve database payload. \n' + err );
         throw err;    
        }            
    }
      
    private sanitizeDate(date: string): string {
        return dayjs(date, 'DD.MM.YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
      }

   private async sendOrders(allOrders : any): Promise<void> {
        logger.info('Sending Orders...');
let sent : number = 0;
        try{
                // Write header
                

                //this.LastModified = `${yyyy}${dd}${mm}`;
                // Load customer information from the database
                //logger.info('[ populateFile() ] stringified customerInfo: recieved' + JSON.stringify(allOrders));
                // Populate file with data
                for (const order of allOrders) {
                    //Format data and write to file
                    //logger.info('Stringified info Object from Database: ' + JSON.stringify(order));
                    logger.info(`currently Processing: ccardno: ${JSON.stringify(order.ccardno)}, frequency: ${JSON.stringify(order.frequency)}, amount: ${JSON.stringify(order.amount)} `);
                    //logger.info('literal info Object from Database: ' + order)

                    //let branch = await this.getSourceCode(order.BRANCHCODE),
    
                    //CUSTorder OBJECT
                    let transferBody1 =  {
                        bankAccount: order.fbeaccount,
                        cardNumber: order.ccardno.toString(),  
                        amount: await this.getAmount(order) || "", // Optional, depends on AmountPreference and Frequency conditions
                        comments: "Scheduled Credit Card Payment",  
                        transferFrequency: await this.getFrequency(order), // Example: "O" | "D" | "W" | "F" | "M" | "Q" | "B" | "Y" | "DT"
                        transferDate: await this.getTransferDate(order), // Example: "2025-02-19" (Optional if one-time transfer)
                        transferContinuity: await this.getContinuity(order), // Example: "I" | "C" | "D" | "A"
                        transferCount: "", // Example: "1" (Optional if TransferContinuity !== "D")
                        transferEndDate: "", // Example: "2025-12-31" (Expiry date)
                        amountPreference: await this.getAmtPref(order), // Example: "L" (Optional)
                        daysBeforeDueDate: await this.getDays(order), // Example: "15" (Mandatory ONLY if TransferContinuity = "I", range 0-31)
                        thrshldLmtPrctge: "", // Example: "100" (Optional, percentage threshold limit)
                        routingNumber: "437623092", // Example (Fixed routing number)
                        accNickname: await this.sanitizeString(order.ccardnameaddr.split("#")[0].trim()), // Example (Unique, no spaces)
                        accType: await this.getAccType(order), //this.getAccType(order) Example: "01" | "11"
                        accTitle: order.ccardnameaddr.split("#")[0].trim(),
                        bankName: "BBL", // Example: "BELIZE BANK"
                        accNumber: order.fbeaccount,
                        verifyAccountMigration: "Y"
                      }
                      let transferBody = {
                        bankAccount: "137125060230005",
                        cardNumber: "5157930100010014",
                        accountSrNo: "596000000000008867",
                        amount: 10.00,
                        comments: "Payment for services",
                        transferFrequency: "M",
                        transferDate: "02/28/2025",
                        transferContinuity: "A",
                        transferCount: "12",
                        transferEndDate: "02/26/2026",
                        transferAmount: 20,
                        daysBeforeDueDate: 3,
                        thrshldLmtPrctge: 10,
                        routingNumber: "437623092",
                        accNickname: "PersonalAccount123",
                        accType: "11",
                        accNumber: "137125010230005",
                        accTitle: "John Doe",
                        bankName: "Sample Bank",
                        verifyAccountMigration: "Y"
                        }

                    await this.sendTransfer(transferBody);
                    //every 500 display a log
                    sent = sent + 1;
                    console.log("transferBody :" + JSON.stringify(transferBody));
                    (sent % 1 === 0) && logger.info(`Transfers sent so far: ${sent}`);            
                }           
                logger.info(`Total transfers sent ` + sent);   
            }catch(err){logger.error('Unexpected system error in sendingOrders()'); throw err}
        }

    async getFrequency(order: any): Promise<string> {

                    return "M"; //all orders are monthly
    }

    private sanitizeString(str: string): string {
        return (str ?? "").replace(/[\s,.:\"']/g, "");
    }
      
    async getAmount(order: any) {
        //logger.info(`order.amount : ${order.amount} , order.fixedamount : ${order.fixedamount}` );   
        if (order.amount == "1" && order.fixedamount >= "0") { //1 = fixed amount
            const amt = order.fixedamount.toString(); // Ensure it's a string
            return amt;
        } else {
            return 0;
        }
    }
    

    async getTransferDate(order: any): Promise<string> { //<-- ONLY MANDATORY FOR ONE-TIME ORDERS
         return "";
    }

    async getContinuity(order: any): Promise<string> {
        return 'I'; //indefinitely
    }

    async getAmtPref(order: any): Promise<string> {
        let pref
        if(order.amount == 1 && order.fixedamount >= 0){
            pref = "F"; //fixed amount
        }else if(order.amount == 2 && order.fixedamount == 0){
            pref = "M"; //minimum payment
        //}else if((order.amount == 3 || order.amount == 4) && order.fixedamount >= 0){
        }else if((order.amount == 3 || order.amount == 4) && order.amountpercent == 100){
            pref = "C"; // 100% of full/staement bal
            return pref;
        }
    }

    async getDays(order: any): Promise<string> {

        if(order.frequency == 1)
        {
            return "1"; //15th = 1 day before 16th due date
        }
        if(order.frequency == 4){
            return "0"; //on statement day the 16th
        }
        if(order.frequency == 3){
            return ""; //fixed date
        }
        if(order.frequency == 2 || order.frequency == 3){
            return "17"; //17 days - 16th statement = end of month
        }
    }

    async getAccType(order: any): Promise<string> {
        if (order.fbeaccount) {
            const accType = order.fbeaccount.substring(8, 10); // Extracts characters at position 9-10
            if(accType === "01"){return "01"} //checkings
            else return "11"; //savings
        }
}


    async sendTransfer(body: any): Promise<any> {
        try {
            const headers = { 
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "cc-standing-order-migration/1.0",
                "Cache-Control": "no-cache",
                "api-key" : process.env.SO_API_KEY
            };
    
            const url = process.env.I2C_STANDING_ORDERS_URL;
            if (!url) throw new Error("I2C_STANDING_ORDERS_URL is not defined");

            // logger.info(`about to send standing order as follows:`);
            // logger.info(`standing order url:`+JSON.stringify(url));
            logger.info(`standing order body: `+JSON.stringify(body));
            // logger.info(`standing order headers:`+JSON.stringify(headers));

            const response = await axios.post(url, body, { headers });
    
            logger.info(`API CALLED - Status: ${response.status}, returning Data: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (err) {
            logger.error(`Error sending scheduled transfer API request: ${err.message} ${err.code} ${err.response.statusText} `);
            throw err.code;
        }
    }
}

let app = new StandingOrderMigration();
app.main();


