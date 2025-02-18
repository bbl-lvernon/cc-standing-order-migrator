const moment = require ('moment');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
import { commonConf } from '../config/common';

// Define custom format for logs
const customFormat = winston.format.combine(
  winston.format.splat(),
  winston.format.simple(),
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf(info => `${moment().format('YYYY-MM-DD HH:mm:ss:SS')} - ${info.level} - ${info.message}`)
);

export class ApplicationLogger {

    constructor(){}
    
    instiantiateLogger() {
        // Instantiate loggers, rotate daily
        winston.loggers.add('appLogger', {
            exitOnError: false,
            format: winston.format.combine(
                customFormat
            ),
            transports: [
                new DailyRotateFile({
                    filename:  `${commonConf.logDir}${commonConf.logFile}-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    level: 'info'
                }),
                new winston.transports.Console({
                    level: 'info'
                })
            ]
        });
    }

}
