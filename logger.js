const DailyRotateFile = require("winston-daily-rotate-file");
const { format, createLogger } = require("winston");
const Config = require("./config.json");
const path = require("path");
const fs = require("fs");

// Define the root directory for the project
const projectRoot = path.resolve(__dirname);

require("colors");

/**
 * A class for logging messages to a file.
 *
 * @class Logger
 * @property {string} namespace - The namespace of the logger.
 * @property {string} filePath - The file path of the logger.
 *
 */
class Logger {
  namespace = "Logger";
  filePath = "lib/Logger.js";

  /**
   * Creates an instance of Logger.
   * @param {*} namespace - The namespace of the logger.
   * @param {*} filePath - The file path of the logger.
   * @memberof Logger
   */
  constructor(namespace, filePath) {
    this._debug = Config.debug || false;
    this.filePath = filePath || this.filePath;
    this.namespace = namespace || this.namespace;
    this.timeZone = "Asia/Kolkata";
    this.hour = "numeric";
    this.minute = "numeric";
    this.second = "numeric";
    this.hour12 = true;
    this.filename = "%DATE%.log";
    this.datePattern = "YYYY-MM-DD/HH";
    this.zippedArchive = false;
    this.maxSize = "1g";
    this.level = "info";

    this.start();
  }

  /**
   * Returns the current time formatted according to the specified time zone and options.
   * @returns A string representing the current time in the specified time zone.
   */
  timeZoned() {
    const date = new Date();
    const options = {
      timeZone: this.timeZone,
      hour: this.hour,
      minute: this.minute,
      second: this.second,
      hour12: this.hour12,
    };
    // @ts-ignore
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }

  /**
   * The format function used by the logger.
   * @private
   */
  myFormat = format.printf(({ message, level }) => {
    return `[${this.timeZoned()}] [${level}] ${message}`;
  });

  /**
   * Starts the logger and initializes the necessary configurations.
   */
  start() {
    const logDirectory =
      Config.log || path.join(__dirname, "logs");
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }

    const transport = new DailyRotateFile({
      filename: path.join(logDirectory, this.namespace, this.filename),
      datePattern: this.datePattern,
      zippedArchive: this.zippedArchive,
      maxSize: this.maxSize,
      format: format.combine(
        format.timestamp({ format: this.timeZoned }),
        this.myFormat
      ),
      level: this.level,
    });

