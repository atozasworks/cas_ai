import React, { useCallback, useEffect, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/adminApi';
import { formatDate } from '../../utils/helpers';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        status: status || undefined,
      });
      setUsers(res.users || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (err) {
      toast.error(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openDetails = async (id) => {
    setDetailsLoading(true);
    try {
      const res = await adminAPI.getUser(id);
      setSelected(res.user);
    } catch (err) {
      toast.error(err?.message || 'Failed to load user details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleBlock = async (user) => {
    const blocked = user.isActive !== false;
    const label = blocked ? 'block' : 'unblock';
    if (!window.confirm(`${label[0].toUpperCase()}${label.slice(1)} ${user.name}?`)) return;
    try {
      await adminAPI.setUserBlocked(user._id, blocked);
      toast.success(blocked ? 'User blocked' : 'User unblocked');
      loadUsers();
      if (selected?._id === user._id) {
        setSelected((prev) => ({ ...prev, isActive: !blocked }));
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to update user');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <div className="admin-search">
          <FiSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or phone"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="admin-empty">Loading users…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="admin-empty">No users found</td></tr>
              ) : users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="admin-name">{user.name}</div>
                    <div className="admin-muted">{user.email}</div>
                  </td>
                  <td>{user.role}</td>
                  <td>
                    <span className={`admin-badge ${user.isActive === false ? 'is-blocked' : 'is-active'}`}>
                      {user.isActive === false ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
                  <td>
                    <div className="admin-actions">
                      <button type="button" onClick={() => openDetails(user._id)} className="admin-btn">Details</button>
                      <button
                        type="button"
                        onClick={() => toggleBlock(user)}
                        className={`admin-btn ${user.isActive === false ? 'admin-btn-success' : 'admin-btn-danger'}`}
                      >
                        {user.isActive === false ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer">
          <span>{total} users</span>
          <div className="admin-pager">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="admin-btn">Prev</button>
            <span>{page}/{pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="admin-btn">Next</button>
          </div>
        </div>
      </div>

      {(selected || detailsLoading) && (
        <div className="admin-drawer-overlay" onClick={() => setSelected(null)}>
          <aside className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-head">
              <h3>User details</h3>
              <button type="button" onClick={() => setSelected(null)} className="admin-icon-btn"><FiX size={18} /></button>
            </div>
            {detailsLoading || !selected ? (
              <div className="admin-center"><div className="spinner" /></div>
            ) : (
              <div className="admin-page">
                <div>
                  <div className="admin-stat-value" style={{ fontSize: 22 }}>{selected.name}</div>
                  <div>{selected.email}</div>
                  <p className="admin-muted">{selected.phone || 'No phone'}</p>
                </div>
                <div className="admin-info-grid">
                  <Info label="Role" value={selected.role} />
                  <Info label="Status" value={selected.isActive === false ? 'Blocked' : 'Active'} />
                  <Info label="Joined" value={formatDate(selected.createdAt)} />
                  <Info label="Incidents" value={selected.incidentCount ?? 0} />
                </div>
                <div>
                  <h4>Vehicles</h4>
                  {(selected.vehicles || []).length === 0 && <p className="admin-muted">No vehicles</p>}
                  {(selected.vehicles || []).map((v) => (
                    <div key={v._id} className="admin-list-row">
                      {v.plateNumber} · {v.type} {v.make || ''} {v.model || ''}
                    </div>
                  ))}
                </div>
                <div>
                  <h4>Personal emergency contacts</h4>
                  {(selected.emergencyContacts || []).length === 0 && <p className="admin-muted">None on file</p>}
                  {(selected.emergencyContacts || []).map((c, idx) => (
                    <div key={`${c.phone}-${idx}`} className="admin-list-row">
                      {c.name} · {c.phone}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="admin-info-box">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
