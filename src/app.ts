// dependencies

import path from 'path';
import moment from 'moment';
import _, { isLength, StringNullableChain, toNumber } from 'lodash';
import * as winston from 'winston';
import dayjs from 'dayjs';
import { commonConf, BBILMODE } from'./config/common';
//import db drivers
import { bbankInformix  } from './lib/informix';
//import loggers
import { ApplicationLogger } from './logger/logger';

const ifx = new bbankInformix();
const appLogger = new ApplicationLogger();

const logger = winston.loggers.get('appLogger');

appLogger.instiantiateLogger();

// config


export class StandingOrderMigration {

    private sqlResult: any[] = [];
    private FilePath: string = '';
    private CurrDate: string = '';

    private SourceCode: string = '';
    private ClientId: string = '';
    private LastModified: string = '';
    private StatusIndicator: string = '';
    private RecordType: string = '';
    private Gender: string = '';
    private FullName: string = '';
    private AddressLine1: string = '';
    private AddressLine2: string = '';
    private AddressLine3: string = '';
    private City: string = '';
    private CountryOrState: string = '';
    private ZipOrPostcode: string = '';
    private Country: string = '';
    private Dob: string = '';
    private NationalID: string = '';
    private DisplayField1: string = '';
    private DisplayField2: string = '';
    private DisplayField3: string = '';
    private Comment1: string = '';
    private Comment2: string = '';
    private BranchCode: string = '';

    private lineNo = 1;
    private orders;
    private apiCallStatus;

//TODO  fix constructor below??    
//constructor(private env: any) {}

constructor() {}
      public async main():  Promise<void> {
        try{
        logger.info('------ cc-standing-order-migrator EXTRACT PROCESS STARTED ------');
        logger.info('------ 1/3 openFile PROCESS STARTED ---------');
        this.orders = await this.loadOrders();
        logger.info('------ 2/3 populateFile PROCESS STARTED -----');
        //this.i2cStatus = await this.createI2cOrders(this.orders);
        } catch(err){
            logger.error(`!Error occurred while processing runtime! ` + err);
            throw err;
        }  

    }
    private async loadOrders(): Promise<any> {
        try{
        logger.info('Obtaining database payload...');
        // 	1. Execute a query to retrieve customer information from the database.
        //  2. Process the query results and return the data as an array.
        const sql = 'SELECT * FROM main_dev2:mainuser.ccardstif;';
        logger.info('Informix ccardsitf SQL QUERY: ' + sql);
            let sqlResult = await ifx.executeQuery(sql);
            logger.info('sqlResult: ' + JSON.stringify(sqlResult));
            return sqlResult;
        }catch(err){
         logger.error('Unable to retrieve database payload. \n' + err );
         throw err;    
        }            
    }

    //private createI2cOrders(str: string): object {    }


