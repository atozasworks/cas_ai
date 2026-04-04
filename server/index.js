                    const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const { getDistance, getRhumbLineBearing } = require("geolib");
const nodemailer = require("nodemailer");
require("dotenv").config();
const path = require("path");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFromEmail() {
  const raw = (process.env.SMTP_FROM || "").trim();
  if (raw && emailRegex.test(raw)) return raw;
  return (process.env.SMTP_EMAIL || "").trim();
}

const app = express();
const server = http.createServer(app);
// CORS configuration - allow both www and non-www frontend + backend
const allowedOrigins = [
  "https://www.ucasaapp.com",
  "https://ucasaapp.com",
  "https://ucasaapp.testatozas.in",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
];

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// PWA and Security Headers
app.use((req, res, next) => {
  // HTTPS redirect in production (if behind a proxy)
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // PWA Cache headers for static assets
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  } else if (req.url === '/service-worker.js' || req.url === '/manifest.json') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
});


// MongoDB connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://collisionalarm:A1b2c3d4e5vc@62.72.31.206:57423/collision-alarm?authSource=collision-alarm",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Vehicle schema
const vehicleSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  vehicleId: { type: String, required: true },
  fullName: { type: String, required: true },
  vehicleType: { type: String, required: true, default: 'car' }, // bike, car, auto, truck, bus
  registeredAt: { type: Date, default: Date.now },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now },
    accuracy: Number,
    speed: Number,
    heading: Number,
    isSimulated: { type: Boolean, default: false },
  },
  isActive: { type: Boolean, default: true },
  isDriving: { type: Boolean, default: true },
  locationTrackingEnabled: { type: Boolean, default: false },
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

// Feedback schema (store submissions even if email fails)
const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  feedbackType: { type: String, required: true },
  rating: { type: String },
  message: { type: String, required: true },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});
const Feedback = mongoose.model("Feedback", feedbackSchema);


// Contact schema (store submissions even if email fails)
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});
const Contact = mongoose.model("Contact", contactSchema);

// Store active connections
const activeConnections = new Map();

// Store previous distance data for tracking approaching/receding vehicles
// Key format: "phoneNumber1-phoneNumber2" (sorted alphabetically)
const previousDistances = new Map();

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, "build"), {
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    // Don't cache HTML entrypoints (otherwise users keep loading old JS bundles)
    if (filePath.endsWith('index.html') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return;
    }

    // Don't cache service worker or manifest
    if (filePath.endsWith('service-worker.js') || filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Serve manifest.json with correct content type
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, "build", "manifest.json"));
});

// Serve service worker with correct content type
app.get('/service-worker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, "build", "service-worker.js"));
});


