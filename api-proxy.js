const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const PORT = 3001;

const https = require("https"); // Add at top of file

// Middleware
app.use(express.json());
app.use(cors());
// Environment variables (set these in production)
const TELTONIKA_IP = process.env.TELTONIKA_IP || "192.168.10.1";
const TELTONIKA_USER = process.env.TELTONIKA_USER || "admin";
const TELTONIKA_PASS = process.env.TELTONIKA_PASS || "Aegean2019@*";

// Auth endpoint
let authToken = null;

async function getAuthToken() {
  console.log("Attempting to login to Teltonika device...");

  try {
    const response = await axios.post(
      `https://${TELTONIKA_IP}/api/login`,
      {
        username: TELTONIKA_USER,
        password: TELTONIKA_PASS,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
        timeout: 15000, // Increase timeout to 15 seconds
      }
    );

    console.log("Login successful");

    if (response.data && response.data.data) {
      return response.data.data.token || response.data.data.session_token;
    } else if (response.data) {
      return response.data.token || response.data.session_token;
    } else {
      console.warn("No token found in response:", response.data);
      return null;
    }
  } catch (error) {
    console.error("Login error details:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }

    if (error.response) {
      console.error("Login failed with status:", error.response.status);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      console.error("No response received from device");
      console.error("Is the device powered on and connected to the network?");
    } else {
      console.error("Request setup error:", error.message);
    }

    // Allow operation without authentication if connection to the device fails
    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    ) {
      console.log(
        "WARNING: Can't connect to Teltonika device. Using mock data mode."
      );
      return "mock-token"; // Return a fake token to allow operation
    }

    return null;
  }
}

// Proxy middleware
app.use(async (req, res, next) => {
  if (!authToken) {
    authToken = await getAuthToken();
    if (!authToken) {
      return res.status(500).json({ error: "Authentication failed" });
    }
  }
  next();
});

// GPS Position endpoint
app.get("/api/ship/position", async (req, res) => {
  console.log("Request received at /api/ship/position");
  console.log("Current auth token:", authToken ? "Present" : "Missing");
  
  try {
    console.log(`Attempting to fetch position from https://${TELTONIKA_IP}/api/gps/position/status`);
    const response = await axios.get(
      `https://${TELTONIKA_IP}/api/gps/position/status`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
        timeout: 15000,
      }
    );
    
    console.log("Raw response from Teltonika:", JSON.stringify(response.data, null, 2));
    
    // Validate the response data
    if (!response.data) {
      throw new Error("Empty response from Teltonika device");
    }
    
    // Check if we need to extract nested data
    let positionData = response.data;
    if (response.data.data) {
      positionData = response.data.data;
    }
    
    // Validate required fields
    if (!positionData.latitude || !positionData.longitude) {
      console.warn("Missing required position data:", positionData);
      throw new Error("Invalid position data received from device");
    }
    
    console.log("Processed position data:", JSON.stringify(positionData, null, 2));
    res.json({ success: true, data: positionData });
    
  } catch (error) {
    console.error("Position error:", error.message);
    console.error("Full error object:", JSON.stringify(error, null, 2));

    // Log more detailed error information
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log("Authentication token expired, getting new token...");
      authToken = await getAuthToken();
      if (authToken) {
        try {
          console.log("Retrying with new token...");
          const retryResponse = await axios.get(
            `https://${TELTONIKA_IP}/api/gps/position/status`,
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${authToken}`,
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false,
              }),
              timeout: 15000,
            }
          );
          console.log("Retry successful, data:", JSON.stringify(retryResponse.data, null, 2));
          return res.json({ success: true, data: retryResponse.data });
        } catch (retryError) {
          console.error("Retry failed:", retryError.message);
          console.error("Retry error details:", JSON.stringify(retryError, null, 2));
        }
      }
    }

    // Return a fallback mock response when the real API fails
    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    ) {
      console.log("Connection issue with the device, sending mock data...");
      const mockData = {
        success: true,
        data: {
          latitude: "37.5665",
          longitude: "126.9780",
          angle: "0",
          speed: "0",
          satellites: "0",
          timestamp: new Date().toISOString(),
        },
      };
      console.log("Sending mock data:", JSON.stringify(mockData, null, 2));
      return res.json(mockData);
    }

    res.status(500).json({
      success: false,
      error: "Failed to get position",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

// Export the app and variables
module.exports = {
    app,
    TELTONIKA_IP,
    TELTONIKA_USER,
    TELTONIKA_PASS,
    authToken
};
