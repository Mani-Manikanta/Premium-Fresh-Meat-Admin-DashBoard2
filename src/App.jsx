import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api.js';

const emptyForm = { name: '', email: '', password: '', role: 'user' };
const detailSections = {
  customers: {
    title: 'Customers',
    eyebrow: 'CUSTOMER DIRECTORY',
    description: 'A quick look at the people who shop with your business.',
    icon: '♡',
    records: [
      { name: 'Olivia Martin', subtitle: 'Customer · CUS-1042', status: 'Active', details: [['Email', 'olivia@example.com'], ['Location', 'Portland, OR'], ['Orders', '12']] },
      { name: 'Ethan Brooks', subtitle: 'Customer · CUS-1043', status: 'Active', details: [['Email', 'ethan@example.com'], ['Location', 'Austin, TX'], ['Orders', '8']] },
      { name: 'Mia Chen', subtitle: 'Customer · CUS-1044', status: 'New', details: [['Email', 'mia@example.com'], ['Location', 'Seattle, WA'], ['Orders', '1']] }
    ]
  },
  sellers: {
    title: 'Sellers',
    eyebrow: 'SELLER DIRECTORY',
    description: 'Seller contacts and the shops they manage.',
    icon: '▣',
    records: [
      { name: 'Northstar Goods', subtitle: 'Seller · SEL-0201', status: 'Active', details: [['Contact', 'Avery Johnson'], ['Email', 'avery@example.com'], ['Category', 'Home & living']] },
      { name: 'Meadow & Co.', subtitle: 'Seller · SEL-0202', status: 'Active', details: [['Contact', 'Noah Williams'], ['Email', 'noah@example.com'], ['Category', 'Apparel']] },
      { name: 'Brightside Market', subtitle: 'Seller · SEL-0203', status: 'Review', details: [['Contact', 'Isla Patel'], ['Email', 'isla@example.com'], ['Category', 'Art & gifts']] }
    ]
  },
  riders: {
    title: 'Riders',
    eyebrow: 'RIDER DIRECTORY',
    description: 'Delivery team contacts, vehicles, and coverage areas.',
    icon: '⌁',
    records: [
      { name: 'Kai Thompson', subtitle: 'Rider · RID-0081', status: 'On duty', details: [['Phone', '(555) 010-0181'], ['Vehicle', 'Bicycle'], ['Delivery zone', 'Downtown']] },
      { name: 'Zoe Rivera', subtitle: 'Rider · RID-0082', status: 'Available', details: [['Phone', '(555) 010-0182'], ['Vehicle', 'E-bike'], ['Delivery zone', 'Northside']] },
      { name: 'Leo Foster', subtitle: 'Rider · RID-0083', status: 'Off duty', details: [['Phone', '(555) 010-0183'], ['Vehicle', 'Scooter'], ['Delivery zone', 'West End']] }
    ]
  }
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('user-management-token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [users, setUsers] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [teamAccess, setTeamAccess] = useState(() => ({
    sellers: localStorage.getItem('team-access-sellers') !== 'restricted',
    riders: localStorage.getItem('team-access-riders') !== 'restricted'
  }));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));

  const endSession = useCallback(() => {
    localStorage.removeItem('user-management-token');
    setToken(null);
    setCurrentUser(null);
    setUsers([]);
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async (activeToken) => {
    const data = await apiRequest('/users', { token: activeToken });
    setUsers(data.users);
  }, []);

  function toggleTeamAccess(section) {
    const allowed = !teamAccess[section];
    localStorage.setItem(`team-access-${section}`, allowed ? 'allowed' : 'restricted');
    setTeamAccess((previous) => ({ ...previous, [section]: allowed }));
    setError('');
    setNotice(`${detailSections[section].title} access for team members ${allowed ? 'allowed' : 'restricted'}.`);
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    async function restoreSession() {
      try {
        const data = await apiRequest('/auth/me', { token });
        if (!active) return;
        setCurrentUser(data.user);
        if (data.user.role === 'admin') {
          await loadUsers(token);
        }
      } catch (requestError) {
        if (active) {
          endSession();
          setError(requestError.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    restoreSession();
    return () => { active = false; };
  }, [token, loadUsers, endSession]);

  function updateAuthField(event) {
    setAuthForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  }

  async function submitAuth(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const path = authMode === 'login' ? '/auth/login' : '/auth/register';
      const data = await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify(authForm)
      });
      localStorage.setItem('user-management-token', data.token);
      setCurrentUser(data.user);
      setToken(data.token);
      setAuthForm({ name: '', email: '', password: '' });
      setNotice(authMode === 'register' ? 'Account created. Welcome!' : 'You are signed in.');
      if (data.user.role === 'admin') await loadUsers(data.token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setSelectedUser(null);
    setError('');
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setShowForm(true);
    setSelectedUser(null);
    setError('');
  }

  async function submitUser(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const payload = { name: form.name, email: form.email, role: form.role };
    if (form.password) payload.password = form.password;
    try {
      const data = await apiRequest(
        editingId ? `/users/${editingId}` : '/users',
        {
          token,
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(payload)
        }
      );
      if (editingId) {
        setUsers((previous) => previous.map((user) => user.id === editingId ? data.user : user));
        setNotice('User details updated.');
      } else {
        setUsers((previous) => [data.user, ...previous]);
        setNotice('User added successfully.');
      }
      setShowForm(false);
      setForm(emptyForm);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.name}? This action cannot be undone.`)) return;
    setError('');
    setNotice('');
    try {
      await apiRequest(`/users/${user.id}`, { token, method: 'DELETE' });
      setUsers((previous) => previous.filter((entry) => entry.id !== user.id));
      setSelectedUser(null);
      setNotice(`${user.name} was deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) {
    return <main className="loading-screen"><span className="loader" />Checking your session…</main>;
  }

  if (!currentUser) {
    return (
      <main className="auth-page">
        <section className="auth-intro">
          <div className="brand-mark">P</div>
          <span className="eyebrow">PREMIUM FRESH MEAT</span>
          <h1>Fresh quality. Trusted service.</h1>
          <p>A clear space to manage the customers, sellers, and riders who keep your business moving.</p>
          <div className="intro-note"><span>✦</span> Thoughtful tools for everyday teams</div>
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <div className="mobile-brand"><span className="brand-mark small">P</span> PREMIUM FRESH MEAT</div>
            <p className="eyebrow">{authMode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</p>
            <h2>{authMode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>
            <p className="muted">{authMode === 'login' ? 'Enter your details below to continue.' : 'It only takes a moment to get set up.'}</p>
            {error && <div className="alert error" role="alert">{error}</div>}
            {notice && <div className="alert success" role="status">{notice}</div>}
            <form onSubmit={submitAuth} className="form-stack">
              {authMode === 'register' && (
                <label>Full name
                  <input name="name" value={authForm.name} onChange={updateAuthField} autoComplete="name" maxLength="100" required />
                </label>
              )}
              <label>Email address
                <input name="email" type="email" value={authForm.email} onChange={updateAuthField} autoComplete="email" maxLength="254" required />
              </label>
              <label>Password
                <input name="password" type="password" value={authForm.password} onChange={updateAuthField} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength="8" maxLength="72" required />
                {authMode === 'register' && <span className="field-hint">Use at least 8 characters.</span>}
              </label>
              <button className="button primary full" disabled={busy}>{busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'} <span aria-hidden="true">→</span></button>
            </form>
            <p className="switch-mode">
              {authMode === 'login' ? 'New to Premium Fresh Meat?' : 'Already have an account?'}{' '}
              <button type="button" className="text-button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); setNotice(''); }}>
                {authMode === 'login' ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          </div>
          <footer className="auth-footer">Premium Fresh Meat · Quality you can trust.</footer>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Premium Fresh Meat home"><span className="brand-mark">P</span><span>Premium <span className="brand-light">Fresh Meat</span></span></a>
        <div className="nav-label">WORKSPACE</div>
        <button type="button" className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')} aria-current={activeSection === 'overview' ? 'page' : undefined}><span className="nav-icon">▦</span> Overview</button>
        {currentUser.role === 'admin' && <button type="button" className="nav-item" onClick={() => setActiveSection('overview')}><span className="nav-icon">♙</span> User accounts <span className="nav-count">{users.length}</span></button>}
        {Object.entries(detailSections).map(([key, section]) => (
          <button key={key} type="button" className={`nav-item ${activeSection === key ? 'active' : ''}`} onClick={() => setActiveSection(key)} aria-current={activeSection === key ? 'page' : undefined} title={section.title} disabled={currentUser.role !== 'admin' && teamAccess[key] === false}>
            <span className="nav-icon">{section.icon}</span> {section.title}{currentUser.role !== 'admin' && teamAccess[key] === false && <span className="nav-count">Restricted</span>}
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon">✦</span><strong>Good to know</strong><p>Only administrators can add or manage accounts.</p></div>
          <div className="profile">
            <span className="avatar">{currentUser.name.charAt(0).toUpperCase()}</span>
            <span className="profile-name"><strong>{currentUser.name}</strong><small>{currentUser.role === 'admin' ? 'Administrator' : 'Team member'}</small></span>
            <button type="button" className="logout" onClick={endSession} title="Sign out" aria-label="Sign out">↗</button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar"><span>Workspace <span className="crumb">/</span> {detailSections[activeSection]?.title || 'Overview'}</span><span className="topbar-date">{detailSections[activeSection] ? 'SAMPLE DETAILS' : 'USER DIRECTORY'}</span></header>
        <div className="content-wrap">
          <div className="page-heading">
            <div><p className="eyebrow">{detailSections[activeSection]?.eyebrow || 'YOUR WORKSPACE'}</p><h1>{detailSections[activeSection]?.title || 'People overview'}</h1><p className="muted">{detailSections[activeSection]?.description || 'A little snapshot of everyone in your workspace.'}</p></div>
            {!detailSections[activeSection] && currentUser.role === 'admin' && <button className="button primary" onClick={startCreate}><span className="plus">+</span> Add a person</button>}
          </div>
          {(error || notice) && <div className={`alert ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>{error || notice}<button className="alert-close" onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss message">×</button></div>}

          {detailSections[activeSection] && currentUser.role !== 'admin' && teamAccess[activeSection] === false ? (
            <section className="member-card">
              <span className="member-icon">⌑</span><div><h2>Access restricted</h2><p>Your administrator has restricted team access to the {detailSections[activeSection].title.toLowerCase()} directory.</p><p className="member-email">{currentUser.email}</p></div>
            </section>
          ) : detailSections[activeSection] ? (
            <section className="details-section">
              <div className="details-note"><span>i</span><p>These are sample records for the dashboard preview. They are display-only and are not saved to the database.</p></div>
              <div className="details-grid">
                {detailSections[activeSection].records.map((record) => (
                  <article className="detail-record" key={record.subtitle}>
                    <div className="record-heading"><span className="record-avatar">{record.name.charAt(0)}</span><span className={`record-status ${record.status.toLowerCase().replace(' ', '-')}`}>{record.status}</span></div>
                    <h2>{record.name}</h2><p className="record-subtitle">{record.subtitle}</p>
                    <dl>{record.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                  </article>
                ))}
              </div>
            </section>
          ) : currentUser.role !== 'admin' ? (
            <section className="member-card">
              <span className="member-icon">♙</span><div><h2>You’re signed in</h2><p>Your account is ready. User directory management is available to administrators.</p><p className="member-email">{currentUser.email}</p></div>
            </section>
          ) : (
            <>
              <section className="business-overview">
                <div className="business-heading">
                  <div><h2>Business snapshot</h2><p>Sales performance at a glance.</p></div>
                  <span className="sample-label">DEMO FIGURES</span>
                </div>
                <div className="sales-grid">
                  <article className="admin-profile-card">
                    <div className="admin-profile-top">
                      <span className="admin-avatar">{currentUser.name.charAt(0).toUpperCase()}</span>
                      <span className="profile-badge">Signed in</span>
                    </div>
                    <span className="stat-caption">ADMIN PROFILE</span>
                    <h3>{currentUser.name}</h3>
                    <p className="admin-email">{currentUser.email}</p>
                    <span className="admin-role">Administrator</span>
                  </article>
                  <article className="sales-stat-card">
                    <div className="stat-top"><span className="stat-icon violet">↗</span><span className="stat-caption">TOTAL SALES</span></div>
                    <strong className="sales-stat-value">1,284</strong>
                    <span className="stat-foot">Sample completed orders</span>
                  </article>
                  <article className="sales-stat-card">
                    <div className="stat-top"><span className="stat-icon peach">$</span><span className="stat-caption">TOTAL REVENUE</span></div>
                    <strong className="sales-stat-value">$48,920</strong>
                    <span className="stat-foot">Illustrative USD amount</span>
                  </article>
                  <article className="sales-stat-card">
                    <div className="stat-top"><span className="stat-icon mint">◈</span><span className="stat-caption">TOTAL PROFIT</span></div>
                    <strong className="sales-stat-value">$12,230</strong>
                    <span className="stat-foot">Illustrative USD amount</span>
                  </article>
                </div>
                <p className="demo-disclaimer">Demo figures only — live sales and financial data are not connected to this app.</p>
              </section>
              <section className="access-panel">
                <div className="team-summary-heading"><h2>Team page access</h2><p>Choose which sample directories team members can open.</p></div>
                {['sellers', 'riders'].map((section) => (
                  <div className="access-row" key={section}>
                    <div><strong>{detailSections[section].title}</strong><span>Team members can {teamAccess[section] ? 'view' : 'not view'} this directory.</span></div>
                    <button
                      type="button"
                      className={`access-toggle ${teamAccess[section] ? 'enabled' : ''}`}
                      role="switch"
                      aria-checked={teamAccess[section]}
                      aria-label={`Allow team members to access ${detailSections[section].title.toLowerCase()}`}
                      onClick={() => toggleTeamAccess(section)}
                    ><span /></button>
                  </div>
                ))}
                <p className="demo-disclaimer">These settings are saved in this browser and apply to team-member accounts using it.</p>
              </section>
              <div className="team-summary-heading"><h2>Team summary</h2><p>Account totals from your user directory.</p></div>
              <section className="stats-grid">
                <article className="stat-card"><div className="stat-top"><span className="stat-icon violet">♙</span><span className="stat-caption">ALL ACCOUNTS</span></div><strong className="stat-value">{users.length}</strong><span className="stat-foot">People in your workspace</span></article>
                <article className="stat-card"><div className="stat-top"><span className="stat-icon peach">✦</span><span className="stat-caption">ADMINISTRATORS</span></div><strong className="stat-value">{users.filter((user) => user.role === 'admin').length}</strong><span className="stat-foot">Keeping things running</span></article>
                <article className="stat-card"><div className="stat-top"><span className="stat-icon mint">◷</span><span className="stat-caption">RECENTLY ADDED</span></div><strong className="stat-value">{users.filter((user) => Date.now() - new Date(user.created_at).getTime() < 7 * 86400000).length}</strong><span className="stat-foot">Joined in the last 7 days</span></article>
              </section>
              <section className="directory">
                <div className="section-heading"><div><h2>Your people</h2><p>Browse and manage the accounts in your workspace.</p></div><span className="record-count">{users.length} {users.length === 1 ? 'person' : 'people'}</span></div>
                {users.length === 0 ? <div className="empty-state"><span>♙</span><h3>Your directory is ready</h3><p>Add the first person to get started.</p><button className="button primary" onClick={startCreate}>Add a person</button></div> : (
                  <div className="table-scroll"><table><thead><tr><th>PERSON</th><th>ROLE</th><th>ADDED</th><th className="actions-heading">ACTIONS</th></tr></thead><tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td><div className="person-cell"><span className={`avatar ${user.role === 'admin' ? 'avatar-admin' : ''}`}>{user.name.charAt(0).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td>
                        <td><span className={`role-pill ${user.role}`}>{user.role === 'admin' ? 'Administrator' : 'Team member'}</span></td>
                        <td className="date-cell">{new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td><div className="row-actions"><button onClick={() => setSelectedUser(user)}>View</button><button onClick={() => startEdit(user)}>Edit</button><button className="delete-action" onClick={() => deleteUser(user)} disabled={user.id === currentUser.id}>Delete</button></div></td>
                      </tr>
                    ))}
                  </tbody></table></div>
                )}
              </section>
              <p className="page-footnote">Premium Fresh Meat <span>·</span> Quality you can trust.</p>
            </>
          )}
        </div>
      </main>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <div className="modal-heading"><div><p className="eyebrow">{editingId ? 'EDIT ACCOUNT' : 'NEW ACCOUNT'}</p><h2 id="form-title">{editingId ? 'Update person' : 'Add a person'}</h2></div><button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close">×</button></div>
            <p className="muted">{editingId ? 'Update the details below. Leave password blank to keep it unchanged.' : 'Add someone to your workspace with a temporary password.'}</p>
            {error && <div className="alert error" role="alert">{error}</div>}
            <form onSubmit={submitUser} className="form-stack modal-form">
              <label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength="100" required /></label>
              <label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength="254" required /></label>
              <label>{editingId ? 'New password (optional)' : 'Temporary password'}<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength="8" maxLength="72" required={!editingId} autoComplete="new-password" />{!editingId && <span className="field-hint">At least 8 characters.</span>}</label>
              <label>Account role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="user">Team member</option><option value="admin">Administrator</option></select></label>
              <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Add person'}</button></div>
            </form>
          </section>
        </div>
      )}

      {selectedUser && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null); }}>
          <section className="modal-card detail-card" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <div className="modal-heading"><div><p className="eyebrow">PERSON DETAILS</p><h2 id="detail-title">A closer look</h2></div><button className="modal-close" onClick={() => setSelectedUser(null)} aria-label="Close">×</button></div>
            <div className="detail-person"><span className="avatar avatar-large">{selectedUser.name.charAt(0).toUpperCase()}</span><div><h3>{selectedUser.name}</h3><p>{selectedUser.email}</p></div></div>
            <dl className="detail-list"><div><dt>Account role</dt><dd><span className={`role-pill ${selectedUser.role}`}>{selectedUser.role === 'admin' ? 'Administrator' : 'Team member'}</span></dd></div><div><dt>Added to workspace</dt><dd>{new Date(selectedUser.created_at).toLocaleString()}</dd></div><div><dt>Last updated</dt><dd>{new Date(selectedUser.updated_at).toLocaleString()}</dd></div></dl>
            <div className="modal-actions"><button className="button secondary" onClick={() => setSelectedUser(null)}>Close</button><button className="button primary" onClick={() => startEdit(selectedUser)}>Edit person</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