// Catch-all route for client-side routing (must be last)
app.get("*", (req, res) => {
  // Never cache SPA entrypoint
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Socket connection handling
io.on("connection", (socket) => {
  //console.log("Client connected:", socket.id);

  socket.on("register-vehicle", async (data) => {
    const { phoneNumber, vehicleId, fullName, vehicleType } = data;
    activeConnections.set(socket.id, { phoneNumber, vehicleId, fullName });

    try {
      // Check if vehicle already exists
      let vehicle = await Vehicle.findOne({ phoneNumber });
      
      if (vehicle) {
        // Update existing vehicle
        vehicle = await Vehicle.findOneAndUpdate(
          { phoneNumber },
          { isActive: true, locationTrackingEnabled: false },
          { new: true }
        );
      } else {
        // Create new vehicle
        vehicle = new Vehicle({
          phoneNumber,
          vehicleId,
          fullName,
          vehicleType: vehicleType || 'car',
          isActive: true,
          isDriving: true,
          locationTrackingEnabled: false,
        });
        await vehicle.save();
      }

      // Send updated vehicle list to all clients
      const allVehicles = await Vehicle.find({ isActive: true });
      io.emit("vehicles-update", allVehicles);

      // Return user data
      const userData = {
        phoneNumber: vehicle.phoneNumber,
        vehicleId: vehicle.vehicleId,
        name: vehicle.fullName,
        vehicleType: vehicle.vehicleType,
        registeredAt: vehicle.registeredAt,
      };

      socket.emit("registration-success", { 
        phoneNumber, 
        vehicleId, 
        fullName,
        user: userData 
      });
    } catch (error) {
      console.error("Register vehicle error:", error);
      socket.emit("registration-error", { error: "Failed to register vehicle." });
    }
  });

  socket.on("remove-vehicle", async (data) => {
    const { phoneNumber } = data;

    try {
      await Vehicle.findOneAndUpdate(
        { phoneNumber },
        { isActive: false },
        { new: true }
      );

      // Send updated vehicle list to all clients
      const allVehicles = await Vehicle.find({ isActive: true });
      io.emit("vehicles-update", allVehicles);
    } catch (error) {
      console.error("Remove vehicle error:", error);
    }
  });

  socket.on("toggle-driving", async (data) => {
    const { phoneNumber, isDriving } = data;

    try {
      const vehicle = await Vehicle.findOneAndUpdate(
        { phoneNumber },
        { isDriving },
        { new: true }
      );

      if (vehicle) {
        console.log(
          `Vehicle ${vehicle.vehicleId} driving status updated to: ${isDriving}`
        );

        // Send updated vehicle list to all clients
        const allVehicles = await Vehicle.find({ isActive: true });
        io.emit("vehicles-update", allVehicles);
      }
    } catch (error) {
      console.error("Toggle driving error:", error);
    }
  });

  socket.on("toggle-location-tracking", async (data) => {
    const { phoneNumber, locationTrackingEnabled } = data;

    try {
      const vehicle = await Vehicle.findOneAndUpdate(
        { phoneNumber },
        { locationTrackingEnabled },
        { new: true }
      );

      if (vehicle) {
        console.log(
          `Vehicle ${vehicle.vehicleId} location tracking updated to: ${locationTrackingEnabled}`
        );

        // Send updated vehicle list to all clients
        const allVehicles = await Vehicle.find({ isActive: true });
        io.emit("vehicles-update", allVehicles);

        // Also send updated all users list
        const allUsers = await Vehicle.find({
          locationTrackingEnabled: true,
          "currentLocation.latitude": { $exists: true, $ne: null },
          "currentLocation.longitude": { $exists: true, $ne: null },
        }).sort({ "currentLocation.timestamp": -1 });
        io.emit("all-users-update", allUsers);

        // Send specific response to the requesting client
        socket.emit("location-tracking-updated", {
          phoneNumber,
          locationTrackingEnabled,
          success: true,
        });
      }
    } catch (error) {
      console.error("Toggle location tracking error:", error);
      socket.emit("location-tracking-updated", {
        phoneNumber,
        locationTrackingEnabled: false,
        success: false,
        error: error.message,
      });
    }
  });

  socket.on("get-vehicles", async () => {
    try {
      const allVehicles = await Vehicle.find({ isActive: true });
      socket.emit("vehicles-update", allVehicles);
    } catch (error) {
      console.error("Get vehicles error:", error);
    }
  });

  socket.on("get-all-users", async () => {
    try {
      // Fetch all users with location tracking enabled and valid location data
      const allUsers = await Vehicle.find({
        locationTrackingEnabled: true,
        "currentLocation.latitude": { $exists: true, $ne: null },
        "currentLocation.longitude": { $exists: true, $ne: null },
      }).sort({ "currentLocation.timestamp": -1 });

      //console.log(`Fetched ${allUsers.length} users with location data`);
      socket.emit("all-users-update", allUsers);
    } catch (error) {
      console.error("Get all users error:", error);
      socket.emit("all-users-update", []);
    }
  });

  socket.on("location-update", async (data) => {
    const {
      phoneNumber,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      isSimulated,
    } = data;

    console.log(
      `Location update received: ${phoneNumber} -> ${latitude}, ${longitude}`
    );

    try {
      // First check if the vehicle has location tracking enabled
      const existingVehicle = await Vehicle.findOne({ phoneNumber });

      if (!existingVehicle || !existingVehicle.locationTrackingEnabled) {
        console.log(
          `Location update ignored for ${phoneNumber} - location tracking disabled`
        );
        return;
      }

      // Update vehicle location with additional data
      const vehicle = await Vehicle.findOneAndUpdate(
        { phoneNumber },
        {
          currentLocation: {
            latitude,
            longitude,
            timestamp: new Date(),
            accuracy: accuracy || null,
            speed: speed || null,
            heading: heading || null,
            isSimulated: isSimulated || false,
          },
        },
        { new: true }
      );

      if (vehicle) {
        console.log(
          `✅ Vehicle ${vehicle.vehicleId} location updated in database: ${vehicle.currentLocation.latitude}, ${vehicle.currentLocation.longitude} (accuracy: ${vehicle.currentLocation.accuracy}m)`
        );

        // Check for nearby vehicles
        await checkCollisionRisk(vehicle, io);

        // Send updated vehicle list to all clients
        const allVehicles = await Vehicle.find({ isActive: true });
        io.emit("vehicles-update", allVehicles);

        // Also send updated all users list
        const allUsers = await Vehicle.find({
          locationTrackingEnabled: true,
          "currentLocation.latitude": { $exists: true, $ne: null },
          "currentLocation.longitude": { $exists: true, $ne: null },
        }).sort({ "currentLocation.timestamp": -1 });
        io.emit("all-users-update", allUsers);
      }
    } catch (error) {
      console.error("Location update error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    activeConnections.delete(socket.id);
  });
});

// Function to get movement status (approaching/receding)
function getMovementStatus(currentDistance, vehiclePairKey) {
  const now = Date.now();
  const previousData = previousDistances.get(vehiclePairKey);
  
  if (!previousData) {
    // First time seeing this pair, store current distance
    previousDistances.set(vehiclePairKey, {
      distance: currentDistance,
      timestamp: now
    });
    return { status: "unknown", speed: 0 };
  }
  
  const timeDiff = (now - previousData.timestamp) / 1000; // Convert to seconds
  
  // Only calculate if we have at least 1 second difference
  if (timeDiff < 1) {
    return { status: "unknown", speed: 0 };
  }
  
  const distanceDiff = currentDistance - previousData.distance;
  const speed = Math.abs(distanceDiff / timeDiff); // meters per second
  
  // Update stored distance
  previousDistances.set(vehiclePairKey, {
    distance: currentDistance,
    timestamp: now
  });
  
  // Determine status based on distance change
  if (distanceDiff < -0.3) { // Getting closer (threshold: 0.3m change)
    return { 
      status: "approaching", 
      speed: speed,
      emoji: "🔴",
      text: "Coming Closer"
    };
  } else if (distanceDiff > 0.3) { // Going away
    return { 
      status: "receding", 
      speed: speed,
      emoji: "🟢",
      text: "Going Away"
    };
  } else { // No significant change - don't show status
    return { 
      status: "unknown", 
      speed: 0
    };
  }
}

// Function to get relative direction based on vehicle's heading
function getRelativeDirection(vehicleHeading, bearingToTarget) {
  // If vehicle heading is not available, use a default nearby indicator
  if (vehicleHeading === null || vehicleHeading === undefined) {
    return { name: "Nearby", emoji: "📍", angle: null };
  }

  // Calculate relative angle (difference between where vehicle is facing and where target is)
  let relativeAngle = bearingToTarget - vehicleHeading;
  
  // Normalize to -180 to 180 range
  while (relativeAngle > 180) relativeAngle -= 360;
  while (relativeAngle < -180) relativeAngle += 360;

  // Determine relative position based on angle
  // Front: -30° to 30°
  // Right: 60° to 120°
  // Back: 150° to 180° or -150° to -180°
  // Left: -60° to -120°
  
  const absAngle = Math.abs(relativeAngle);
  
  if (absAngle <= 30) {
    return { name: "Front", emoji: "⬆️", angle: relativeAngle };
  } else if (relativeAngle > 30 && relativeAngle <= 60) {
    return { name: "Front-Right", emoji: "↗️", angle: relativeAngle };
  } else if (relativeAngle > 60 && relativeAngle <= 120) {
    return { name: "Right", emoji: "➡️", angle: relativeAngle };
  } else if (relativeAngle > 120 && relativeAngle <= 150) {
    return { name: "Back-Right", emoji: "↘️", angle: relativeAngle };
  } else if (relativeAngle < -30 && relativeAngle >= -60) {
    return { name: "Front-Left", emoji: "↖️", angle: relativeAngle };
  } else if (relativeAngle < -60 && relativeAngle >= -120) {
    return { name: "Left", emoji: "⬅️", angle: relativeAngle };
  } else if (relativeAngle < -120 && relativeAngle >= -150) {
    return { name: "Back-Left", emoji: "↙️", angle: relativeAngle };
  } else {
    // Back (150° to 180° or -150° to -180°)
    return { name: "Back", emoji: "⬇️", angle: relativeAngle };
  }
}

// Collision detection function
async function checkCollisionRisk(currentVehicle, io) {
  const COLLISION_DISTANCE = 3; // 3 meter collision threshold
  const WARNING_DISTANCE = 5; // 5 meter warning threshold

  try {
    // Only check collision if current vehicle has location tracking enabled
    if (!currentVehicle.locationTrackingEnabled) {
      console.log(
        `Vehicle ${currentVehicle.vehicleId} has location tracking disabled, skipping collision check`
      );
      return;
    }

    // Only check collision if current vehicle has valid location data
    if (
      !currentVehicle.currentLocation ||
      !currentVehicle.currentLocation.latitude ||
      !currentVehicle.currentLocation.longitude
    ) {
      console.log(
        `Vehicle ${currentVehicle.vehicleId} has no location data, skipping collision check`
      );
      return;
    }

    // Find other active vehicles with valid location data, location tracking enabled, and are driving
    const allVehicles = await Vehicle.find({
      isActive: true,
      isDriving: true, // Only check collision with driving vehicles
      locationTrackingEnabled: true, // Only check collision with vehicles that have location tracking enabled
      phoneNumber: { $ne: currentVehicle.phoneNumber },
      "currentLocation.latitude": { $exists: true, $ne: null },
      "currentLocation.longitude": { $exists: true, $ne: null },
    });

    // Also skip collision check if current vehicle is stopped
    if (!currentVehicle.isDriving) {
      console.log(
        `Vehicle ${currentVehicle.vehicleId} is stopped, skipping collision check`
      );
      return;
    }

    console.log(
      `Checking collision for ${currentVehicle.vehicleId} against ${allVehicles.length} other vehicles with location data`
    );

    // Find the socket connection for the current vehicle user
    const currentUserSocket = findSocketByPhoneNumber(
      currentVehicle.phoneNumber
    );

    // Collect all nearby vehicles for combined alert
    const collisionVehicles = [];
    const warningVehicles = [];

    for (const otherVehicle of allVehicles) {
      // Double-check that location data is valid
      if (
        otherVehicle.currentLocation.latitude &&
        otherVehicle.currentLocation.longitude
      ) {
        const distance = getDistance(
          {
            latitude: currentVehicle.currentLocation.latitude,
            longitude: currentVehicle.currentLocation.longitude,
          },
          {
            latitude: otherVehicle.currentLocation.latitude,
            longitude: otherVehicle.currentLocation.longitude,
          }
        );

        // Log coordinates and distance calculation for debugging
        console.log(
          `📏 Distance calculation: ${currentVehicle.vehicleId} (${currentVehicle.currentLocation.latitude}, ${currentVehicle.currentLocation.longitude}) ↔ ${otherVehicle.vehicleId} (${otherVehicle.currentLocation.latitude}, ${otherVehicle.currentLocation.longitude}) = ${distance}m`
        );

        // Calculate bearing from current vehicle to other vehicle
        const bearing = getRhumbLineBearing(
          {
            latitude: currentVehicle.currentLocation.latitude,
            longitude: currentVehicle.currentLocation.longitude
          },
          {
            latitude: otherVehicle.currentLocation.latitude,
            longitude: otherVehicle.currentLocation.longitude
          }
        );
        
        // Get relative direction based on current vehicle's heading
        const direction = getRelativeDirection(
          currentVehicle.currentLocation.heading,
          bearing
        );

        // Create a unique key for this vehicle pair (sorted for consistency)
        const vehiclePairKey = [currentVehicle.phoneNumber, otherVehicle.phoneNumber]
          .sort()
          .join('-');
        
        // Get movement status (approaching/receding)
        const movement = getMovementStatus(distance, vehiclePairKey);

        // Check if distance is within collision threshold (3m)
        if (distance <= COLLISION_DISTANCE) {
          collisionVehicles.push({
            phoneNumber: otherVehicle.phoneNumber,
            vehicleId: otherVehicle.vehicleId,
            fullName: otherVehicle.fullName,
            vehicleType: otherVehicle.vehicleType,
            distance: distance,
            direction: direction,
            bearing: bearing,
            movement: movement,
            location: otherVehicle.currentLocation,
          });

          console.log(
            `🚨 COLLISION RISK: ${distance}m - ${otherVehicle.vehicleId} ${direction.emoji} ${direction.name} of ${currentVehicle.vehicleId} - ${movement.emoji} ${movement.text}`
          );
        }
        // Check if distance is within warning threshold (5m) but not collision
        else if (distance <= WARNING_DISTANCE) {
          warningVehicles.push({
            phoneNumber: otherVehicle.phoneNumber,
            vehicleId: otherVehicle.vehicleId,
            fullName: otherVehicle.fullName,
            vehicleType: otherVehicle.vehicleType,
            distance: distance,
            direction: direction,
            bearing: bearing,
            movement: movement,
            location: otherVehicle.currentLocation,
          });

          console.log(
            `⚠️ WARNING: ${distance}m - ${otherVehicle.vehicleId} ${direction.emoji} ${direction.name} of ${currentVehicle.vehicleId} - ${movement.emoji} ${movement.text}`
          );
        }
      }
    }

    // Send combined alert if there are any nearby vehicles
    if ((collisionVehicles.length > 0 || warningVehicles.length > 0) && currentUserSocket && currentVehicle.locationTrackingEnabled) {
      const combinedAlertData = {
        type: "COMBINED_ALERT",
        alertLevel: collisionVehicles.length > 0 ? "COLLISION" : "WARNING",
        collisionVehicles: collisionVehicles,
        warningVehicles: warningVehicles,
        timestamp: new Date(),
      };

      console.log(
        `📢 COMBINED ALERT for ${currentVehicle.vehicleId}: ${collisionVehicles.length} collision risks, ${warningVehicles.length} warnings`
      );

      currentUserSocket.emit("collision-alert", combinedAlertData);
    }
  } catch (error) {
    console.error("Collision check error:", error);
  }
}

// Helper function to find socket by phone number
function findSocketByPhoneNumber(phoneNumber) {
  for (const [socketId, userData] of activeConnections.entries()) {
    if (userData.phoneNumber === phoneNumber) {
      return io.sockets.sockets.get(socketId);
    }
  }
  return null;
}

// REST API endpoints
app.get("/api/vehicles", async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ isActive: true });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/all-users", async (req, res) => {
  try {
    // Fetch all users with location tracking enabled and valid location data
    const allUsers = await Vehicle.find({
      locationTrackingEnabled: true,
      "currentLocation.latitude": { $exists: true, $ne: null },
      "currentLocation.longitude": { $exists: true, $ne: null },
    }).sort({ "currentLocation.timestamp": -1 });

    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user details by phone number
app.get("/api/user/:phoneNumber", async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const user = await Vehicle.findOne({ phoneNumber });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user data without sensitive information
    const userData = {
      phoneNumber: user.phoneNumber,
      vehicleId: user.vehicleId,
      name: user.fullName,
      vehicleType: user.vehicleType,
      registeredAt: user.registeredAt,
    };

    res.json({ success: true, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/vehicles", async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Nodemailer transporter configuration
const isSmtpConfigured =
  !!process.env.SMTP_SERVER &&
  !!process.env.SMTP_PORT &&
  !!process.env.SMTP_EMAIL &&
  !!process.env.SMTP_EMAIL_PASSWORD;

function createSmtpTransporter() {
  if (!isSmtpConfigured) return null;
  return nodemailer.createTransport({
    name: process.env.SMTP_NAME,
    host: process.env.SMTP_SERVER,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_EMAIL_PASSWORD,
    },
    // Hostinger can occasionally reset connections; timeouts + TLS hints reduce ECONNRESET.
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
    tls: {
      rejectUnauthorized: false, // keep existing behavior
      servername: process.env.SMTP_SERVER, // SNI
      minVersion: "TLSv1.2",
    },
  });
}


async function sendMailWithRetry(mailOptions) {
  if (!transporter) throw new Error("SMTP transporter not configured");
  try {
    return await transporter.sendMail(mailOptions);
  } catch (err) {
    const code = err?.code || "";
    const msg = (err?.message || "").toLowerCase();
    const transient =
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ECONNREFUSED" ||
      msg.includes("econnreset") ||
      msg.includes("timeout");

    if (!transient) throw err;

    // One retry with a fresh transporter instance (helps when the SMTP socket got reset)
    const fresh = createSmtpTransporter();
    if (!fresh) throw err;
    return await fresh.sendMail(mailOptions);
  }
}

const transporter = createSmtpTransporter();

if (!transporter) {
  console.warn(
    "SMTP is not configured. Feedback/Contact email endpoints will return 503. Missing one of: SMTP_SERVER, SMTP_PORT, SMTP_EMAIL, SMTP_EMAIL_PASSWORD"
  );
} else {
  // Verify in background (doesn't crash server if SMTP is temporarily unreachable)
  transporter.verify().then(
    () => console.log(`✅ SMTP transporter verified successfully (${process.env.SMTP_SERVER}:${process.env.SMTP_PORT})`),
    (err) => {
      console.error("❌ SMTP transporter verify failed!");
      console.error(`   Server: ${process.env.SMTP_SERVER}:${process.env.SMTP_PORT}`);
      console.error(`   Email: ${process.env.SMTP_EMAIL}`);
      console.error(`   Secure: ${process.env.SMTP_SECURE === "true" ? "Yes (TLS)" : "No (STARTTLS)"}`);
      console.error(`   Error: ${err?.message || err}`);
      console.error("\n   Troubleshooting:");
      console.error("   1. Check SMTP_EMAIL and SMTP_EMAIL_PASSWORD are correct");
      console.error("   2. For Gmail: Use App Password (not regular password)");
      console.error("   3. Check SMTP_SECURE: 'true' for port 465, 'false' for port 587");
      console.error("   4. Verify SMTP_SERVER and SMTP_PORT are correct");
      console.error("   5. Some servers require SMTP_NAME to match your domain");
    }
  );
}

// Feedback endpoint
app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, feedbackType, rating, message } = req.body;

    // Validate required fields
    if (!name || !email || !feedbackType || !message) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Prepare email content
    const emailSubject = `UCASA Feedback - ${feedbackType}`;
    const emailBody = `
      <h2>New Feedback Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Feedback Type:</strong> ${feedbackType}</p>
      <p><strong>Rating:</strong> ${rating || "Not provided"}</p>
      <hr>
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, "<br>")}</p>
      <hr>
      <p><em>Submitted at: ${new Date().toLocaleString()}</em></p>
    `;
    const feedbackToEmail =
      process.env.FEEDBACK_EMAIL || "feedback.ucasaapp@atozasindia.in";
    const fromEmail = getFromEmail();
    // Send email
    const mailOptions = {
      from: fromEmail,
      to: feedbackToEmail,
      subject: emailSubject,
      html: emailBody,
      replyTo: { name: name || "UCASA User", address: email },
    };
    
    // Always store feedback to DB first (so user doesn't lose it even if email fails)
    try {
      const feedbackDoc = new Feedback({
        name,
        email,
        feedbackType,
        rating: rating || undefined,
        message,
        ip:
          req.headers["x-forwarded-for"]?.toString()?.split(",")?.[0]?.trim() ||
          req.ip ||
          "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
      });
      await feedbackDoc.save();
      console.log("Feedback saved to database:", feedbackDoc._id);
    } catch (dbError) {
      console.error("Error saving feedback to database:", dbError);
      // Continue anyway - try to send email even if DB save fails
      // But log the error for debugging
    }

    // Email is best-effort (do not fail the request if SMTP is down)
    if (transporter) {
      try {
        const info = await sendMailWithRetry(mailOptions);
        if (process.env.NODE_ENV !== "production") {
          console.log("📧 Feedback email sent:", {
            to: feedbackToEmail,
            accepted: info?.accepted,
            rejected: info?.rejected,
            messageId: info?.messageId,
            response: info?.response,
          });
        }
      } catch (mailError) {
        console.error("Feedback saved but email failed:", mailError);
        return res.status(200).json({
          success: true,
          emailSent: false,
          message:
            "Feedback received and saved. Email notification failed (check SMTP settings).",
          emailTo: feedbackToEmail,
          emailError: mailError?.message || String(mailError),
        });
      }
    } else {
      console.warn("Feedback saved; SMTP not configured, skipping email.");
      return res.status(200).json({
        success: true,
        emailSent: false,
        message: "Feedback received and saved. Email not sent (SMTP not configured).",
        emailTo: feedbackToEmail,
      });
    }

    return res.status(200).json({
      success: true,
      emailSent: true,
      message: "Feedback received successfully",
      emailTo: feedbackToEmail,
    });
  } catch (error) {
    console.error("Error in /api/feedback endpoint:", error);
    console.error("Error stack:", error.stack);
    // Return more detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to submit feedback: ${error.message}` 
      : "Failed to submit feedback. Please try again later.";
    res.status(500).json({ 
      error: errorMessage 
    });
  }
});

// Contact endpoint
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Prepare email content
    const emailSubject = `UCASA Contact - ${subject}`;
    const emailBody = `
      <h2>New Contact Message Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr>
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, "<br>")}</p>
      <hr>
      <p><em>Submitted at: ${new Date().toLocaleString()}</em></p>
    `;

    const contactToEmail =
      process.env.CONTACT_EMAIL ||
      process.env.FEEDBACK_EMAIL ||
      "feedback.ucasaapp@atozasindia.in";
    const fromEmail = getFromEmail();

    // Send email
    const mailOptions = {
      from: fromEmail,
      to: contactToEmail,
      subject: emailSubject,
      html: emailBody,
      replyTo: { name: name || "UCASA User", address: email },
    };

    // Always store message to DB first
    const contactDoc = new Contact({
      name,
      email,
      phone,
      subject,
      message,
      ip:
        req.headers["x-forwarded-for"]?.toString()?.split(",")?.[0]?.trim() ||
        req.ip,
      userAgent: req.headers["user-agent"],
    });
    await contactDoc.save();

    // Email is best-effort
    if (transporter) {
      try {
        const info = await sendMailWithRetry(mailOptions);
        if (process.env.NODE_ENV !== "production") {
          console.log("📧 Contact email sent:", {
            to: contactToEmail,
            accepted: info?.accepted,
            rejected: info?.rejected,
            messageId: info?.messageId,
            response: info?.response,
          });
        }
      } catch (mailError) {
        console.error("Contact saved but email failed:", mailError);
        return res.status(200).json({
          success: true,
          emailSent: false,
          message:
            "Message received and saved. Email notification failed (check SMTP settings).",
          emailTo: contactToEmail,
          emailError: mailError?.message || String(mailError),
        });
      }
    } else {
      console.warn("Contact saved; SMTP not configured, skipping email.");
      return res.status(200).json({
        success: true,
        emailSent: false,
        message: "Message received and saved. Email not sent (SMTP not configured).",
        emailTo: contactToEmail,
      });
    }

    return res.status(200).json({
      success: true,
      emailSent: true,
      message: "Message received successfully",
      emailTo: contactToEmail,
    });
  } catch (error) {
    console.error("Error sending contact email:", error);
    res.status(500).json({ 
      error: "Failed to send message. Please try again later." 
    });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
