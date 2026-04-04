import React, { useEffect, useState } from "react";
import "./CollisionAlert.css";

// Vehicle emoji mapping
const getVehicleEmoji = (vehicleType) => {
  const emojis = {
    car: '🚗',
    bike: '🏍️',
    auto: '🛺',
    truck: '🚚',
    bus: '🚌',
    bicycle: '🚴'
  };
  return emojis[vehicleType] || '🚗';
};

const CollisionAlert = ({ alert, onDismiss }) => {
  const [isBlinking, setIsBlinking] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const isCombinedAlert = alert.type === "COMBINED_ALERT";
  const isCollisionAlert = alert.alertLevel === "COLLISION";
  const isWarningAlert = alert.alertLevel === "WARNING";

  // For combined alerts, get vehicle lists
  const collisionVehicles = isCombinedAlert ? (alert.collisionVehicles || []) : [];
  const warningVehicles = isCombinedAlert ? (alert.warningVehicles || []) : [];
  const totalVehicles = collisionVehicles.length + warningVehicles.length;

  useEffect(() => {
    // Start voice alert based on alert type
    if ("speechSynthesis" in window) {
      let message = "";
      if (isCombinedAlert) {
        if (collisionVehicles.length > 0) {
          const directions = collisionVehicles.map(v => v.direction?.name).filter(Boolean).join(', ');
          message = `Collision alert! ${collisionVehicles.length} vehicle${collisionVehicles.length > 1 ? 's' : ''} ${directions ? `at ${directions}` : 'nearby'}! Take immediate action!`;
        } else if (warningVehicles.length > 0) {
          const directions = warningVehicles.map(v => v.direction?.name).filter(Boolean).join(', ');
          message = `Warning! ${warningVehicles.length} vehicle${warningVehicles.length > 1 ? 's' : ''} ${directions ? `at ${directions}` : 'nearby'}. Please maintain safe distance.`;
        }
      } else {
        // Legacy single vehicle alerts
        if (isCollisionAlert) {
          message = `Collision alert! Vehicle ${
            alert.nearbyVehicle.vehicleId
          } is only ${alert.distance.toFixed(
            1
          )} meters away! Take immediate action!`;
        } else if (isWarningAlert) {
          message = `Warning! Vehicle ${
            alert.nearbyVehicle.vehicleId
          } is ${alert.distance.toFixed(
            1
          )} meters away. Please maintain safe distance.`;
        }
      }

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = isCollisionAlert ? 1.3 : 1.1;
      utterance.pitch = isCollisionAlert ? 1.6 : 1.3;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    }

    // Play appropriate alarm sound
    if (isCollisionAlert) {
      playCollisionSound();
    } else if (isWarningAlert) {
      playWarningSound();
    }

    // Stop blinking after appropriate time
    const blinkDuration = isCollisionAlert ? 30000 : 15000; // 30s for collision, 15s for warning
    const blinkTimer = setTimeout(() => {
      setIsBlinking(false);
    }, blinkDuration);

    return () => {
      clearTimeout(blinkTimer);
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
      }
    };
  }, [alert, isCollisionAlert, isWarningAlert]);

  const playCollisionSound = () => {
    // High-pitched urgent beeping for collision alerts
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Play rapid beeps for collision
      let beepCount = 0;
      const playBeep = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // Higher pitch for collision
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
      };

      // Rapid beeping pattern for collision
      const beepInterval = setInterval(() => {
        if (beepCount < 20) {
          // More beeps for collision
          playBeep();
          beepCount++;
        } else {
          clearInterval(beepInterval);
        }
      }, 500); // Faster beeping (every 0.5 seconds)
    } catch (error) {
      console.log("Audio not supported:", error);
    }
  };

  const playWarningSound = () => {
    // Lower-pitched slower beeping for warning alerts
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      let beepCount = 0;
      const playBeep = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(600, audioContext.currentTime); // Lower pitch for warning
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.4);
      };

      // Slower beeping pattern for warning
      const beepInterval = setInterval(() => {
        if (beepCount < 10) {
          // Fewer beeps for warning
          playBeep();
          beepCount++;
        } else {
          clearInterval(beepInterval);
        }
      }, 1000); // Slower beeping (every 1 second)
    } catch (error) {
      console.log("Audio not supported:", error);
    }
  };

  const getAlertTitle = () => {
    if (isCollisionAlert) return "COLLISION ALERT!";
    if (isWarningAlert) return "PROXIMITY WARNING!";
    return "ALERT!";
  };

  const getAlertIcon = () => {
    if (isCollisionAlert) return "🚨";
    if (isWarningAlert) return "⚠️";
    return "⚠️";
  };

  const getDangerText = () => {
    if (isCollisionAlert) return "IMMEDIATE COLLISION RISK!";
    if (isWarningAlert) return "MAINTAIN SAFE DISTANCE!";
    return "CAUTION REQUIRED!";
  };

  const alertClass = isCollisionAlert ? "collision" : "warning";

  return (
    <div
      className={`collision-alert ${alertClass} ${
        isBlinking ? "blinking" : ""
      }`}
    >
      <div className="alert-content">
        <div className="alert-icon">{getAlertIcon()}</div>
        <div className="alert-text">
          <h2>{getAlertTitle()}</h2>
          
          {isCombinedAlert ? (
            <div className="vehicles-involved">
              {collisionVehicles.length > 0 && (
                <div className="collision-vehicles-section">
                  <h3>🚨 COLLISION RISK ({collisionVehicles.length} vehicle{collisionVehicles.length > 1 ? 's' : ''})</h3>
                  <div className="vehicle-list collision-list">
                    {collisionVehicles.map((vehicle, index) => (
                      <div key={vehicle.phoneNumber} className="vehicle-item collision-item">
                        <div className="vehicle-emoji">{getVehicleEmoji(vehicle.vehicleType)}</div>
                        <div className="vehicle-details">
                          <div className="vehicle-name">
                            {vehicle.vehicleId} - {vehicle.fullName}
                          </div>
                          <div className="vehicle-distance">
                            {vehicle.distance.toFixed(1)}m away
                          </div>
                          <div className="vehicle-direction">
                            {vehicle.direction && (
                              <span className="relative-direction">
                                {vehicle.direction.emoji} <strong>{vehicle.direction.name}</strong>
                              </span>
                            )}
                          </div>
                          {vehicle.movement && vehicle.movement.status !== "unknown" && (
                            <div className={`vehicle-movement ${vehicle.movement.status}`}>
                              {vehicle.movement.emoji} <strong>{vehicle.movement.text}</strong>
                              {vehicle.movement.speed > 0 && (
                                <span className="movement-speed">
                                  {' '}({vehicle.movement.speed.toFixed(1)} m/s)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {warningVehicles.length > 0 && (
                <div className="warning-vehicles-section">
                  <h3>⚠️ WARNING ZONE ({warningVehicles.length} vehicle{warningVehicles.length > 1 ? 's' : ''})</h3>
                  <div className="vehicle-list warning-list">
                    {warningVehicles.map((vehicle, index) => (
                      <div key={vehicle.phoneNumber} className="vehicle-item warning-item">
                        <div className="vehicle-emoji">{getVehicleEmoji(vehicle.vehicleType)}</div>
                        <div className="vehicle-details">
                          <div className="vehicle-name">
                            {vehicle.vehicleId} - {vehicle.fullName}
                          </div>
                          <div className="vehicle-distance">
                            {vehicle.distance.toFixed(1)}m away
                          </div>
                          <div className="vehicle-direction">
                            {vehicle.direction && (
                              <span className="relative-direction">
                                {vehicle.direction.emoji} <strong>{vehicle.direction.name}</strong>
                              </span>
                            )}
                          </div>
                          {vehicle.movement && vehicle.movement.status !== "unknown" && (
                            <div className={`vehicle-movement ${vehicle.movement.status}`}>
                              {vehicle.movement.emoji} <strong>{vehicle.movement.text}</strong>
                              {vehicle.movement.speed > 0 && (
                                <span className="movement-speed">
                                  {' '}({vehicle.movement.speed.toFixed(1)} m/s)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Legacy single vehicle display
            <div className="vehicles-involved">
              <h3>Nearby Vehicle:</h3>
              <div className="nearby-vehicle">
                <div className="vehicle-info">
                  <div className="vehicle-name">
                    {alert.nearbyVehicle.vehicleId} -{" "}
                    {alert.nearbyVehicle.fullName}
                  </div>
                  <div className="vehicle-phone">
                    {alert.nearbyVehicle.phoneNumber}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className={`distance-warning ${alertClass}`}>
            {isCombinedAlert ? (
              <>
                <p className="danger-text">{getDangerText()}</p>
                {collisionVehicles.length > 0 && (
                  <p className="action-text">
                    STOP OR CHANGE DIRECTION IMMEDIATELY!
                  </p>
                )}
                {warningVehicles.length > 0 && collisionVehicles.length === 0 && (
                  <p className="action-text">Reduce speed and maintain awareness</p>
                )}
              </>
            ) : (
              <>
                <p>
                  Distance: <strong>{alert.distance.toFixed(1)} meters</strong>
                </p>
                <p className="danger-text">{getDangerText()}</p>
                {isCollisionAlert && (
                  <p className="action-text">
                    STOP OR CHANGE DIRECTION IMMEDIATELY!
                  </p>
                )}
                {isWarningAlert && (
                  <p className="action-text">Reduce speed and maintain awareness</p>
                )}
              </>
            )}
          </div>
          <p className="timestamp">
            Alert Time: {new Date(alert.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button className={`dismiss-btn ${alertClass}`} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default CollisionAlert;
