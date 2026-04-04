import React, { useState } from "react";
import "./VehicleRegistration.css";

const VehicleRegistration = ({ onAddVehicle }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (phoneNumber.trim() && vehicleId.trim()) {
      onAddVehicle(phoneNumber.trim(), vehicleId.trim());
      setPhoneNumber("");
      setVehicleId("");
    }
  };

  return (
    <div className="dashboard-panel">
      <h3>Register Vehicle</h3>
      <form onSubmit={handleSubmit} className="registration-form">
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Mobile Number (e.g., +1234567890)"
          required
        />
        <input
          type="text"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          placeholder="Vehicle ID (e.g., CAR01)"
          required
        />
        <button type="submit" className="add-vehicle-btn">
          Add Vehicle
        </button>
      </form>
    </div>
  );
};

export default VehicleRegistration;
