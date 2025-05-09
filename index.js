require("dotenv").config();
const Logger = require("./logger")("QR_SERVER", "index");
const { SERVER } = require("@ajayos/server");
const express = require("express");
const compression = require("compression");
const requestIp = require("request-ip");
const UAParser = require("ua-parser-js");
const fetch = require("node-fetch");
const mongoose = require("mongoose");
const Visitor = require("./models/Visitor");
const Lead = require("./models/Lead");
const path = require("path");
const fs = require("fs");

// const redirectUrl = process.env.REDIRECT_URL;

class APP extends SERVER {
  constructor() {
    super({
      port: process.env.PORT || 3002,
      cors: false,
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
    this.use(compression());
    this.use(express.static("public", {
      maxAge: "1d", // cache static files for 1 day
    }));
    this.use(express.json());
    this.use(requestIp.mw());
    this.use(express.urlencoded({ extended: true }));

    // MongoDB connection
    await mongoose
      .connect(process.env.MONGO_URI, {})
      .then(() => {
        Logger.info("📦 MongoDB connected");
      })
      .catch((err) => {
        Logger.saveLog("MongoDB connection error", "error", err);
      });
    this.post("/api/add-number", this.addLead.bind(this));
    this.post("/api/user", this.handleRoutes.bind(this));
    this.post("/api/visitors", this.Visitors.bind(this));
    this.all("*", (req, res) =>
      res.sendFile(path.join(__dirname, "public", "index.html"))
    );
  }

  async handleRoutes(req, res) {
    try {
      const clientIp = req.clientIp || req.headers["x-forwarded-for"]?.split(",")[0] || req.connection.remoteAddress;
      if (!clientIp) return res.status(400).send("Client IP not found");
  
      const userAgent = req.headers["user-agent"] || "Unknown";
      if (this.previewAgents.some(agent => userAgent.includes(agent))) {
        return res.status(403).send("Preview requests are not allowed");
      }
  
      const parser = new UAParser(userAgent);
      const browserInfo = parser.getResult();
  
      // Send response immediately
      res.json({ message: "Hello" });
  
      // Handle IP info and DB save in background
      this.fetchIpInfo(clientIp).then(async (ipInfo) => {
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
  
        await visitor.save().catch(err => {
          Logger.saveLog("MongoDB Save Error", "error", err);
        });
        Logger.debug("✅ Visitor info saved");
      });
    } catch (error) {
      Logger.saveLog("handleRoutes Error", "error", error);
      res.status(500).send("Internal Server Error");
    }
  }
  

  async Visitors(req, res) {
    try {
      var allVisitors = await Visitor.find({});
      if (!allVisitors) {
        return res
          .status(404)
          .json({ success: false, message: "No visitors found" });
      }

      var visitors = allVisitors.map((visitor) => ({
        ip: visitor.ip,
        city: visitor.city,
        region: visitor.region,
        country: visitor.country,
        timezone: visitor.timezone,
        isp: visitor.isp,
        lat: visitor.lat,
        lon: visitor.lon,
        device: {
          browser: visitor.device.browser,
          os: visitor.device.os,
          type: visitor.device.type,
          vendor: visitor.device.vendor,
        },
        timestamp: visitor.timestamp,
      }));

      // reverse the order of visitors
      visitors = visitors.reverse();

      res.status(200).json({ success: true, visitors });
    } catch (error) {
      Logger.saveLog("Visitors Error", "error", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async addLead(req, res) {
    try {
      const { name, number } = req.body;

      if (!name || !number) {
        return res
          .status(400)
          .json({ success: false, message: "Name and number are required" });
      }

      const timestamp = this.convertToIST();

      const lead = new Lead({
        name,
        number,
        status: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await lead.save();

      Logger.debug("✅ Lead saved successfully");
      return res.status(200).json({ success: true, message: "Lead saved" });
    } catch (error) {
      Logger.saveLog("addLead Error", "error", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
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
