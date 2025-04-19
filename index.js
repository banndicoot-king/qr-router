require("dotenv").config();
const Logger = require("./logger")("QR_SERVER", "index");
const { SERVER } = require("@ajayos/server");
const express = require("express");
const requestIp = require("request-ip");
const UAParser = require("ua-parser-js");
const fetch = require("node-fetch");
const mongoose = require("mongoose");
const Visitor = require("./models/Visitor"); // Ensure this model matches your schema

const redirectUrl = process.env.REDIRECT_URL;

class APP extends SERVER {
  constructor() {
    super({
      port: process.env.PORT || 3002,
      cors: true,
      onServerStart: () => {
        this.log("✅ Server started successfully on port 3002");
      },
      onServerError: (error) => {
        Logger.saveLog("Server encountered an error", "error", error);
      },
    });

    this.previewAgents = [
      "WhatsApp",
      "facebookexternalhit",
      "Twitterbot",
      "TelegramBot",
      "Google-PageRenderer",
      "LinkedInBot",
      "Pinterest/0.2",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:24.0)",
      "Mozilla/5.0 (Linux; Android 10;",
    ];
  }

  // Function to convert server time to IST format
  convertToIST() {
    return new Date()
      .toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
      .replace(/(\d+)\/(\d+)\/(\d+)/, "$2/$1/$3");
  }

  // Initialize middleware and database connection
  async init() {
    this.use(express.json());
    this.use(requestIp.mw());
    this.use(express.urlencoded({ extended: true }));

    // MongoDB connection
    await mongoose.connect(process.env.MONGO_URI, {}).then(() => {
      Logger.info("📦 MongoDB connected");
    }).catch((err) => {
      Logger.saveLog("MongoDB connection error", "error", err);
    });

    this.all("*", this.handleRoutes.bind(this));
  }

  // Handle incoming requests and save visitor data
  async handleRoutes(req, res) {
    try {
      // Try to extract the IP from request headers (in case of proxies)
      const clientIp = req.clientIp || req.headers["x-forwarded-for"]?.split(",")[0] || req.connection.remoteAddress;

      if (!clientIp) {
        Logger.saveLog("IP not found", "error", "Client IP not found in the request");
        return res.status(400).send("Client IP not found");
      }

      const userAgent = req.headers["user-agent"] || "Unknown";

      // Block preview requests
      if (this.previewAgents.some((agent) => userAgent.includes(agent))) {
        Logger.debug("❌ Preview request blocked");
        return res.status(403).send("Preview requests are not allowed");
      }

      const parser = new UAParser(userAgent);
      const browserInfo = parser.getResult();
      const ipInfo = await this.fetchIpInfo(clientIp);

      // Log the IP information
      Logger.debug(`IP Info: ${JSON.stringify(ipInfo)}`);

      // Create a new visitor record
      const visitor = new Visitor({
        ip: clientIp,
        city: ipInfo?.city || "Unknown",
        region: ipInfo?.regionName || "Unknown",
        country: ipInfo?.country || "Unknown",
        timezone: ipInfo?.timezone || "Unknown",
        isp: ipInfo?.isp || "Unknown",
        lat: ipInfo?.lat,
        lon: ipInfo?.lon,
        device: {
          browser: browserInfo.browser.name || "Unknown",
          os: browserInfo.os.name || "Unknown",
          type: browserInfo.device.type || "Unknown",
          vendor: browserInfo.device.vendor || "Unknown",
        },
        timestamp: this.convertToIST(),
      });

      // Save visitor data to MongoDB
      await visitor.save().catch(err => {
        Logger.saveLog("MongoDB Save Error", "error", err);
      });

      Logger.debug("✅ Visitor info saved");
      return res.redirect(redirectUrl);
    } catch (error) {
      Logger.saveLog("handleRoutes Error", "error", error);
      return res.status(500).send("Internal Server Error");
    }
  }

  // Fetch IP information using an external API (ip-api)
  async fetchIpInfo(ip) {
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();
      return data;
    } catch (error) {
      Logger.saveLog("fetchIpInfo", "error", error);
      return {};
    }
  }

  // Start the server
  async run() {
    await this.init();
    await this.start();
  }

  // Close the server
  async closeServer() {
    await this.close();
  }
}

// Instantiate the app
const app = new APP();

app.run().catch(async (error) => {
  await app.closeServer();
  Logger.saveLog("app.run Error", "error", error);
  setTimeout(() => app.run(), 5000);
});

// Handle process signals
process.on("SIGINT", async () => {
  Logger.info("SIGINT received");
  await app.closeServer();
  process.exit(0);
});

process.on("exit", async () => {
  await app.closeServer();
  Logger.info("SERVER CLOSED");
});

process.on("unhandledRejection", async (error) => {
  Logger.saveLog("Unhandled Rejection", "error", error);
  await app.closeServer();
  await app.run();
});

process.on("uncaughtException", async (err) => {
  Logger.saveLog("Uncaught Exception", "error", err);
  await app.closeServer();
  await app.run();
});
