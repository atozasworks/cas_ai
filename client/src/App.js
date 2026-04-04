import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import CollisionAlert from "./components/CollisionAlert";
import Dashboard from "./components/Dashboard";
import MapDemo from "./components/MapDemo";
import LandingPage from "./components/LandingPage";
import AboutLegal from "./components/AboutLegal";
import Contact from "./components/Contact";
import Feedback from "./components/Feedback";
import InstallPWA from "./components/InstallPWA";
import "./App.css";


// Socket.IO server URL
// When site is on a public origin (e.g. https://www.ucasaapp.com), never use localhost
// (browsers block that via Local Network Access). Use same-origin or configured backend only.
const getSocketUrl = () => {
  const origin = window.location.origin.replace(/\/+$/, "");
  const isLocalSite = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  const envUrl = (process.env.REACT_APP_SOCKET_URL || "").trim().replace(/\/+$/, "");
  const envIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envUrl);

  if (envUrl && (isLocalSite || !envIsLocal)) {
    return envUrl;
  }
  if (isLocalSite) {
    return "http://localhost:5000";
  }
  // Public site: use same origin (avoids Local Network Access block)
  console.log("🔌 Socket.IO connecting to:", origin);
  return origin;
};

const socketUrl = getSocketUrl();
const socket = io(socketUrl, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000,
});

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [collisionAlert, setCollisionAlert] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  // Restore user + skip landing page after refresh if details were already saved
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("userDetailsSaved") === "true";
    const phone = localStorage.getItem("userPhone");
    if (saved && phone) {
      return {
        phoneNumber: phone,
        name: localStorage.getItem("userName") || "User",
        vehicleId: localStorage.getItem("userVehicleId") || "",
        vehicleType: localStorage.getItem("userVehicleType") || "car",
      };
    }
    return null;
  });
  const [showLandingPage, setShowLandingPage] = useState(() => {
    const saved = localStorage.getItem("userDetailsSaved") === "true";
    const phone = localStorage.getItem("userPhone");
    return !(saved && phone);
  });
  const [gpsStatus, setGpsStatus] = useState("inactive"); // inactive, searching, active, error
  const [systemStatus, setSystemStatus] = useState({
    monitoring: "Active",
    lastUpdate: new Date().toLocaleTimeString(),
    collisionThreshold: 3,
    warningThreshold: 5,
    maxRange: "0.6km / 5km max range",
  });
  const [showAboutLegal, setShowAboutLegal] = useState(false);
  const [aboutLegalView, setAboutLegalView] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [subscriptionActivated, setSubscriptionActivated] = useState(false);



  const MONTHLY_RATE = 100; // Rs 100 per month
  const SUBSCRIPTION_PLANS = [
    { id: "monthly", label: "Monthly", months: 1, enabled: false },
    { id: "3month", label: "3 Months", months: 3, enabled: false },
    { id: "6month", label: "6 Months", months: 6, enabled: true },
    { id: "yearly", label: "Yearly", months: 12, enabled: false },
    { id: "3yearly", label: "3 Yearly", months: 36, enabled: false },
  ];
  const selectedPlanId = "6month";
  const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId);
  const getPlanTotal = (plan) => (plan.price != null ? plan.price : plan.months * MONTHLY_RATE);
  const totalBeforeDiscount = selectedPlan ? getPlanTotal(selectedPlan) : 0;
  const discountPercent = 100;
  const amountToPay = 0; // 100% discount

  // Separate useEffect for socket setup
  useEffect(() => {
    // Monitor socket connection status
    const onConnect = () => {
      console.log("✅ Socket.IO connected:", socket.id);
    };
    
    const onDisconnect = (reason) => {
      console.warn("⚠️ Socket.IO disconnected:", reason);
    };
    
    const onConnectError = (error) => {
      console.error("❌ Socket.IO connection error:", error);
    };
    
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    
    // Wait for connection before emitting requests
    const requestData = () => {
      if (socket.connected) {
        socket.emit("get-vehicles");
        socket.emit("get-all-users");
      } else {
        // Wait for connection
        socket.once("connect", () => {
          socket.emit("get-vehicles");
          socket.emit("get-all-users");
        });
      }
    };
    
    // Listen for vehicle updates
    socket.on("vehicles-update", (vehicleList) => {
      setVehicles(vehicleList);
      // Update system status
      setSystemStatus((prev) => ({
        ...prev,
        lastUpdate: new Date().toLocaleTimeString(),
      }));
    });

    // Listen for all users updates
    socket.on("all-users-update", (userList) => {
      setAllUsers(userList);
      console.log(`Received ${userList.length} users with location data`);
    });

    // Listen for collision alerts
    socket.on("collision-alert", (alert) => {
      setCollisionAlert(alert);
      // Auto-dismiss alert after 3 minutes (180 seconds)
      setTimeout(() => setCollisionAlert(null), 180000);
    });

    
    // Request initial vehicle list and all users
    requestData();

    // Update time every second
    const timeInterval = setInterval(() => {
      setSystemStatus((prev) => ({
        ...prev,
        lastUpdate: new Date().toLocaleTimeString(),
      }));
    }, 1000);

    // Fetch all users every 10 seconds to get latest positions
    const usersInterval = setInterval(() => {
      socket.emit("get-all-users");
    }, 10000);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("vehicles-update");
      socket.off("all-users-update");
      socket.off("collision-alert");
      clearInterval(timeInterval);
      clearInterval(usersInterval);
    };
  }, []);
  
  
  // Check if user is already registered in databasee
  useEffect(() => {
    const checkExistingUser = async () => {
      // Try to get user from a stored phone number
      const storedPhone = localStorage.getItem("userPhone");
      const savedFlag = localStorage.getItem("userDetailsSaved") === "true";

      // If user already saved locally, keep them in-app (no landing, no form)
      if (storedPhone && savedFlag) {
        setShowLandingPage(false);
        setCurrentUser((prev) => {
          if (prev?.phoneNumber) return prev;
          return {
            phoneNumber: storedPhone,
            name: localStorage.getItem("userName") || "User",
            vehicleId: localStorage.getItem("userVehicleId") || "",
            vehicleType: localStorage.getItem("userVehicleType") || "car",
          };
        });
      }

      if (storedPhone) {
        try {
          const apiUrl = process.env.NODE_ENV === 'production' 
            ? window.location.origin 
            : 'http://localhost:5000';
          const response = await fetch(`${apiUrl}/api/user/${storedPhone}`);
          
          // Check if response is JSON before parsing
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            console.warn("API response is not JSON, got:", contentType);
            // If user was saved locally, keep showing ✅ Your Details.
            // This commonly happens when the server returns an HTML page (redirect/404) or is down.
            if (savedFlag) {
              setShowLandingPage(false);
              return;
            }
            // Otherwise, reset to landing
            localStorage.removeItem("userPhone");
            localStorage.removeItem("userDetailsSaved");
            setCurrentUser(null);
            setShowLandingPage(true);
            return;
          }
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setCurrentUser(result.user);
              setShowLandingPage(false);
              // Persist latest user fields so refresh always shows ✅ Your Details
              localStorage.setItem("userDetailsSaved", "true");
              localStorage.setItem("userPhone", result.user.phoneNumber);
              localStorage.setItem("userName", result.user.name || "User");
              localStorage.setItem("userVehicleId", result.user.vehicleId || "");
              localStorage.setItem("userVehicleType", result.user.vehicleType || "car");
              // Auto-register the user as a vehicle (but don't wait for response)
              handleAddVehicle(result.user.phoneNumber, result.user.vehicleId, result.user.name, result.user.vehicleType || 'car')
                .catch(error => console.error("Auto-registration failed:", error));
            } else {
              // If we have a saved local user, keep UI stable; otherwise show landing
              if (!savedFlag) setShowLandingPage(true);
            }
          } else {
            // Non-200 JSON response; if it's a real 404 (user deleted), let them re-add.
            let errorBody = null;
            try {
              errorBody = await response.json();
            } catch {
              // ignore
            }
            const notFound =
              response.status === 404 ||
              (errorBody && (errorBody.error || "").toLowerCase().includes("not found"));

            if (notFound) {
              localStorage.removeItem("userPhone");
              localStorage.removeItem("userDetailsSaved");
              localStorage.removeItem("userName");
              localStorage.removeItem("userVehicleId");
              localStorage.removeItem("userVehicleType");
              setCurrentUser(null);
              setShowLandingPage(true);
              return;
            }

            // Otherwise keep local user if present
            if (savedFlag) {
              setShowLandingPage(false);
              return;
            }
            setShowLandingPage(true);
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          // Network/server error: keep showing ✅ Your Details if we have local saved user
          if (savedFlag) {
            setShowLandingPage(false);
            return;
          }
          localStorage.removeItem("userPhone");
          localStorage.removeItem("userDetailsSaved");
          setCurrentUser(null);
          setShowLandingPage(true);
        }
      } else {
        setShowLandingPage(true);
      }
    };

    checkExistingUser();
  }, []);

 
  
  const startSimulatedLocationDirect = (userData) => {
    console.log(`Using simulated location for ${userData.name} (direct)`);
    setGpsStatus("active");

    // Use a base location (New York City) with slight randomization
    const baseLocation = { latitude: 40.7128, longitude: -74.006 };

    // Add small random offset for each user to prevent exact overlap
    const randomOffset = () => (Math.random() - 0.5) * 0.001; // ~50 meter radius

    const simulatedLocation = {
      phoneNumber: userData.phoneNumber,
      latitude: baseLocation.latitude + randomOffset(),
      longitude: baseLocation.longitude + randomOffset(),
      accuracy: 10, // Simulated accuracy
      timestamp: new Date().toISOString(),
      speed: 0,
      heading: 0,
      isSimulated: true,
    };

    console.log(`Simulated location for ${userData.name}:`, simulatedLocation);
    handleLocationUpdate(simulatedLocation);

    // Start simulated movement (moves vehicle slightly every 3 seconds for smooth animation)
    const simulationInterval = setInterval(() => {
      const updatedLocation = {
        phoneNumber: userData.phoneNumber,
        latitude: simulatedLocation.latitude + randomOffset() * 0.1,
        longitude: simulatedLocation.longitude + randomOffset() * 0.1,
        accuracy: 10,
        timestamp: new Date().toISOString(),
        speed: Math.random() * 5, // 0-5 km/h
        heading: Math.random() * 360,
        isSimulated: true,
      };

      console.log(`Simulated movement for ${userData.name}:`, updatedLocation);
      handleLocationUpdate(updatedLocation);
    }, 3000); // Update every 3 seconds for smooth animation

    // Store simulation interval for cleanup
    localStorage.setItem("simulationInterval", simulationInterval);
  };

  const startContinuousGPSTracking = (userData) => {
    console.log(`Starting GPS tracking for ${userData.name}...`);

    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      setGpsStatus("error");
      alert(
        "GPS not supported on this device. Please use a device with GPS capability."
      );
      return;
    }

    // Check if we already have a watch running
    const existingWatchId = localStorage.getItem("gpsWatchId");
    if (existingWatchId) {
      console.log("Clearing existing GPS watch...");
      navigator.geolocation.clearWatch(parseInt(existingWatchId));
      localStorage.removeItem("gpsWatchId");
    }

    let retryCount = 0;
    const maxRetries = 3;
    let watchId = null;

    const startTracking = () => {
      console.log("Requesting GPS permission and location...");
      setGpsStatus("searching");

      // First try to get current position with longer timeout
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(`Initial GPS fix obtained for ${userData.name}`);
          setGpsStatus("active");
          const locationData = {
            phoneNumber: userData.phoneNumber,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0,
          };
          handleLocationUpdate(locationData);


          
          // Now start continuous tracking with more relaxed settings
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const locationData = {
                phoneNumber: userData.phoneNumber,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString(),
                speed: position.coords.speed || 0,
                heading: position.coords.heading || 0,
              };
              console.log(`GPS update for ${userData.name}:`, locationData);
              handleLocationUpdate(locationData);
            },
            (error) => {
              console.error("GPS Watch Error:", error);
              handleGPSError(error, userData);
            },
            {
              enableHighAccuracy: false, // Less battery intensive
              maximumAge: 2000, // Allow positions up to 2 seconds old for smoother updates
              timeout: 30000, // Longer timeout for watch
            }
          );

          localStorage.setItem("gpsWatchId", watchId);
        },
        (error) => {
          console.error("Initial GPS Error:", error);
          handleGPSError(error, userData);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0, // Force fresh position
          timeout: 60000, // Very long timeout for initial fix
        }
      );
    };

    const handleGPSError = (error, userData) => {
      let errorMessage = `GPS Error for ${userData.name}: `;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage +=
            "Location access denied. Please enable GPS permissions in your browser.";
          setGpsStatus("error");
          alert(errorMessage);
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage +=
            "GPS signal unavailable. Trying with less accuracy...";
          console.log(errorMessage);
          retryWithLowerAccuracy();
          break;
        case error.TIMEOUT:
          errorMessage += "GPS timeout. Retrying...";
          console.log(errorMessage);
          setGpsStatus("searching");
          retryGPS();
          break;
        default:
          errorMessage += "Unknown GPS error. Retrying...";
          console.log(errorMessage);
          retryGPS();
          break;
      }
    };

    const retryGPS = () => {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying GPS (attempt ${retryCount}/${maxRetries})...`);
        setTimeout(() => {
          startTracking();
        }, 2000 * retryCount); // Increasing delay
      } else {
        console.log("GPS failed, offering fallback options...");
        offerFallbackOptions();
      }
    };

    const offerFallbackOptions = () => {
      const useSimulated = window.confirm(
        `GPS location failed after ${maxRetries} attempts.\n\nWould you like to use a simulated location for testing?\n\nClick OK for simulated location, or Cancel to try GPS again.`
      );

      if (useSimulated) {
        startSimulatedLocation();
      } else {
        // Reset retry count and try again
        retryCount = 0;
        setTimeout(() => {
          startTracking();
        }, 1000);
      }
    };

    const startSimulatedLocation = () => {
      console.log(`Using simulated location for ${userData.name}`);
      setGpsStatus("active");

      // Use a base location (New York City) with slight randomization
      const baseLocation = { latitude: 40.7128, longitude: -74.006 };

      // Add small random offset for each user to prevent exact overlap
      const randomOffset = () => (Math.random() - 0.5) * 0.001; // ~50 meter radius

      const simulatedLocation = {
        phoneNumber: userData.phoneNumber,
        latitude: baseLocation.latitude + randomOffset(),
        longitude: baseLocation.longitude + randomOffset(),
        accuracy: 10, // Simulated accuracy
        timestamp: new Date().toISOString(),
        speed: 0,
        heading: 0,
        isSimulated: true,
      };

      console.log(
        `Simulated location for ${userData.name}:`,
        simulatedLocation
      );
      handleLocationUpdate(simulatedLocation);

      // Start simulated movement (optional - moves vehicle slightly every 3 seconds for smooth animation)
      const simulationInterval = setInterval(() => {
        const updatedLocation = {
          phoneNumber: userData.phoneNumber,
          latitude: simulatedLocation.latitude + randomOffset() * 0.1,
          longitude: simulatedLocation.longitude + randomOffset() * 0.1,
          accuracy: 10,
          timestamp: new Date().toISOString(),
          speed: Math.random() * 5, // 0-5 km/h
          heading: Math.random() * 360,
          isSimulated: true,
        };

        console.log(
          `Simulated movement for ${userData.name}:`,
          updatedLocation
        );
        handleLocationUpdate(updatedLocation);
      }, 3000); // Update every 3 seconds for smooth animation

      // Store simulation interval for cleanup
      localStorage.setItem("simulationInterval", simulationInterval);
    };

    const retryWithLowerAccuracy = () => {
      console.log("Trying with lower accuracy GPS...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(`Low accuracy GPS fix obtained for ${userData.name}`);
          setGpsStatus("active");
          const locationData = {
            phoneNumber: userData.phoneNumber,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0,
          };
          console.log(
            `Low accuracy GPS fix for ${userData.name}:`,
            locationData
          );
          handleLocationUpdate(locationData);

          // Start continuous tracking after successful low-accuracy fix
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const locationData = {
                phoneNumber: userData.phoneNumber,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString(),
                speed: position.coords.speed || 0,
                heading: position.coords.heading || 0,
              };
              console.log(`GPS update for ${userData.name}:`, locationData);
              handleLocationUpdate(locationData);
            },
            (error) => {
              console.error("GPS Watch Error:", error);
              handleGPSError(error, userData);
            },
            {
              enableHighAccuracy: false,
              maximumAge: 2000, // More frequent updates for smoother movement
              timeout: 30000,
            }
          );

          localStorage.setItem("gpsWatchId", watchId);
        },
        (error) => {
          console.error("Low accuracy GPS also failed:", error);
          console.log("All GPS methods failed, offering fallback...");
          offerFallbackOptions();
        },
        {
          enableHighAccuracy: false,
          maximumAge: 10000,
          timeout: 30000,
        }
      );
    };

    startTracking();
  };

  const handleAddVehicle = (phoneNumber, vehicleId, fullName, vehicleType) => {
    return new Promise((resolve, reject) => {
      // Check if socket is connected
      if (!socket.connected) {
        console.warn("Socket not connected, waiting for connection...");
        
        // Wait for connection with timeout
        const connectionTimeout = setTimeout(() => {
          socket.off("connect", onConnect);
          reject(new Error("Socket connection timeout. Please check if the server is running."));
        }, 10000);
        
        const onConnect = () => {
          clearTimeout(connectionTimeout);
          socket.off("connect", onConnect);
          // Retry registration after connection
          registerVehicle();
        };
        
        socket.on("connect", onConnect);
        return;
      }
      
      // Register vehicle function
      const registerVehicle = () => {
        console.log("Registering vehicle:", { phoneNumber, vehicleId, fullName, vehicleType });
        socket.emit("register-vehicle", { phoneNumber, vehicleId, fullName, vehicleType });
        
        // Listen for registration success
        const handleSuccess = (data) => {
          clearTimeout(timeoutId);
          socket.off("registration-success", handleSuccess);
          socket.off("registration-error", handleError);
          console.log("Vehicle registered successfully:", data);
          resolve(data);
        };
        
        const handleError = (error) => {
          clearTimeout(timeoutId);
          socket.off("registration-success", handleSuccess);
          socket.off("registration-error", handleError);
          console.error("Registration error:", error);
          reject(new Error(error.error || "Failed to register vehicle."));
        };
        
        socket.on("registration-success", handleSuccess);
        socket.on("registration-error", handleError);
        
        // Timeout after 15 seconds (increased from 10)
        const timeoutId = setTimeout(() => {
          socket.off("registration-success", handleSuccess);
          socket.off("registration-error", handleError);
          console.error("Registration timeout - socket connected:", socket.connected);
          reject(new Error("Registration timeout. Server may be slow or unresponsive."));
        }, 15000);
      };
      
      // Start registration
      registerVehicle();
    });
  };

  const handleUpdateUser = (userData) => {
    setCurrentUser(userData);
    if (userData) {
      setShowLandingPage(false);
    }
  };

  const stopGPSTracking = () => {
    console.log("Stopping GPS tracking...");
    
    // Clear GPS watch if it exists
    const existingWatchId = localStorage.getItem("gpsWatchId");
    if (existingWatchId) {
      console.log("Clearing GPS watch...");
      navigator.geolocation.clearWatch(parseInt(existingWatchId));
      localStorage.removeItem("gpsWatchId");
    }
    
    // Clear simulation interval if it exists
    const simulationInterval = localStorage.getItem("simulationInterval");
    if (simulationInterval) {
      console.log("Clearing simulation interval...");
      clearInterval(parseInt(simulationInterval));
      localStorage.removeItem("simulationInterval");
    }
    
    // Set GPS status to inactive
    setGpsStatus("inactive");
    console.log("GPS tracking stopped");
  };

  const handleRemoveVehicle = (phoneNumber) => {
    socket.emit("remove-vehicle", { phoneNumber });
  };

  const handleToggleDriving = (phoneNumber, isDriving) => {
    socket.emit("toggle-driving", { phoneNumber, isDriving });
  };

  const handleToggleLocationTracking = (
    phoneNumber,
    locationTrackingEnabled
  ) => {
    return new Promise((resolve, reject) => {
      socket.emit("toggle-location-tracking", {
        phoneNumber,
        locationTrackingEnabled,
      });

      // Listen for response
      const handleResponse = (data) => {
        if (data.phoneNumber === phoneNumber) {
          socket.off("location-tracking-updated", handleResponse);
          if (data.success) {
            resolve(data);
          } else {
            reject(
              new Error(data.error || "Failed to update location tracking")
            );
          }
        }
      };

      socket.on("location-tracking-updated", handleResponse);

      // Timeout after 5 seconds
      setTimeout(() => {
        socket.off("location-tracking-updated", handleResponse);
        reject(new Error("Request timeout"));
      }, 5000);
    });
  };

  const handleLocationUpdate = (vehicleData) => {
    socket.emit("location-update", vehicleData);
  };

  const dismissAlert = () => {
    setCollisionAlert(null);
  };

  const handleGetStarted = async () => {
    // Check if user details were already saved
    const saved = localStorage.getItem('userDetailsSaved');
    const savedPhone = localStorage.getItem('userPhone');
    
    if (saved === 'true' && savedPhone) {
      // Try to restore user from API
        try {
          const apiUrl = process.env.NODE_ENV === 'production' 
            ? window.location.origin 
            : 'http://localhost:5000';
          const response = await fetch(`${apiUrl}/api/user/${savedPhone}`);
          
          // Check if response is JSON before parsing
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            console.warn("API response is not JSON, got:", contentType);
            // Fall back to localStorage data
            const userData = {
              phoneNumber: savedPhone,
              name: localStorage.getItem('userName') || 'User',
              vehicleId: localStorage.getItem('userVehicleId') || '',
              vehicleType: localStorage.getItem('userVehicleType') || 'car'
            };
            setCurrentUser(userData);
            setShowLandingPage(false);
            return;
          }
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.user) {
              setCurrentUser(result.user);
              setShowLandingPage(false);
              // Auto-register the user as a vehicle
              handleAddVehicle(result.user.phoneNumber, result.user.vehicleId, result.user.name, result.user.vehicleType || 'car')
                .catch(error => console.error("Auto-registration failed:", error));
              return;
            }
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          // Fall back to localStorage data
          const userData = {
            phoneNumber: savedPhone,
            name: localStorage.getItem('userName') || 'User',
            vehicleId: localStorage.getItem('userVehicleId') || '',
            vehicleType: localStorage.getItem('userVehicleType') || 'car'
          };
          setCurrentUser(userData);
          setShowLandingPage(false);
        }
      
      // If API call fails, restore from localStorage (basic info)
      // This ensures form doesn't show even if API is down
      const userData = {
        phoneNumber: savedPhone,
        name: localStorage.getItem('userName') || 'User',
        vehicleId: localStorage.getItem('userVehicleId') || '',
        vehicleType: localStorage.getItem('userVehicleType') || 'car'
      };
      setCurrentUser(userData);
    }
    
    setShowLandingPage(false);
  };

  const handleBackToLanding = () => {
    setShowLandingPage(true);
  };

  const handleShowAboutLegalWithView = (view) => {
    setAboutLegalView(view);
    setShowAboutLegal(true);
  };

  const handleCloseAboutLegal = () => {
    setShowAboutLegal(false);
    setAboutLegalView(null);
  };

  // Show contact page
  if (showContact) {
    return (
      <div className="App">
        <Contact onBack={() => setShowContact(false)} />
      </div>
    );
  }

  // Show feedback page
  if (showFeedback) {
    return (
      <div className="App">
        <Feedback onBack={() => setShowFeedback(false)} />
      </div>
    );
  }

  // Show landing page when requested (even if user exists).
  // This allows a "Back" button that returns to Landing while keeping saved details.
  if (showLandingPage) {
    return (
      <div className="App">
        <LandingPage 
          onGetStarted={handleGetStarted} 
          onShowAboutLegal={() => setShowAboutLegal(true)} 
          onShowAboutLegalWithView={handleShowAboutLegalWithView}
          onShowContact={() => setShowContact(true)}
          onShowFeedback={() => setShowFeedback(true)}
        />
        <AboutLegal
          open={showAboutLegal}
          onClose={handleCloseAboutLegal}
          initialView={aboutLegalView}
        />
      </div>
    );
  }

  if (demoMode) {
    return (
      <div className="App">
        <header className="App-header">
          <span className="header-icon">🗺️</span>
          <h1>Vehicle Map Demo</h1>
          <p>Interactive OpenStreetMap with vehicle tracking</p>
          <button
            onClick={() => setDemoMode(false)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#0984e3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            ← Back to Main App
          </button>
        </header>

        <main className="App-main">
          <MapDemo />
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="back-btn"
              onClick={handleBackToLanding}
              title="Back to Landing Page"
            >
              ← Back
            </button>
            {/* <span className="header-icon">UcasaApp</span> */}
            <div>
              <h1>Universal Collision Avoidance System Advisory App</h1>
              <p>GPS-based proximity alarm for accident prevention</p>
            </div>
          </div>
          <div className="user-info header-right">
            <div className="user-details">
              <span className="user-name">👤 {currentUser?.name}</span>
              <span className="user-vehicle">🚗 {currentUser?.vehicleId}</span>
              <span className="user-phone">📱 {currentUser?.phoneNumber}</span>
              <div className={`gps-status ${gpsStatus}`}>
                {gpsStatus === "searching" && "🔍 Getting GPS..."}
                {gpsStatus === "active" && "📍 GPS Active"}
                {gpsStatus === "error" && "❌ GPS Error"}
                {gpsStatus === "inactive" && "📍 GPS Inactive"}
              </div>
            </div>
            <div className="account-btn-wrapper">
              <button
                type="button"
                className="account-btn"
                onClick={() => setShowAccountPanel((p) => !p)}
                title="Account & Subscription"
              >
                Account
              </button>
              {showAccountPanel && (
                <>
                  <div
                    className="account-panel-backdrop"
                    onClick={() => setShowAccountPanel(false)}
                    aria-hidden="true"
                  />
                  <div className="account-panel" role="dialog" aria-labelledby="subscription-title" aria-modal="true">
                    <div className="account-panel-header">
                      <h2 id="subscription-title" className="account-panel-title">Subscription</h2>
                      <button
                        type="button"
                        className="account-panel-close"
                        onClick={() => setShowAccountPanel(false)}
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                    <p className="subscription-rate">
                      <span className="subscription-rate-label">Monthly rate</span>
                      <span className="subscription-rate-value">Rs {MONTHLY_RATE}</span>
                    </p>
                    <div className="subscription-options">
                      {SUBSCRIPTION_PLANS.map((plan) => {
                        const total = getPlanTotal(plan);
                        const isSelected = plan.id === selectedPlanId;
                        return (
                          <label
                            key={plan.id}
                            className={`subscription-option ${!plan.enabled ? "disabled" : ""} ${isSelected ? "selected" : ""}`}
                          >
                            <input
                              type="radio"
                              name="subscription"
                              checked={isSelected}
                              disabled={!plan.enabled}
                              readOnly
                            />
                            <span className="option-label">
                              <span className="option-name">{plan.label}</span>
                              <span className="option-price">Rs {total}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="subscription-summary">
                      <div className="summary-row">
                        <span>Subtotal ({selectedPlan?.months || 0} months)</span>
                        <span>Rs {totalBeforeDiscount}</span>
                      </div>
                      <div className="summary-row summary-row-discount">
                        <span>Discount ({discountPercent}%)</span>
                        <span>− Rs {totalBeforeDiscount}</span>
                      </div>
                      <div className="summary-row summary-row-total">
                        <span>Amount to pay</span>
                        <span>Rs {amountToPay}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`subscription-active-btn ${subscriptionActivated ? "activated" : ""}`}
                      onClick={() => {
                        setSubscriptionActivated(true);
                        setShowAccountPanel(false);
                      }}
                    >
                      {subscriptionActivated ? "Activated" : "Active"}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="header-buttons">
              {/* {gpsStatus === "inactive" || gpsStatus === "error" ? (
                <>
                  <button
                    onClick={() => startContinuousGPSTracking(currentUser)}
                    className="gps-btn"
                  >
                    Start GPS
                  </button>
                  <button
                    onClick={() => startSimulatedLocationDirect(currentUser)}
                    className="sim-btn"
                  >
                    Use Demo Location
                  </button>
                </>
              ) : null} */}
              {/* <button
                type="button"
                className="about-btn"
                onClick={() => setShowAboutLegal(true)}
              >
                About / Legal
              </button> */}
            </div>
          </div>
        </div>
      </header>

      <main className="App-main">
        <Dashboard
          vehicles={vehicles}
          allUsers={allUsers}
          systemStatus={systemStatus}
          currentUser={currentUser}
          onAddVehicle={handleAddVehicle}
          onRemoveVehicle={handleRemoveVehicle}
          onToggleDriving={handleToggleDriving}
          onLocationUpdate={handleLocationUpdate}
          onToggleLocationTracking={handleToggleLocationTracking}
          gpsStatus={gpsStatus}
          onStartGPS={() => startContinuousGPSTracking(currentUser)}
          onStartSimulated={() => startSimulatedLocationDirect(currentUser)}
          onUpdateUser={handleUpdateUser}
          onStopGPS={stopGPSTracking}
          onBackToLanding={handleBackToLanding}
        />

        {collisionAlert && (
          <CollisionAlert alert={collisionAlert} onDismiss={dismissAlert} />
        )}

        <AboutLegal
          open={showAboutLegal}
          onClose={handleCloseAboutLegal}
          initialView={aboutLegalView}
        />

        {/* PWA Install Prompt */}
        <InstallPWA />
      </main>
    </div>
  );
}

export default App;