    private sanitizeString(str: string): string {
        return (str ?? "").replace(/'/g, "").trimEnd();
      }    
      
    private sanitizeDate(date: string): string {
        return dayjs(date, 'DD.MM.YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
      }
    private async openFile(): Promise<void> {
        
        // 1. Prepare the file path and file name for the output file.
        // 2. Create directories if they don't exist.
        // 3. Generate the current date to include in the file name.
        // 4. Open the file for writing using the appropriate file stream.

        // this.FilePath = path.join(commonConf.outputDir);
        // this.CurrDate = moment().format('YYYYMMDD');
        // const fileName = `cc-standing-order-migrator_${this.CurrDate}.out`;
        // const filePath = path.join(this.FilePath, fileName);

        // // Create directories if they don't exist
        // if (!fs.existsSync(this.FilePath)) {
        //     logger.info(`Creating directories...`);
        //     fs.mkdirSync(this.FilePath, { recursive: true });
        // }
        // // Open the file for writing, delete if exists
        // this.FilePointer = fs.createWriteStream(filePath, { flags: 'w' });
        // logger.info('Writing to file: \\output\\' + fileName);
    }


    Bank Account  : res.fbeaccount
    Card Number  : res.ccardno (a.primary)
    ReferenceID  :  techywe.variable (a.optional)
    AccountSrNo  : techywe.variable 
    Amount  : 
    OPTIONAL IF AmountPreference is L
    IF NOT if( res.frequency == 1 && res.amount == 1) :   //15th of month
       fixedamount ? if( res.frequency = 2 && res.amount == 1) :  //end of month
          "OPTIONAL" ? if( res.frequency = 3 && res.amount == 1) : // fixeddate
             fixedamount ? if( res.frequency = 4 && res.amount == 1) : fixedamount //statement due date
    Comments  : "OPTIONAL"
    TransferFrequency  :
    O=One, 
    D=One Date, 
    W=Weekly, 
    F=Two Week, 
    M=Month, 
    Q=Quarter, 
    B=Six Month, 
    Y=Yearly, 
    DT=Daily Transfer
    TransferDate : (OPTIONAL IF ONE TIME)
    TransferContinuity  : "I"=Continue Infinitely
                    "C"=Count
                    "D"=Continue till date
                    "A"=Continue Till Amount
    
    TransferCount  :  if(TransferContinuity !== D) : ""(OPTIONAL) ? 1 (1 transfer in a schedule txn?)
    TransferEndDate  : Expiry date
    AmountPreference  : "L"
    DaysBeforeDueDate  : Number 0-31 (MANDATORY IF TransferContinuity = I )
    ThrshldLmtPrctge : "100"  %
    routing number : BBLBZE
    acc nickname(unique w no space) : this.username
    acc type : 01 OR 11
    acc number : res.fbeaccount
    acc title : "this.firstname + this.lastname"
    bank name : "BELIZE BANK"
    







    ccardno	ccardtype	startdate	enddate	branchtype	branch	product	subproduct	account	suffix	instance	jurisdiction	oribranch	frequency	fixeddate	amount	fixedamount	amountpercent	flag1	flag2	flag3	flag4	flag5
    4.91665E+15	26	20070214	20991231	S	695	2	3	13555	0	1	1	695	1	20100215	1	100	0	1	0	1	0	0
    4.33145E+15	42	20171102	20991231	S	0	0	0	0	0	1	1	630	2	20220430	2	0	0	1	0	3	0	0
    4.33145E+15	42	20150401	20991231	S	650	2	1	100570	0	1	1	650	3	20150330	1	125	0	1	0	4	0	0
    4.33145E+15	42	20120118	20991231	S	695	2	2	238935	0	1	1	695	4	0	2	0	0	1	0	1	0	0
                                                                                            
    flag6	flag7	flag8	accountcur	paycur	convrate	brate	arate	laststatdate	lastdateproc	numfree1	numfree2	decifree1	decifree2	charfree1	charfree2	recordstamp	fbeaccount	channel	userinput			
    0	0	0	0	100	1	0	0	20100316	0	0	0	0	0	     	     	2.00702E+15	               	               	               			
    0	0	0	0	0	0	0	0	20220327	0	0	0	0	0	     	     	2.01711E+15	1.43881E+14	               	               			
    0	0	0	0	0	0	0	0	20150225	0	0	0	0	0	     	     	2.01503E+15	               	               	               			
    0	0	0	0	0	0	0	0	20130325	0	0	0	0	0	     	     	2.01201E+15	               	               	               			
    








    private async writeHeader(): Promise<void> {
        //1. Write the header line to the file with column names.

        this.SourceCode      = "Source-Code";
        this.ClientId        = "Client-ID";
        this.LastModified    = "Last-Modified-Date";
        this.StatusIndicator = "Status-Indicator";
        this.RecordType      = "Record-Type";
        this.Gender          = "Gender";
        this.FullName        = "Full-Name";
        this.AddressLine1    = "Address-1";
        this.AddressLine2    = "Address-2";
        this.AddressLine3    = "Address-3";
        this.City            = "City";
        this.CountryOrState  = "Country/State";
        this.ZipOrPostcode   = "Zip/Postcode";
        this.Country         = "Country";
        this.Dob             = "Date-Of-Birth";
        this.NationalID      = "National-ID";
        this.DisplayField1   = "Display-Field-1";
        this.DisplayField2   = "Display-Field-2";
        this.DisplayField3   = "Display-Field-3";
        this.Comment1        = "Comment-1";
        this.Comment2        = "Comment-2";

        const headerLine = `${this.SourceCode}|${this.ClientId}|${this.LastModified}|${this.StatusIndicator}|${this.RecordType}|${this.Gender}|${this.FullName}|${this.AddressLine1}|${this.AddressLine2}|${this.AddressLine3}|${this.City}|${this.CountryOrState}|${this.ZipOrPostcode}|${this.Country}|${this.Dob}|${this.NationalID}|${this.DisplayField1}|${this.DisplayField2}|${this.DisplayField3}|${this.Comment1}|${this.Comment2}|\n`;
        this.writeFileLine(headerLine);
    }

    private async writeFileLine(line: string): Promise<void> {
        //logger.info('at writeFileLine');
        //1. Write a single line of data to the file.

    //     if (this.FilePointer) {
    //         this.FilePointer.write(line, (err: Error | null) => {
    //             if (err) {
    //                 logger.error('Error writing line to file:', err);
    //             }
    //         });
    //     }
    // }

    // private async closeFile(): Promise<void> {
    //     logger.info('Saving to disk...');
        // 1. Close the file stream once all data is written.
    //             if (this.FilePointer) {
    //                 this.FilePointer.end();
    //             }
    // }

    // private async populateFile(BBILMode:string): Promise<void> {
    //     logger.info('Populating file...');
    //     // 1. Load customer information from the database.
    //     // 2. Format the data retrieved from the database.
    //     // 3. Write each formatted line of data to the output file.
    //     try{
    //             // Write header
    //             this.writeHeader();

    //             const today = new Date();
    //             const yyyy = today.getFullYear().toString();
    //             const dd = String(today.getDate()).padStart(2, '0');
    //             const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based in JavaScript

    //             this.LastModified = `${yyyy}${dd}${mm}`;
    //             // Load customer information from the database
    //             let allInfo = await this.loadCustInfo(BBILMode);
    //             //entire sql result
    //             logger.info('Number of Clients obtained from DB: ' + allInfo.length);
    //             //logger.info('[ populateFile() ] stringified customerInfo: recieved' + JSON.stringify(allInfo));
    //             // Populate file with data
    //             for (const info of allInfo) {
    //                 // Format data and write to file
    //                 //logger.info('Stringified info Object from Database: ' + JSON.stringify(info));
    //                 //logger.info('Stringified clientID from Database: ' + JSON.stringify(info.CLIENTID));
    //                 //logger.info('literal info Object from Database: ' + info)

    //                 let branch = await this.getSourceCode(info.BRANCHCODE);


    //                 //CUSTINFO OBJECT
    //                 let line = `${branch}|${
    //                 padWithSpaces(this.sanitizeString(info.CLIENTID), 50)}|${
    //                 this.LastModified}|${
    //                 info.STATUSINDICATOR}|${
    //                 info.RECORDTYPE}|${
    //                 padWithSpaces(info.GENDER,1)}|${
    //                 padWithSpaces(this.sanitizeString(info.FULLNAME), 50)}|${
    //                 padWithSpaces(info.ADDRESS1, 50)}|${
    //                 padWithSpaces(info.ADDRESS2, 50)}|${
    //                 padWithSpaces(info.ADDRESS3, 50)}|${
    //                 padWithSpaces(info.CITY, 20)}|${
    //                 padWithSpaces(info.COUNTRYORSTATE, 20)}|${
    //                 padWithSpaces(info.ZIPORPOSTCODE, 20)}|${
    //                 padWithSpaces(info.COUNTRY, 20)}|${
    //                 padWithSpaces(info.DOB, 20)}|${
    //                 padWithSpaces(info.NATIONALID, 20)}|${
    //                 padWithSpaces(info.DISPLAYFIELD1, 20)}|${
    //                 padWithSpaces(info.DISPLAYFIELD2, 20)}|${
    //                 padWithSpaces(info.DISPLAYFIELD3, 20)}|${
    //                 padWithSpaces(info.COMMENT1, 100)}|${
    //                 padWithSpaces(info.COMMENT2, 100)}| \n`;
                    
    //                 function padWithSpaces(value: string | null | undefined, length: number): string {
    //                     // Check for null or undefined; if found, return spaces of specified length
    //                     return (value ?? "").trimStart().padEnd(length, " ");
    //                 }
    //                 this.writeFileLine(line);
    //                 //every 500 display a log
    //                 this.lineNo = this.lineNo + 1;
    //                 (this.lineNo % 10000 === 0) && logger.info(`Lines written so far: ${this.lineNo}`);            
    //             }           
    //             logger.info(`Total lines written to file: ` + this.lineNo);   
    //         }catch(err){logger.error('Unable to obtain database payload. Error as follows: ' + err); throw err}
    //     }
    }


    private async getSourceCode(branchShortCode: string){
        // 1. Determine the source code based on the provided branch code.
        // 2. Return the corresponding source code.
        
        try{
        if (parseInt(branchShortCode) == 110) {
			this.SourceCode = "BBLBU";
		}
		else
		if (parseInt(branchShortCode) == 200){
			this.SourceCode = "BBLIN";	
			}
		else 
		if (parseInt(branchShortCode) == 625) {
			this.SourceCode = "BBLDG";
		}
		else 
		if (parseInt(branchShortCode) == 626) {
			this.SourceCode = "BBLPL";	
			}
		else 
		if (parseInt(branchShortCode) == 630) {
			this.SourceCode = "BBLPG";	
			}
		else 
		if (parseInt(branchShortCode) == 635) {
			this.SourceCode = "BBLCZ";		
		    }
		else 
		if (parseInt(branchShortCode) == 640) {
			this.SourceCode = "BBLOW";			
			}
		else 
		if (parseInt(branchShortCode) == 645) {
			this.SourceCode = "BBLBP";				
			}
		else 
		if (parseInt(branchShortCode) == 650) {
			this.SourceCode = "BBLSI";					
			}
		else 
		if ((parseInt(branchShortCode) == 670) || (parseInt(branchShortCode) == 690)) {
			this.SourceCode = "BBLSP";						
			}
		else 
		if (parseInt(branchShortCode) == 680) {
			this.SourceCode = "BBLNS";							
			}
		else 
		if (parseInt(branchShortCode) == 685) {
			this.SourceCode = "BBLLV";								
			}
		else 
		if (parseInt(branchShortCode) == 695) {
			this.SourceCode = "BBLMO";									
			}
		else 
		if (parseInt(branchShortCode) == 700) {
			this.SourceCode = "BBLHR";										
			}
		else {
			this.SourceCode = "BBLFN";
		}
    }catch(err){
        logger.error(`Unable to retrieve source code for branchShortCode: ${branchShortCode}`);
        throw(err);
    }
        return this.SourceCode;
    }
 
}

let app = new StandingOrderMigration();
app.main();