    transport.on("new", (filename) => {
      const dir = path.dirname(filename);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    this.logger = createLogger({
      level: this.level,
      format: format.combine(
        format.timestamp({ format: this.timeZoned }),
        this.myFormat
      ),
      transports: [transport],
    });
  }

  /**
   * Saves a log message with the specified type.
   * @param text - The log message to be saved.
   * @param type - The type of the log message. Defaults to 'info'.
   */
  saveLog(text, type = "info", error) {
    if (text === null) {
      this._debug && this.log(null, "line");
      return this.winstonLog(`> [-]>-----------------------------<`, "[-] ");
    }
    text = text.toString();
    var _text = `[${this.filePath}]`.bold + ` ${text}`;
    text = `[${this.filePath}]` + ` ${text}`;
    try {
      if (error) {
        const json = `{ code: ${error.code}, message: ${
          error.message
        }, json: ${JSON.stringify(error)}, stack: ${error.stack} }`;
        _text = `${_text} => ` + `${json}`.bgCyan.black + ``.reset;
        text = `${text} => ${json}`;
      }
    } catch (error) {}

    type = type.toLowerCase();
    const typeMap = {
      e: "error",
      w: "warn",
      i: "info",
      d: "debug",
      f: "fatal",
      l: "line",
    };
    type = typeMap[type] || type;

    switch (type) {
      case "error":
      case "warn":
      case "info":
      case "debug":
      case "fatal":
        this._debug && this.log(_text, type);
        this.logger.log(type, text);
        break;
      case "line":
        this._debug && this.log(null, "line");
        this.winstonLog(`> [-]>-----------------------------<`, "[-] ");
        break;
      default:
        this._debug && this.info(_text, "info");
        this.logger.log("info", text);
        break;
    }
  }

  /**
   * Logs the given text with the specified type using Winston logger.
   * @param text - The text to be logged.
   * @param type - The type of the log message.
   */
  winstonLog(text, type) {
    const levelMap = {
      "[e] ": "error",
      "[w] ": "warn",
      "[i] ": "info",
      "[d] ": "debug",
      "[f] ": "fatal",
    };
    this.logger.log(levelMap[type] || "info", text);
  }

  error(text) {
    return this.log(text, "error");
  }

  warn(text) {
    return this.log(text, "warn");
  }

  info(text) {
    return this.log(text, "info");
  }

  debug(text, error) {
    try {
      if (error) {
        const json = `{ code: ${error.code}, message: ${
          error.message
        }, json: ${JSON.stringify(error)}, stack: ${error.stack} }`;
        text = `${text} => ` + `${json}`.bgCyan.black + ``.reset;
      }
      return this.log(text, "debug");
    } catch (error) {
      return this.log(text, "debug");
    }
  }

  fatal(text) {
    return this.log(text, "fatal");
  }

  line() {
    return this.log(null, "line");
  }

  log(text, type = "info") {
    const typeMap = {
      e: "error",
      w: "warn",
      i: "info",
      d: "debug",
      f: "fatal",
      l: "line",
    };

    const logBox = {
      error: `>`.cyan + ` [`.blue + `x`.red + `]`.blue + `>`.cyan,
      warn: `>`.cyan + ` [`.blue + `!`.yellow + `]`.blue + `>`.cyan,
      info: `>`.cyan + ` [`.blue + `*`.green + `]`.blue + `>`.cyan,
      debug: `>`.cyan + ` [`.blue + `*`.magenta + `]`.blue + `>`.cyan,
      fatal: `>`.cyan + ` [`.blue + `!`.bgRed.white + `]`.blue + `>`.cyan,
      line: `>`.cyan + `-----------------------------`.cyan + `<`.cyan,
    };

    const logTypes = {
      error: logBox.error + ` ${text}`.red,
      warn: logBox.warn + ` ${text}`.yellow,
      info: logBox.info + ` ${text}`.green,
      debug: logBox.debug + ` ${text}`.magenta,
      fatal: logBox.fatal + ` ${text}`.bgRed.white,
      line: logBox.line,
    };

    type = typeMap[type?.toLowerCase()] || type;

    console.log(
      text == (null || undefined || "")
        ? logTypes["line"]
        : logTypes[type] || logTypes["info"]
    );
  }

  async ERROR_LOG(methodName, error, ...args) {
    try {
      const stack = new Error().stack;
      const callerLines = stack.split("\n");
      const callerLine = callerLines[2];

      // Adjusted regex to capture both class and function calls with optional 'new' keyword
      const match = callerLine.match(
        /at (?:new\s)?(?:(\S+)\.)?(\S+)\s+\((.*[\\/].*):(\d+):(\d+)\)/
      );

      if (match) {
        const isClassCall = callerLine.includes("new");
        const className = isClassCall && match[1] ? `${match[1]}.` : "";
        const functionName = match[2];
        const fullFilePath = match[3];

        const relativePath = path
          .relative(projectRoot, fullFilePath)
          .replace(/\\/g, "/")
          .replace(/\.js$/, "");

        const isCatchBlock = callerLines.some((line) => line.includes("catch"));
        const catchSuffix = isCatchBlock ? `.catch(e)` : "";

        // Set text based on whether it's a class or function call
        let text = `${relativePath}:${className}${functionName}${catchSuffix}${methodName} `;

        if (error) {
          const errorInfo = `{ message: ${
            error.message
          }, json: ${JSON.stringify(error)}, stack: ${error.stack} }`;
          const argsInfo = args ? JSON.stringify(args) || "" : "";
          text = `${relativePath}:${className}${functionName}${catchSuffix}${methodName} => ${errorInfo} ${argsInfo}`;
        }

        // Add "class error" suffix if it's a class call
        if (isClassCall) {
          text += " (class error)";
        }

        return await this.logger.log("error", text);
      } else {
        console.log({ methodName, error, args });
        return this.saveLog(
          `Logger:ERROR_LOG() => Error in logErrorContext() function`,
          "error"
        );
      }
    } catch (error) {
      this.saveLog(
        `Logger:ERROR_LOG() => Error in logErrorContext() { message: ${
          error.message
        }, json: ${JSON.stringify(error)}, stack: ${error.stack} }`,
        "error"
      );
    }
  }
}

// Export a function to create a logger instance
module.exports = (namespace, filePath) => new Logger(namespace, filePath);