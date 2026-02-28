import React, { useState, useEffect } from 'react';
import { vehicleAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { FiTruck, FiPlay, FiSquare, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function VehicleSelector() {
  const [vehicles, setVehicles] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ plateNumber: '', type: 'car', make: '', model: '' });
  const { activeVehicleId, startTracking, stopTracking } = useSocket();

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const data = await vehicleAPI.getAll();
      setVehicles(data.vehicles || []);
    } catch {
      /* ignore */
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await vehicleAPI.create(newVehicle);
      toast.success('Vehicle added');
      setNewVehicle({ plateNumber: '', type: 'car', make: '', model: '' });
      setShowAdd(false);
      loadVehicles();
    } catch (err) {
      toast.error(err?.message || 'Failed to add vehicle');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}><FiTruck /> Vehicles</h4>
        <button onClick={() => setShowAdd(!showAdd)} style={styles.addBtn}>
          <FiPlus /> Add
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} style={styles.form}>
          <input
            placeholder="Plate Number"
            value={newVehicle.plateNumber}
            onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
            required
            style={styles.input}
          />
          <select
            value={newVehicle.type}
            onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value })}
            style={styles.input}
          >
            <option value="car">Car</option>
            <option value="truck">Truck</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="bus">Bus</option>
            <option value="bicycle">Bicycle</option>
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Make" value={newVehicle.make}
              onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
              style={{ ...styles.input, flex: 1 }} />
            <input placeholder="Model" value={newVehicle.model}
              onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
              style={{ ...styles.input, flex: 1 }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '8px 0' }}>
            Save Vehicle
          </button>
        </form>
      )}

      <div style={styles.list}>
        {vehicles.length === 0 && !showAdd && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>
            No vehicles. Add one to start tracking.
          </p>
        )}
        {vehicles.map((v) => {
          const isActive = activeVehicleId === (v._id || v.id);
          return (
            <div key={v._id || v.id} style={{
              ...styles.vehicleItem,
              borderColor: isActive ? '#3b82f6' : 'var(--border-color)',
            }}>
              <div>
                <div style={styles.plate}>{v.plateNumber}</div>
                <div style={styles.meta}>
                  {v.type} {v.make && `| ${v.make}`} {v.model && v.model}
                </div>
              </div>
              <button
                onClick={() => isActive ? stopTracking() : startTracking(v._id || v.id)}
                style={{
                  ...styles.trackBtn,
                  background: isActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                  color: isActive ? '#ef4444' : '#22c55e',
                }}
              >
                {isActive ? <><FiSquare /> Stop</> : <><FiPlay /> Track</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {},
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
  },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 12,
  },
  input: { padding: '8px 10px', fontSize: 13 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  vehicleItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border-color)',
    background: 'var(--bg-tertiary)',
    transition: 'all 0.2s',
  },
  plate: { fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' },
  meta: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  trackBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    border: 'none', cursor: 'pointer',
  },
};
