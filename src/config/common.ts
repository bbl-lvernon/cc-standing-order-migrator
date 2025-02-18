import dotenv from "dotenv";
// Load environment variables globally
dotenv.config();
export const BBILMODE : boolean = false;
export const commonConf = {  
    outputFile: 'cc-standing-order-migrator_YYMMDD.out',  
    outputDir: 'C://Users//lvernon//Workspace//Work//Repos//cc-standing-order-migrator//output//',  
    completedDir: 'C://Users//lvernon//Workspace//Work//Repos//cc-standing-order-migrator//completed//',  
    logFile: 'ClientExtractorLog',  
    summaryFile: 'ClientExtractor_summary',  
    logDir: 'C://Users//lvernon//Workspace//Work//Repos//cc-standing-order-migrator//logs//',  
};  
export const BBLParams = {  
    user: "nodeusr",  
    host: "172.16.7.101",  
    port: 3306,  
    password: "P@ssw0rd1",  
    database: "rpt",  
    dateStrings: true  
}
// Add other db connections as needed  
export const BBILParams = {  
    user: "nodeusr",  
    host: "192.168.51.110",  
    port: 3306,  
    password: "sitP@ssw0rd1",  
    database: "rpt",  
    dateStrings: true  
}
