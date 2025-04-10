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
    private filteredOrders;
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
        logger.info('------ 0/2 loadOrders PROCESS STARTED                  ---------');
        this.orders = await this.loadOrders();
        logger.info('------ 1/2 loadOrders PROCESS COMPLETED                ---------');
        const sent = await this.sendOrders(this.orders);
        logger.info('------ 2/2 sendOrders PROCESS COMPLETED                   -----');
        logger.info(`------ 2/2 ${sent}/${this.orders.length} standing orders sent to API for processing-----`);
        } catch(err){
            logger.error(`Program ending due to error`);
        }  

    }
    private async loadOrders(): Promise<any> {
        try{
        logger.info('Obtaining database payload...');
        // 	1. Execute a query to retrieve customer information from the database on all active cards.
        //  2. Process the query results and return the data as an array.
        const today = dayjs().format('YYYYMMDD')
        await ifx.openConnection();
        const sql = `SELECT FIRST 50 ccardsitf.*, ccard3.ccardnameaddr 
        FROM ccardsitf
        LEFT JOIN ccard3 ON ccardsitf.ccardno = ccard3.ccardno
        WHERE startdate <= '${today}'  AND enddate >= '${today}'
        AND ccard3.ccardno IN (SELECT ccardno FROM ccard3 WHERE ccardstatus = 1)
        AND fbeaccount NOT LIKE ''
        AND ccardtype = '42'`;//usd cards
        //AND ccardsitf.frequency = '4'

        // const sql =`select ccard3.ccardno,ccardtype,fbeaccount,itfdategen,frequency,fixeddate,
        // amount,fixedamount, amountpercent, itferrdescri, ccard3.ccardnameaddr 
        // from ccardsitf_exe  
        // LEFT JOIN ccard3 ON ccardsitf_exe.ccardno = ccard3.ccardno
        // WHERE ccard3.ccardno IN (SELECT ccardno FROM ccard3 WHERE ccardstatus = 1)
        // AND itfdategen >= '20250125'`

        logger.info('Informix ccardsitf SQL QUERY: ' + sql);
            let sqlResult = await ifx.executeQuery(sql);
            logger.info(`------ 2/2 Number of Schedule Transfers Recieved : ${sqlResult.length} ---`);
            //await ifx.closeConnection();
            return sqlResult;
        }catch(err){
         logger.error('Unable to retrieve database payload. \n' + err );
         throw err;    
        }            
    }
      
    private sanitizeDate(date: string): string {
        return dayjs(date, 'DD.MM.YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
      }

    private async sendOrders(allOrders){
        let order;
        let sent = 0;
        let rejectedCards = 0;
        let sentStatus;
                   logger.info(`------ Sorting Personal/Corporate.... ---`);
        for(order of allOrders){ 
            try{
            //first we will check if card is personal or coporate using the bin
            logger.info(`BEGIN SO FILTER FOR CARD TYPE, CCARDNO: ` + order.ccardno );
            let cardType = await this.categorizeCard(order);
            if(cardType == 'Unknown'){
                logger.warn(`Card Type unknown, skipping SO for card ` + order.ccardno);
                rejectedCards = rejectedCards+1;
                (sent % 1 === 0) && logger.info(`Transfers rejected so far: ${rejectedCards}`);  
            }
            else{
            //second we will check if this card has a pcrn for this card number in the informix non financial table
            const PcrnSql = `select primary_card_reference_number as pcrn, member_number as memberno from informix.non_financial_detail_i2c where card_number = '${order.ccardno}'`;
            let hasPcrn = await ifx.executeQuery(PcrnSql);
            logger.info(`------ pcrn first query result: ${JSON.stringify(hasPcrn)} ---`);
            if(hasPcrn[0].pcrn || hasPcrn[0].pcrn != "")
            {
            //PCRN FOUND
                    logger.info(`------ pcrn found on first query, re-querying the same table to find the real pcrn ---`);
                    const realPcrnSql = `select primary_card_reference_number as pcrn, member_number as memberno from informix.non_financial_detail_i2c where card_number = '${hasPcrn}'`;
                    let realPcrn = await ifx.executeQuery(realPcrnSql);
                    if(!realPcrn.pcrn || realPcrn.length !> 0){
                        logger.warn(`------Could not find a valid Primary Card Reference Number, skipping.`);
                        rejectedCards = rejectedCards+1;
                        (sent % 1 === 0) && logger.info(`Transfers rejected so far: ${rejectedCards}`);  
                        break;  
                    }
                if(cardType == 'Corporate'){
                    const queryOwner = `SELECT * FROM informix.ubtb_acctmandate WHERE UBCUSTOMERCODE = '${realPcrn[0].memberno}' AND UBACCOUNTID = '${order.fbeaccount}' AND UBROLE = 'OWNER'`;
                    let owner = await ifx.executeQuery(queryOwner);
                    //logger.info(`------ ran sql : ${queryOwner} with result: ${JSON.stringify(owner)} ---`);
                    if(owner.length > 0) { //if owner is found, migrate this order
                        logger.info(`------ found owner and sending order : ${JSON.stringify(order)}`);
                        await this.sendOrder(order)
                        sent = sent + 1;
                        (sent % 1 === 0) && logger.info(`Transfers processed so far: ${sent}`);    
                        
                    }else{ //no owner found so skip
                        logger.info(`------didnt find owner for card ${order.ccardno}, fbe account ${order.fbeaccount}, skipping`);
                        rejectedCards = rejectedCards+1;
                        (sent % 1 === 0) && logger.info(`Transfers rejected so far: ${rejectedCards}`);    
                        
                    }
                }  else if(cardType == 'Personal'){
                const queryOwner = `SELECT * FROM informix.ubtb_acctmandate WHERE UBCUSTOMERCODE = '${hasPcrn[0].memberno}' AND UBACCOUNTID = '${order.fbeaccount}' AND UBROLE IN ('OWNER', 'JOINTACHOLDER') `;
                let owner = await ifx.executeQuery(queryOwner);
                //logger.info(`------ ran sql : ${queryOwner} with result: ${JSON.stringify(owner)} ---`);
                if(owner.length > 0) { //if owner is found, migrate this order
                    logger.info(`------ found owner and sending order : ${JSON.stringify(order)}`);
                    await this.sendOrder(order)
                    sent = sent + 1;
                    (sent % 1 === 0) && logger.info(`Transfers processed so far: ${sent}`);    

                }else{ //no owner found so skip
                    logger.info(`------didnt find owner for card ${order.ccardno}, fbe account ${order.fbeaccount}, skipping`);
                    rejectedCards = rejectedCards+1;
                    (sent % 1 === 0) && logger.info(`Transfers rejected so far: ${rejectedCards}`);    
                    
                }
            }
        }
        else if(!hasPcrn[0].pcrn || hasPcrn[0].pcrn == "")
        {            //NO PCRN FOUND / EMPTY / REAL OWNER FOUND
            logger.info(`------ pcrn not found on first query, re-querying the same table not required ---`);
            if(cardType == 'Corporate'){
            const queryOwner = `SELECT * FROM informix.ubtb_acctmandate WHERE UBCUSTOMERCODE = '${hasPcrn[0].memberno}' AND UBACCOUNTID = '${order.fbeaccount}' AND UBROLE = 'OWNER'`;
            let owner = await ifx.executeQuery(queryOwner);
            //logger.info(`------ ran sql : ${queryOwner} with result: ${JSON.stringify(owner)} ---`);
            if(owner.length > 0) { //if owner is found, migrate this order
                logger.info(`------ found owner and sending order : ${JSON.stringify(order)}`);
                await this.sendOrder(order);
                sent = sent + 1;
                (sent % 1 === 0) && logger.info(`Transfers processed so far: ${sent}`);    

            }else{ //no owner found so skip
                logger.info(`------didnt find owner for card ${order.ccardno}, fbe account ${order.fbeaccount}, skipping`);
                rejectedCards = rejectedCards+1;
                (sent % 1 === 0) && logger.info(`Transfers rejected so far: ${rejectedCards}`);    
                
            }
        } else if(cardType == 'Personal'){
            const queryOwner = `SELECT * FROM informix.ubtb_acctmandate WHERE UBCUSTOMERCODE = '${hasPcrn[0].memberno}' AND UBACCOUNTID = '${order.fbeaccount}' AND UBROLE IN ('OWNER', 'JOINTACHOLDER')`;
            let owner = await ifx.executeQuery(queryOwner);
            //logger.info(`------ ran sql : ${queryOwner} with result: ${JSON.stringify(owner)} ---`);
            if(owner.length > 0) { //if owner is found, migrate this order
                logger.info(`------ found owner and sending order : ${JSON.stringify(order)}`);
                sentStatus = await this.sendOrder(order);
                rejectedCards = rejectedCards+1;
                (sent % 1 === 0) && logger.info(`Transfers rejected so far: ${rejectedCards}`);    
                sent = sent + 1;
                (sent % 1 === 0) && logger.info(`Transfers processed so far: ${sent}`);    

            }else{ //no owner found so skip
                logger.info(`------didnt find owner for card ${order.ccardno}, fbe account ${order.fbeaccount}, skipping`);
                rejectedCards = rejectedCards+1;
                (sent % 1 === 0) && logger.info(`Transfers rejected so far: ${rejectedCards}`);    
            }
        }            
    }
}
}catch(err){
        rejectedCards = rejectedCards++;
        logger.error('Rejecting Card ' + order.ccardno+ ' Standing Order failed: '+ JSON.stringify(err));
        } }
    logger.info(`Total transfers processed ${sent+rejectedCards}, sent: ${sent}, rejected/failed`);   
    logger.info(`Total transfers sent to i2c ` + sent);  
    logger.info(`Total transfers failed ` + rejectedCards);   
    }



    private async categorizeCard(order): Promise<string | Error> {
        let cardno = order.ccardno.toString(); // Ensure it's a string
        const bin = cardno.substring(0, 8); // Extract first 8 digits
        logger.info(`BIN is: ${bin}`); // Log BIN for debugging

        const corporateBins: string[] = [
            "51579301", // MasterCard AA Platinum Company
            "5434641901", // MPL Platinum Company
            "52554850", "52554860" // AA MasterCard Platinum Corporate
        ];

        const personalBins: string[] = [
            // Visa Personal
            "49166531", "458148000", "458148002", "458148003", "458148004", "458148005", "458148006", "458148007",

            // MasterCard Standard Personal
            "53395559",

            // MasterCard AA Standard Personal
            "55261101",

            // MasterCard AA Platinum Personal
            "51579300",

            // AA MasterCard Platinum Personal
            "52554852", "52554862",

            // MPL Platinum Personal
            "5434641903", "5434641904", "5434641900", "5434641906", "5434641907", "5434641908"
        ];

        if (corporateBins.includes(bin)) {
            logger.info(`Card type was found to be C `);   
            return "Corporate";
        } else if (personalBins.includes(bin)) {
            logger.info(`Card type was found to be P`);  
            return "Personal";
        } else {
            logger.info(`Card type was found to be Unkown`);  
            return "Unknown";
        }
}

    
    private async sendOrder(order : any) {
        logger.info('Sending Orders...');
let sent : number = 0;
let failedCards: number = 0;

                // Write header
                

                //this.LastModified = `${yyyy}${dd}${mm}`;
                // Load customer information from the database
                //logger.info('[ populateFile() ] stringified customerInfo: recieved' + JSON.stringify(allOrders));
                // Populate file with data
                //for (const order of allOrders) {

                    //Format data and write to file
                    //logger.info('Stringified info Object from Database: ' + JSON.stringify(order));
                    logger.info(`currently Processing: ccardno: ${JSON.stringify(order.ccardno)},order.fbeaccount: ${order.fbeaccount.toString()} frequency: ${JSON.stringify(order.frequency)}, amount: ${JSON.stringify(order.amount)} `);
                    //logger.info('literal info Object from Database: ' + order)

                    //let branch = await this.getSourceCode(order.BRANCHCODE),
    
                    //CUSTorder OBJECT
                    let transferBody =  {
                        bankAccount: order.fbeaccount,//.toString(),
                        cardNumber: order.ccardno.toString(),  
                        amountPreference: await this.getAmtPref(order), // Example: "L" (Optional)
                        amount: await this.getAmount(order)|| 0,
                        comments: "Scheduled Credit Card Payment",  
                        transferFrequency: await this.getFrequency(order), // Example: "O" | "D" | "W" | "F" | "M" | "Q" | "B" | "Y" | "DT"
                        transferContinuity: await this.getContinuity(order), // Example: "I" | "C" | "D" | "A"
                        daysBeforeDueDate: await this.getDays(order), // Example: "15" (Mandatory ONLY if TransferContinuity = "I", range 0-31)
                        routingNumber: "003006959",//order.ccardno.tostring, // Example (Fixed routing number)
                        accNickname: await this.sanitizeString(order.ccardnameaddr.split("#")[0].trim()).slice(0, 16) + order.ccardno.slice(0, 4),
                        accType: await this.getAccType(order), //this.getAccType(order) Example: "01" | "11"
                        accTitle: order.ccardnameaddr.split("#")[0].trim(),
                        bankName: "BBL", // Example: "BELIZE BANK"
                        accNumber: order.fbeaccount,
                        verifyAccountMigration: "Y",
                        requiresVerification: "N"
                      }
                    //   let transferBody1 = {
                    //     //bankAccount: "155304010230002",
                    //     //4916653107949019 nellie, 5255486206517254 sheena, 
                    //     bankAccount: "137125010230002",
                    //     cardNumber: "4916653107949019",
                    //     amount: 0.00,
                    //     comments: "NEL STANDING ORDER TEST SH .00",
                    //     transferFrequency: "M",
                    //     transferContinuity: "I",
                    //     amountPreference: "M",
                    //     daysBeforeDueDate: "5",
                    //     routingNumber: "003006959",
                    //     accNickname: "NELCARDACC",
                    //     accType: "11",
                    //     accNumber: "137125010230002",
                    //     accTitle: "NELACC",
                    //     bankName: "BELIZEBANKLTD",
                    //     verifyAccountMigration: "Y",
                    //     requiresVerification: "N"
                    //    }
                    console.log("transferBody :" + JSON.stringify(transferBody));
                    try{
                    let response = await this.sendTransfer(transferBody);
                    return {status:0, message : response}}catch(err)
                    {
                        logger.error(`Transfers processed so far: ${sent}`);
                        return {status: 1, message: err}  
                    }
        }

    async getFrequency(order: any): Promise<string> {

                    return "M"; //all orders are monthly
    }

    private sanitizeString(str: string): string {
        return (str ?? "").replace(/[\s,.:\"']/g, "");
    }
      
    async getAmount(order: any): Promise<number> {
        logger.info(`ATGETAMOUNT order.amount: ${order.amount}, order.fixedamount: ${order.fixedamount}`);
    
        if (order.amount === "1" && Number(order.fixedamount) >= 0) { // Ensure proper comparison
            return Number(order.fixedamount); // Convert to a number before returning
        }
    
        return 0;
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
            return pref;
        }else if(order.amount == 2 && order.fixedamount == 0){
            pref = "M"; //minimum payment
            return pref;
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
                if (err.response) {
                    const errorResponse = err.response.data;
                    
                    // Extract response details
                    const cardNumber = body.cardNumber;  // Assuming the card number is in the request body
                    const responseCode = errorResponse.getCardholderProfileResponse?.responseCode;
                    const responseDesc = errorResponse.getCardholderProfileResponse?.responseDesc;
            
                    logger.error(`Error in API request: ${err.message} ${err.code} 
                    Error Response: ${JSON.stringify(errorResponse)}`);
                        logger.warn(`SO for Card ${cardNumber} failed: ${JSON.stringify(errorResponse)}`);
                        throw errorResponse;
                    }
            }
        }
    }

let app = new StandingOrderMigration();
app.main();


