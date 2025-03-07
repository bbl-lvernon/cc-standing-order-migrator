import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
);

// Configure transports first
const transports = [
  new DailyRotateFile({
    filename: 'migrate-standins-orders-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    level: 'info'
  }),
  new winston.transports.Console({
    level: 'info',
    format: winston.format.combine(
      winston.format.colorize(),
      customFormat
    )
  })
];

// Create logger instance directly
const logger = winston.createLogger({
  level: 'info',
  format: customFormat,
  transports: transports,
  exitOnError: false
});

export default logger;
