import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/adminApi';

const EMPTY_FORM = {
  name: '',
  phone: '',
  city: '',
  type: 'other',
  organization: '',
  notes: '',
};

export default function AdminEmergencyContacts() {
  const [contacts, setContacts] = useState([]);
  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getEmergencyContacts({
        search: search.trim() || undefined,
        city: city || undefined,
      });
      setContacts(res.contacts || []);
      setCities(res.cities || []);
    } catch (err) {
      toast.error(err?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [search, city]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadContacts();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadContacts]);

  const grouped = useMemo(() => {
    return contacts.reduce((acc, contact) => {
      const key = contact.city || 'Unspecified';
      if (!acc[key]) acc[key] = [];
      acc[key].push(contact);
      return acc;
    }, {});
  }, [contacts]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setForm({
      name: contact.name || '',
      phone: contact.phone || '',
      city: contact.city || '',
      type: contact.type || 'other',
      organization: contact.organization || '',
      notes: contact.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim()) {
      toast.error('Name, phone, and city are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminAPI.updateEmergencyContact(editing._id, form);
        toast.success('Contact updated');
      } else {
        await adminAPI.createEmergencyContact(form);
        toast.success('Contact added');
      }
      setModalOpen(false);
      loadContacts();
    } catch (err) {
      toast.error(err?.message || 'Unable to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contact) => {
    if (!window.confirm(`Delete ${contact.name} in ${contact.city}?`)) return;
    try {
      await adminAPI.deleteEmergencyContact(contact._id);
      toast.success('Contact deleted');
      loadContacts();
    } catch (err) {
      toast.error(err?.message || 'Unable to delete contact');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <div className="admin-search">
          <FiSearch />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts" />
        </div>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {cities.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <button type="button" onClick={openCreate} className="admin-btn admin-btn-primary">
          <FiPlus /> Add contact
        </button>
      </div>

      {loading ? (
        <div className="admin-center"><div className="spinner" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="admin-card admin-empty">No city-wise emergency contacts yet</div>
      ) : (
        Object.entries(grouped).map(([cityName, cityContacts]) => (
          <section key={cityName} className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2>{cityName}</h2>
                <p className="admin-muted">{cityContacts.length} contact{cityContacts.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            {cityContacts.map((contact) => (
              <div key={contact._id} className="admin-city-row">
                <div>
                  <div className="admin-name">{contact.name}</div>
                  <div>{contact.phone}</div>
                  <p className="admin-muted">
                    {contact.type}{contact.organization ? ` · ${contact.organization}` : ''}
                  </p>
                </div>
                <div className="admin-actions">
                  <button type="button" onClick={() => openEdit(contact)} className="admin-btn"><FiEdit2 /> Edit</button>
                  <button type="button" onClick={() => handleDelete(contact)} className="admin-btn admin-btn-danger"><FiTrash2 /> Delete</button>
                </div>
              </div>
            ))}
          </section>
        ))
      )}

      {modalOpen && (
        <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3>{editing ? 'Edit contact' : 'Add contact'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="admin-icon-btn"><FiX /></button>
            </div>
            <div className="admin-form-grid">
              <Field label="Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
              <Field label="City" value={form.city} onChange={(v) => setForm((p) => ({ ...p, city: v }))} />
              <label className="admin-field-label">
                Type
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="police">Police</option>
                  <option value="ambulance">Ambulance</option>
                  <option value="fire">Fire</option>
                  <option value="hospital">Hospital</option>
                  <option value="helpline">Helpline</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <Field label="Organization" value={form.organization} onChange={(v) => setForm((p) => ({ ...p, organization: v }))} />
              <Field label="Notes" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} />
            </div>
            <div className="admin-modal-actions">
              <button type="button" onClick={() => setModalOpen(false)} className="admin-btn">Cancel</button>
              <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="admin-field-label">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
