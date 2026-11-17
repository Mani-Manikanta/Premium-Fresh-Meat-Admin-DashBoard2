import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api.js';

const emptyForm = { name: '', email: '', password: '', role: 'user' };
const emptyDirectoryForm = {
  name: '', email: '', contactName: '', phone: '', location: '',
   category: '', shopAddress: '', meatTypes: '', vehicle: '',
  deliveryZone: '', licenseNumber: '', rating: '', ordersCount: '0',
  profileImage: '', shopImage: ''
};
const financialPeriods = {
  daily: { label: 'Daily', sales: 43, revenue: 1631, profit: 408 },
  weekly: { label: 'Weekly', sales: 300, revenue: 11415, profit: 2854 },
  monthly: { label: 'Monthly', sales: 1284, revenue: 48920, profit: 12230 },
  yearly: { label: 'Yearly', sales: 15408, revenue: 587040, profit: 146760 }
};
const sampleOrders = [
  { id: 'ORD-1042', customer: 'Olivia Martin', item: 'Fresh meat selection', total: 1450, status: 'Delivered', placed: 'Today · 10:32 AM' },
  { id: 'ORD-1041', customer: 'Ethan Brooks', item: 'Chicken breast · 2 kg', total: 920, status: 'Preparing', placed: 'Today · 9:48 AM' },
  { id: 'ORD-1040', customer: 'Mia Chen', item: 'Lamb chops · 1 kg', total: 1680, status: 'Out for delivery', placed: 'Today · 8:16 AM' },
  { id: 'ORD-1039', customer: 'Noah Williams', item: 'Beef mince · 1 kg', total: 760, status: 'Delivered', placed: 'Yesterday · 6:24 PM' }
];
const detailSections = {
  customers: {
    title: 'Customers',
    eyebrow: 'CUSTOMER DIRECTORY',
    description: 'A quick look at the people who shop with your business.',
    icon: '👤',
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
    icon: '🏪',
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
    icon: '🚲',
    records: [
      { name: 'Kai Thompson', subtitle: 'Rider · RID-0081', status: 'On duty', details: [['Phone', '(555) 010-0181'], ['Vehicle', 'Bicycle'], ['Delivery zone', 'Downtown']] },
      { name: 'Zoe Rivera', subtitle: 'Rider · RID-0082', status: 'Available', details: [['Phone', '(555) 010-0182'], ['Vehicle', 'E-bike'], ['Delivery zone', 'Northside']] },
      { name: 'Leo Foster', subtitle: 'Rider · RID-0083', status: 'Off duty', details: [['Phone', '(555) 010-0183'], ['Vehicle', 'Scooter'], ['Delivery zone', 'West End']] }
    ]
  }
};

function formatMeatTypes(value) {
  if (Array.isArray(value)) return value.join(', ') || 'Not provided';
  if (typeof value !== 'string' || !value) return 'Not provided';
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.join(', ') || 'Not provided' : value;
  } catch {
    return value;
  }
}

function readRecentActivity() {
  const saved = localStorage.getItem('admin-recent-activity');
  if (!saved) return [];
  try {
    const entries = JSON.parse(saved);
    return Array.isArray(entries)
      ? entries.filter((entry) => entry && typeof entry.message === 'string' && typeof entry.createdAt === 'string').slice(0, 8)
      : [];
  } catch (error) {
    console.error('Could not read recent activity from this browser.', error);
    return [];
  }
}

function SidebarIcon({ name }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" {...common}>
      {name === 'overview' && <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>}
      {name === 'accounts' && <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.4-3 2.4-4.5 5.5-4.5s5.1 1.5 5.5 4.5" /><path d="M16 5.5a3 3 0 0 1 0 5.8M17 14.8c2.1.5 3.3 1.9 3.5 4.2" /></>}
      {name === 'store' && <><path d="M4 10v10h16V10" /><path d="M3 10 5 4h14l2 6" /><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M9 20v-6h6v6" /></>}
      {name === 'bike' && <><circle cx="6" cy="17" r="3.2" /><circle cx="18" cy="17" r="3.2" /><path d="m6 17 4-7h4l4 7m-8-7 4 7H8m3-10h3" /><path d="M13 7h2" /></>}
    </svg>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('user-management-token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [riders, setRiders] = useState([]);
  const directoryRecords = {
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      subtitle: `Customer · CUS-${String(customer.id).padStart(4, '0')}`,
      status: customer.status,
      profileImage: customer.profile_image,
      details: [
        ['Email', customer.email],
        ['Location', customer.location || 'Not provided'],
        ['Orders', String(customer.orders_count)]
      ]
    })),
    sellers: sellers.map((seller) => ({
      id: seller.id,
      name: seller.shop_name,
      subtitle: `Seller · SEL-${String(seller.id).padStart(4, '0')}`,
      status: seller.status,
      approvalStatus: seller.approval_status || (seller.status === 'Active' ? 'Approved' : 'Pending'),
      suspensionReason: seller.suspension_reason,
      profileImage: seller.profile_image,
      shopImage: seller.shop_image,
      details: [
        ['Contact', seller.contact_name],
        ['Email', seller.email],
        ['Category', seller.category || 'Not provided'],
        ['Address', seller.shop_address || 'Not provided'],
        ['Account status', seller.status || 'Not provided'],
        ['Approval', seller.approval_status || 'Pending'],
        ['Meat types', formatMeatTypes(seller.meat_types)],
        ['License', seller.license_number || 'Not provided'],
        ['Rating', Number(seller.rating) > 0 ? `${Number(seller.rating).toFixed(1)} / 5` : 'Not rated']
      ]
    })),
    riders: riders.map((rider) => ({
      id: rider.id,
      name: rider.name,
      subtitle: `Rider · RID-${String(rider.id).padStart(4, '0')}`,
      status: rider.status,
      approvalStatus: rider.approval_status || 'Pending',
      suspensionReason: rider.suspension_reason,
      profileImage: rider.profile_image,
      details: [
        ['Phone', rider.phone || 'Not provided'],
        ['Work status', rider.status || 'Not provided'],
        ['Vehicle', rider.vehicle || 'Not provided'],
        ['Delivery zone', rider.delivery_zone || 'Not provided'],
        ['License', rider.license_number || 'Not provided'],
        ['Rating', Number(rider.rating) > 0 ? `${Number(rider.rating).toFixed(1)} / 5` : 'Not rated'],
        ['Rides completed', String(rider.rides_completed)]
      ]
    }))
  };
  const [nameSearch, setNameSearch] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [teamAccess, setTeamAccess] = useState(() => ({
    sellers: localStorage.getItem('team-access-sellers') !== 'restricted',
    riders: localStorage.getItem('team-access-riders') !== 'restricted'
  }));
  const [form, setForm] = useState(emptyForm);
  const [directoryForm, setDirectoryForm] = useState(emptyDirectoryForm);
  const [directoryFormSection, setDirectoryFormSection] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDirectoryRecord, setSelectedDirectoryRecord] = useState(null);
  const [suspensionTarget, setSuspensionTarget] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recentActivity, setRecentActivity] = useState(readRecentActivity);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    localStorage.setItem('admin-recent-activity', JSON.stringify(recentActivity));
  }, [recentActivity]);

  function recordActivity(message) {
    const activity = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      createdAt: new Date().toISOString()
    };
    setRecentActivity((previous) => [activity, ...previous].slice(0, 8));
  }
  const searchTerm = nameSearch.trim().toLowerCase();
  const filteredUsers = users.filter((user) => user.name.toLowerCase().includes(searchTerm));
  const filteredDirectoryRecords = directoryRecords[activeSection]?.filter(
  (record) => record.name.toLowerCase().includes(searchTerm)
) || [];
 const directorySummary = ['sellers', 'riders', 'customers'].flatMap((section) => {
  const records = directoryRecords[section];

  const newCount = records.filter((record) => (
    section === 'customers' ? record.status === 'New' : record.approvalStatus === 'Pending'
  )).length;

  return [
    {
      label: `TOTAL ${detailSections[section].title.toUpperCase()}`,
      value: records.length,
      icon: detailSections[section].icon,
      tone: 'violet',
      foot: `In the ${detailSections[section].title.toLowerCase()} directory`
    },
    {
      label: `NEW ${detailSections[section].title.toUpperCase()}`,
      value: newCount,
      icon: '✦',
      tone: 'peach',
      foot: 'Awaiting review'
    }
  ];
});

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
  const loadDirectories = useCallback(async (activeToken) => {
  const [customerData, sellerData, riderData] = await Promise.all([
    apiRequest('/customers', { token: activeToken }),
    apiRequest('/sellers', { token: activeToken }),
    apiRequest('/riders', { token: activeToken })
  ]);

  setCustomers(customerData.customers || []);
  setSellers(sellerData.sellers || []);
  setRiders(riderData.riders || []);
}, []);

  function toggleTeamAccess(section) {
    const allowed = !teamAccess[section];
    localStorage.setItem(`team-access-${section}`, allowed ? 'allowed' : 'restricted');
    setTeamAccess((previous) => ({ ...previous, [section]: allowed }));
    recordActivity(`${detailSections[section].title} directory access ${allowed ? 'allowed' : 'restricted'} for team members.`);
    setError('');
    setNotice(`${detailSections[section].title} access for team members ${allowed ? 'allowed' : 'restricted'}.`);
  }

  async function setRecordAccess(section, record, status, reason = '') {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const customerStatus = status === 'approved' ? 'Active' : 'Inactive';
      const approvalStatus = status === 'approved'
        ? 'Approved'
        : status === 'suspended' ? 'Suspended' : 'Rejected';
      const data = await apiRequest(`/${section}/${record.id}`, {
        token,
        method: 'PUT',
        body: JSON.stringify(section === 'customers'
          ? { status: customerStatus }
          : {
            approval_status: approvalStatus,
            suspension_reason: status === 'suspended' ? reason.trim() : null,
            ...(section === 'sellers' && { status: status === 'approved' ? 'Active' : 'Inactive' })
          })
      });
      if (section === 'customers') {
        setCustomers((previous) => previous.map((entry) => entry.id === record.id ? data.customer : entry));
      } else if (section === 'sellers') {
        setSellers((previous) => previous.map((entry) => entry.id === record.id ? data.seller : entry));
      } else {
        setRiders((previous) => previous.map((entry) => entry.id === record.id ? data.rider : entry));
      }
      const result = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'suspended';
      setNotice(`${record.name}'s access ${result}.`);
      recordActivity(`${detailSections[section].title.slice(0, -1)} ${record.name}: access ${result}.`);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitSuspension(event) {
    event.preventDefault();
    const reason = suspensionReason.trim();
    if (!reason) {
      setError('Enter a reason before suspending access.');
      return;
    }
    if (!suspensionTarget) return;

    const updated = await setRecordAccess(
      suspensionTarget.section,
      suspensionTarget.record,
      'suspended',
      reason
    );
    if (updated) {
      setSuspensionTarget(null);
      setSuspensionReason('');
    }
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
        await loadDirectories(token);
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
  }, [token, loadUsers, loadDirectories, endSession]);

  function updateAuthField(event) {
    setAuthForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  }

async function submitAuth(event) {
  event.preventDefault();
  setError('');
  setNotice('');
  setBusy(true);

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(authForm)
    });

    // Allow administrators only
    if (data.user.role !== 'admin') {
      setError('Access denied. Administrator credentials are required.');
      setAuthForm({ email: '', password: '' });
      return;
    }

    localStorage.setItem('user-management-token', data.token);
    setCurrentUser(data.user);
    setToken(data.token);
    setAuthForm({ email: '', password: '' });

    setNotice('Administrator signed in successfully.');

await Promise.all([
  loadUsers(data.token),
  loadDirectories(data.token)
]);

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

  function startDirectoryCreate(section) {
    setDirectoryForm(emptyDirectoryForm);
    setDirectoryFormSection(section);
    setError('');
    setNotice('');
  }

  function readDirectoryImage(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > 750 * 1024) {
      setError('Each image must be smaller than 750 KB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDirectoryForm((previous) => ({ ...previous, [field]: reader.result }));
      setError('');
    };
    reader.onerror = () => setError('The selected image could not be read.');
    reader.readAsDataURL(file);
  }

  async function submitDirectoryRecord(event) {
    event.preventDefault();
    const section = directoryFormSection;
    const personName = directoryForm.name;
    setError('');
    setNotice('');
    setBusy(true);
    let payload;
    if (directoryFormSection === 'sellers') {
      payload = {
        shop_name: directoryForm.name,
        contact_name: directoryForm.contactName,
        email: directoryForm.email,
        category: directoryForm.category || null,
        shop_address: directoryForm.shopAddress || null,
        meat_types: directoryForm.meatTypes.split(',').map((type) => type.trim()).filter(Boolean),
        license_number: directoryForm.licenseNumber || null,
        shop_image: directoryForm.shopImage || null,
        profile_image: directoryForm.profileImage || null,
        rating: Number(directoryForm.rating) || 0,
        status: 'Review',
        approval_status: 'Pending'
      };
    } else if (directoryFormSection === 'riders') {
      payload = {
        name: directoryForm.name,
        phone: directoryForm.phone,
        vehicle: directoryForm.vehicle || null,
        delivery_zone: directoryForm.deliveryZone || null,
        license_number: directoryForm.licenseNumber,
        profile_image: directoryForm.profileImage || null,
        rating: Number(directoryForm.rating) || 0,
        status: 'Available',
        approval_status: 'Pending'
      };
    } else {
      payload = {
        name: directoryForm.name,
        email: directoryForm.email,
        location: directoryForm.location || null,
        orders_count: Number(directoryForm.ordersCount),
        profile_image: directoryForm.profileImage || null,
        status: 'New'
      };
    }

    try {
      const data = await apiRequest(`/${directoryFormSection}`, {
        token,
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (directoryFormSection === 'customers') {
        setCustomers((previous) => [data.customer, ...previous]);
      } else if (directoryFormSection === 'sellers') {
        setSellers((previous) => [data.seller, ...previous]);
      } else {
        setRiders((previous) => [data.rider, ...previous]);
      }
      recordActivity(`Added ${detailSections[section].title.slice(0, -1).toLowerCase()}: ${personName}.`);
      setDirectoryFormSection(null);
      setDirectoryForm(emptyDirectoryForm);
      setNameSearch('');
      setNotice(`${detailSections[directoryFormSection].title.slice(0, -1)} added successfully.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
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
        recordActivity(`Updated team account: ${data.user.name}.`);
      } else {
        setUsers((previous) => [data.user, ...previous]);
        setNotice('User added successfully.');
        recordActivity(`Added team account: ${data.user.name}.`);
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
      recordActivity(`Deleted team account: ${user.name}.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

 if (loading) {
  return (
    <main className="loading-screen">
      <span className="loader" />
      Checking your session…
    </main>
  );
}

if (!currentUser) {
    return (
      <main className="auth-page">
        <section className="auth-intro">
          <img className="brand-logo" src="/meat-logo.svg" alt="" />
          <span className="eyebrow">PREMIUM FRESH MEAT</span>
          <h1>Fresh quality. Trusted service.</h1>
          <p>A clear space to manage the customers, sellers, and riders who keep your business moving.</p>
          <div className="intro-note"><span>✦</span> Thoughtful tools for everyday teams</div>
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <div className="mobile-brand"><img className="brand-logo small" src="/meat-logo.svg" alt="" /> PREMIUM FRESH MEAT</div>
            <p className="eyebrow">ADMINISTRATOR ACCESS</p>
            <h2>Sign in to your account</h2>
            <p className="muted">Enter your administrator credentials to continue.</p>
            {error && <div className="alert error" role="alert">{error}</div>}
            {notice && <div className="alert success" role="status">{notice}</div>}
            <form onSubmit={submitAuth} className="form-stack">
              <label>Email address
                <input name="email" type="email" value={authForm.email} onChange={updateAuthField} autoComplete="email" maxLength="254" required />
              </label>
              <label>Password
                <input name="password" type="password" value={authForm.password} onChange={updateAuthField} autoComplete="current-password" minLength="8" maxLength="72" required />
              </label>
              <button className="button primary full" disabled={busy}>{busy ? 'Please wait…' : 'Sign in'} <span aria-hidden="true">→</span></button>
            </form>
          </div>
          <footer className="auth-footer">Premium Fresh Meat · Quality you can trust.</footer>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Premium Fresh Meat home"><img className="brand-logo" src="/meat-logo.svg" alt="" /><span>Premium <span className="brand-light">Fresh Meat</span></span></a>
        <div className="nav-label">WORKSPACE</div>
        <button type="button" className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')} aria-current={activeSection === 'overview' ? 'page' : undefined}><span className="nav-icon"><SidebarIcon name="overview" /></span> Overview</button>
        {currentUser.role === 'admin' && <button type="button" className="nav-item" onClick={() => setActiveSection('overview')}><span className="nav-icon"><SidebarIcon name="accounts" /></span> User accounts <span className="nav-count">{users.length}</span></button>}
        {Object.entries(detailSections).map(([key, section]) => (
          <button key={key} type="button" className={`nav-item ${activeSection === key ? 'active' : ''}`} onClick={() => setActiveSection(key)} aria-current={activeSection === key ? 'page' : undefined} title={section.title} disabled={currentUser.role !== 'admin' && teamAccess[key] === false}>
            <span className="nav-icon"><SidebarIcon name={key === 'sellers' ? 'store' : key === 'riders' ? 'bike' : 'accounts'} /></span> {section.title}{currentUser.role !== 'admin' && teamAccess[key] === false && <span className="nav-count">Restricted</span>}
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
        <header className="topbar"><span>Workspace <span className="crumb">/</span> {detailSections[activeSection]?.title || 'Overview'}</span><span className="topbar-date">{detailSections[activeSection] ? 'LIVE DIRECTORY' : 'USER DIRECTORY'}</span></header>
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
              <div className="details-note"><span>i</span><p>Live directory records loaded from your database.</p></div>
              <section className="directory">
                <div className="section-heading">
                  <div><h2>{detailSections[activeSection].title} directory</h2><p>Review contact details and current access status.</p></div>
                  <div className="section-tools">
                    <label className="visually-hidden" htmlFor="directory-name-search">Search names</label>
                    <input id="directory-name-search" className="directory-search" type="search" placeholder="Search names" value={nameSearch} onChange={(event) => setNameSearch(event.target.value)} />
                    <span className="record-count">
                    {filteredDirectoryRecords.length} of {directoryRecords[activeSection].length}
                    </span>
                    {currentUser.role === 'admin' && <button className="button primary" type="button" onClick={() => startDirectoryCreate(activeSection)}>Add {detailSections[activeSection].title.slice(0, -1)}</button>}
                  </div>
                </div>
                <div className="table-scroll">
                  <table className="details-table">
                    <thead><tr><th>NAME</th><th>INFORMATION</th><th>STATUS</th><th className="actions-heading">ACCESS</th></tr></thead>
                    <tbody>
                      {filteredDirectoryRecords.length === 0 ? (
                        <tr><td className="search-empty" colSpan={4}>No names match “{nameSearch}”.</td></tr>
                      ) : filteredDirectoryRecords.map((record) => {
                        const approvalStatus = (record.approvalStatus || 'Pending').toLowerCase();
                        const accessStatus = activeSection === 'customers'
                          ? record.status === 'Active' ? 'approved' : record.status === 'Inactive' ? 'suspended' : 'pending'
                          : record.status === 'Inactive' && activeSection === 'sellers' && approvalStatus === 'approved'
                            ? 'suspended'
                            : approvalStatus;
                        const statusLabel = activeSection === 'customers'
                          ? { approved: 'Active', pending: 'New', suspended: 'Suspended' }[accessStatus]
                          : { approved: 'Approved', pending: 'Pending approval', rejected: 'Rejected', suspended: 'Suspended' }[accessStatus];
                        return (
                          <tr key={record.subtitle}>
                            <td>
                              <button type="button" className="person-cell person-open" onClick={() => setSelectedDirectoryRecord({ section: activeSection, record })} aria-label={`View details for ${record.name}`}>
                                <span className="record-avatar">{record.profileImage ? <img src={record.profileImage} alt="" /> : record.name.charAt(0)}</span>
                                <span><strong>{record.name}</strong><small>{record.subtitle}</small></span>
                              </button>
                            </td>
                            <td><div className="record-details">{record.details.map(([label, value]) => <span key={label}><strong>{label}:</strong> {value}</span>)}{activeSection === 'sellers' && (record.shopImage ? <img className="shop-image" src={record.shopImage} alt={`${record.name} shop`} /> : <span className="shop-image-placeholder">Shop photo not added</span>)}</div></td>
                            <td><span className={`record-status ${statusLabel.toLowerCase().replace(' ', '-')}`}>{statusLabel}</span></td>
                            <td>
                              {currentUser.role === 'admin' ? (
                                activeSection === 'customers' ? (
                                  <div className="row-actions access-actions">
                                    <button type="button" onClick={() => setRecordAccess(activeSection, record, 'approved')} disabled={busy || accessStatus === 'approved'}>Activate</button>
                                    <button type="button" className="delete-action" onClick={() => setRecordAccess(activeSection, record, 'suspended')} disabled={busy || accessStatus === 'suspended'}>Suspend</button>
                                  </div>
                                ) : accessStatus === 'pending' ? (
                                  <div className="row-actions access-actions">
                                    <button type="button" onClick={() => setRecordAccess(activeSection, record, 'approved')} disabled={busy || accessStatus === 'approved'}>Approve</button>
                                    <button type="button" className="delete-action" onClick={() => setRecordAccess(activeSection, record, 'rejected')} disabled={busy}>Reject</button>
                                  </div>
                                ) : accessStatus === 'approved' ? (
                                  <div className="row-actions access-actions">
                                    <button type="button" className="delete-action" onClick={() => { setSuspensionTarget({ section: activeSection, record }); setSuspensionReason(''); setError(''); setNotice(''); }} disabled={busy}>Suspend</button>
                                  </div>
                                ) : accessStatus === 'suspended' ? (
                                  <div className="row-actions access-actions">
                                    <button type="button" onClick={() => setRecordAccess(activeSection, record, 'approved')} disabled={busy}>Restore</button>
                                  </div>
                                ) : (
                                  <div className="row-actions access-actions">
                                    <button type="button" onClick={() => setRecordAccess(activeSection, record, 'approved')} disabled={busy}>Approve</button>
                                  </div>
                                )
                              ) : <span className="muted">Admin only</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          ) : currentUser.role !== 'admin' ? (
            <section className="member-card">
              <span className="member-icon">♙</span><div><h2>You’re signed in</h2><p>Your account is ready. User directory management is available to administrators.</p><p className="member-email">{currentUser.email}</p></div>
            </section>
          ) : (
            <>
              <section className="business-overview">
                <div className="business-heading">
                  <div><h2>Business snapshot</h2><p>{financialPeriods[reportPeriod].label} sales performance.</p></div>
                  <div className="business-tools">
                    <label className="period-filter">Period
                      <select value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value)}>
                        {Object.entries(financialPeriods).map(([period, values]) => <option key={period} value={period}>{values.label}</option>)}
                      </select>
                    </label>
                    <span className="sample-label">DEMO FIGURES</span>
                  </div>
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
                    <strong className="sales-stat-value">{financialPeriods[reportPeriod].sales.toLocaleString('en-IN')}</strong>
                    <span className="stat-foot">Completed orders · {financialPeriods[reportPeriod].label.toLowerCase()}</span>
                  </article>
                  <article className="sales-stat-card">
                    <div className="stat-top"><span className="stat-icon peach">₹</span><span className="stat-caption">TOTAL REVENUE</span></div>
                    <strong className="sales-stat-value">₹{financialPeriods[reportPeriod].revenue.toLocaleString('en-IN')}</strong>
                    <span className="stat-foot">{financialPeriods[reportPeriod].label} revenue</span>
                  </article>
                  <article className="sales-stat-card">
                    <div className="stat-top"><span className="stat-icon mint">◈</span><span className="stat-caption">TOTAL PROFIT</span></div>
                    <strong className="sales-stat-value">₹{financialPeriods[reportPeriod].profit.toLocaleString('en-IN')}</strong>
                    <span className="stat-foot">{financialPeriods[reportPeriod].label} profit</span>
                  </article>
                </div>
                <p className="demo-disclaimer">Illustrative figures only — live financial totals require an orders and payments data source.</p>
              </section>
              <section className="recent-panels">
                <article className="recent-panel">
                  <div className="recent-panel-heading">
                    <div><h2>Recent orders</h2><p>Latest sample orders for this dashboard preview.</p></div>
                    <span className="sample-label">SAMPLE DATA</span>
                  </div>
                  <div className="recent-order-list">
                    {sampleOrders.map((order) => (
                      <div className="recent-order" key={order.id}>
                        <div className="order-main">
                          <strong>{order.id}</strong>
                          <span>{order.customer} · {order.item}</span>
                          <small>{order.placed}</small>
                        </div>
                        <div className="order-side">
                          <strong>₹{order.total.toLocaleString('en-IN')}</strong>
                          <span className={`order-status ${order.status.toLowerCase().replaceAll(' ', '-')}`}>{order.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="demo-disclaimer">Orders are examples; live orders are not connected to this app.</p>
                </article>
                <article className="recent-panel">
                  <div className="recent-panel-heading">
                    <div><h2>Recent activity</h2><p>Admin actions from this browser.</p></div>
                    <span className="activity-scope">THIS BROWSER</span>
                  </div>
                  {recentActivity.length ? (
                    <ul className="activity-list">
                      {recentActivity.map((activity) => (
                        <li className="activity-item" key={activity.id}>
                          <span className="activity-mark" aria-hidden="true">✓</span>
                          <div><strong>{activity.message}</strong><time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div>
                        </li>
                      ))}
                    </ul>
                  ) : <div className="activity-empty"><span aria-hidden="true">↻</span><p>Directory and account changes will appear here.</p></div>}
                </article>
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
              <div className="team-summary-heading"><h2>Seller, rider &amp; customer totals</h2><p>New sellers and customers are awaiting approval; new riders are marked New.</p></div>
              <section className="stats-grid">
                {directorySummary.map((stat) => (
                  <article className="stat-card" key={stat.label}>
                    <div className="stat-top"><span className={`stat-icon ${stat.tone}`}>{stat.icon}</span><span className="stat-caption">{stat.label}</span></div>
                    <strong className="stat-value">{stat.value}</strong>
                    <span className="stat-foot">{stat.foot}</span>
                  </article>
                ))}
              </section>
              <div className="team-summary-heading"><h2>Team summary</h2><p>Account totals from your user directory.</p></div>
              <section className="stats-grid">
                <article className="stat-card"><div className="stat-top"><span className="stat-icon violet">♙</span><span className="stat-caption">ALL ACCOUNTS</span></div><strong className="stat-value">{users.length}</strong><span className="stat-foot">People in your workspace</span></article>
                <article className="stat-card"><div className="stat-top"><span className="stat-icon peach">✦</span><span className="stat-caption">ADMINISTRATORS</span></div><strong className="stat-value">{users.filter((user) => user.role === 'admin').length}</strong><span className="stat-foot">Keeping things running</span></article>
                <article className="stat-card"><div className="stat-top"><span className="stat-icon mint">◷</span><span className="stat-caption">RECENTLY ADDED</span></div><strong className="stat-value">{users.filter((user) => Date.now() - new Date(user.created_at).getTime() < 7 * 86400000).length}</strong><span className="stat-foot">Joined in the last 7 days</span></article>
              </section>
              <section className="directory">
                <div className="section-heading">
                  <div><h2>Your people</h2><p>Browse and manage the accounts in your workspace.</p></div>
                  <div className="section-tools">
                    <label className="visually-hidden" htmlFor="users-name-search">Search people by name</label>
                    <input id="users-name-search" className="directory-search" type="search" placeholder="Search names" value={nameSearch} onChange={(event) => setNameSearch(event.target.value)} />
                    <span className="record-count">{filteredUsers.length} of {users.length}</span>
                  </div>
                </div>
                {users.length === 0 ? <div className="empty-state"><span>♙</span><h3>Your directory is ready</h3><p>Add the first person to get started.</p><button className="button primary" onClick={startCreate}>Add a person</button></div> : (
                  filteredUsers.length === 0 ? <div className="empty-state"><h3>No names match</h3><p>Try a different search.</p></div> : (
                    <div className="table-scroll"><table><thead><tr><th>PERSON</th><th>ROLE</th><th>ADDED</th><th className="actions-heading">ACTIONS</th></tr></thead><tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td><div className="person-cell"><span className={`avatar ${user.role === 'admin' ? 'avatar-admin' : ''}`}>{user.name.charAt(0).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td>
                        <td><span className={`role-pill ${user.role}`}>{user.role === 'admin' ? 'Administrator' : 'Team member'}</span></td>
                        <td className="date-cell">{new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td><div className="row-actions"><button onClick={() => setSelectedUser(user)}>View</button><button onClick={() => startEdit(user)}>Edit</button><button className="delete-action" onClick={() => deleteUser(user)} disabled={user.id === currentUser.id}>Delete</button></div></td>
                      </tr>
                    ))}
                    </tbody></table></div>
                  )
                )}
              </section>
              <p className="page-footnote">Premium Fresh Meat <span>·</span> Quality you can trust.</p>
            </>
          )}
        </div>
      </main>

      {selectedDirectoryRecord && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDirectoryRecord(null); }}>
          <section className="modal-card detail-card" role="dialog" aria-modal="true" aria-labelledby="directory-detail-title">
            <div className="modal-heading"><div><p className="eyebrow">{detailSections[selectedDirectoryRecord.section].eyebrow}</p><h2 id="directory-detail-title">Person details</h2></div><button className="modal-close" type="button" onClick={() => setSelectedDirectoryRecord(null)} aria-label="Close">×</button></div>
            <div className="detail-person">
              <span className="record-avatar detail-avatar">{selectedDirectoryRecord.record.profileImage ? <img src={selectedDirectoryRecord.record.profileImage} alt={`${selectedDirectoryRecord.record.name} profile`} /> : selectedDirectoryRecord.record.name.charAt(0)}</span>
              <div><h3>{selectedDirectoryRecord.record.name}</h3><p>{selectedDirectoryRecord.record.subtitle}</p></div>
            </div>
            <dl className="detail-list">
              <div><dt>Directory status</dt><dd>{selectedDirectoryRecord.record.status}</dd></div>
              {selectedDirectoryRecord.record.approvalStatus && <div><dt>Approval</dt><dd>{selectedDirectoryRecord.record.approvalStatus}</dd></div>}
              {selectedDirectoryRecord.record.suspensionReason && <div><dt>Suspension reason</dt><dd>{selectedDirectoryRecord.record.suspensionReason}</dd></div>}
              {selectedDirectoryRecord.record.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            {selectedDirectoryRecord.section === 'sellers' && selectedDirectoryRecord.record.shopImage && <div className="detail-shop-image"><h3>Shop picture</h3><img src={selectedDirectoryRecord.record.shopImage} alt={`${selectedDirectoryRecord.record.name} shop`} /></div>}
            <div className="modal-actions"><button className="button secondary" type="button" onClick={() => setSelectedDirectoryRecord(null)}>Close</button></div>
          </section>
        </div>
      )}

      {suspensionTarget && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) { setSuspensionTarget(null); setSuspensionReason(''); setError(''); } }}>
          <section className="modal-card suspension-modal" role="dialog" aria-modal="true" aria-labelledby="suspension-title">
            <div className="modal-heading">
              <div><p className="eyebrow">ACCESS CONTROL</p><h2 id="suspension-title">Suspend access</h2></div>
              <button className="modal-close" type="button" onClick={() => { setSuspensionTarget(null); setSuspensionReason(''); setError(''); }} aria-label="Close" disabled={busy}>×</button>
            </div>
            <p className="muted">Suspend {suspensionTarget.record.name}. A reason is required and will be saved with this record.</p>
            {error && <div className="alert error" role="alert">{error}</div>}
            <form onSubmit={submitSuspension} className="form-stack">
              <label htmlFor="suspension-reason">Reason for suspension
                <textarea id="suspension-reason" value={suspensionReason} onChange={(event) => setSuspensionReason(event.target.value)} maxLength="500" required />
              </label>
              <span className="field-hint reason-count">{suspensionReason.length}/500 characters</span>
              <div className="modal-actions"><button type="button" className="button secondary" onClick={() => { setSuspensionTarget(null); setSuspensionReason(''); setError(''); }} disabled={busy}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Suspend access'}</button></div>
            </form>
          </section>
        </div>
      )}

      {directoryFormSection && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDirectoryFormSection(null); }}>
          <section className="modal-card directory-modal" role="dialog" aria-modal="true" aria-labelledby="directory-form-title">
            <div className="modal-heading"><div><p className="eyebrow">NEW {detailSections[directoryFormSection].title.slice(0, -1).toUpperCase()}</p><h2 id="directory-form-title">Add {detailSections[directoryFormSection].title.slice(0, -1).toLowerCase()}</h2></div><button className="modal-close" type="button" onClick={() => setDirectoryFormSection(null)} aria-label="Close" disabled={busy}>×</button></div>
            <p className="muted">New sellers and riders are added as pending until approved.</p>
            {error && <div className="alert error" role="alert">{error}</div>}
            <form onSubmit={submitDirectoryRecord} className="form-stack modal-form directory-form">
              {directoryFormSection === 'sellers'
                ? <label>Shop name<input value={directoryForm.name} onChange={(event) => setDirectoryForm({ ...directoryForm, name: event.target.value })} maxLength="150" required /></label>
                : <label>Full name<input value={directoryForm.name} onChange={(event) => setDirectoryForm({ ...directoryForm, name: event.target.value })} maxLength="100" required /></label>}
              {(directoryFormSection === 'customers' || directoryFormSection === 'sellers') && <label>Email address<input type="email" value={directoryForm.email} onChange={(event) => setDirectoryForm({ ...directoryForm, email: event.target.value })} maxLength="254" required /></label>}
              {directoryFormSection === 'sellers' && <>
                <label>Contact name<input value={directoryForm.contactName} onChange={(event) => setDirectoryForm({ ...directoryForm, contactName: event.target.value })} maxLength="100" required /></label>
                <label>Category<input value={directoryForm.category} onChange={(event) => setDirectoryForm({ ...directoryForm, category: event.target.value })} maxLength="100" /></label>
                <label>Shop address<input value={directoryForm.shopAddress} onChange={(event) => setDirectoryForm({ ...directoryForm, shopAddress: event.target.value })} maxLength="255" /></label>
                <label>Meat types <span className="field-hint">Separate items with commas.</span><input value={directoryForm.meatTypes} onChange={(event) => setDirectoryForm({ ...directoryForm, meatTypes: event.target.value })} maxLength="500" /></label>
              </>}
              {directoryFormSection === 'customers' && <>
                <label>Location<input value={directoryForm.location} onChange={(event) => setDirectoryForm({ ...directoryForm, location: event.target.value })} maxLength="255" /></label>
                <label>Orders count<input type="number" min="0" step="1" value={directoryForm.ordersCount} onChange={(event) => setDirectoryForm({ ...directoryForm, ordersCount: event.target.value })} /></label>
                <label>Profile picture<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => readDirectoryImage(event, 'profileImage')} />{directoryForm.profileImage && <img className="image-preview" src={directoryForm.profileImage} alt="Profile preview" />}</label>
              </>}
              {directoryFormSection === 'riders' && <>
                <label>Phone<input type="tel" value={directoryForm.phone} onChange={(event) => setDirectoryForm({ ...directoryForm, phone: event.target.value })} maxLength="20" required /></label>
                <label>Vehicle<input value={directoryForm.vehicle} onChange={(event) => setDirectoryForm({ ...directoryForm, vehicle: event.target.value })} maxLength="50" /></label>
                <label>Delivery zone<input value={directoryForm.deliveryZone} onChange={(event) => setDirectoryForm({ ...directoryForm, deliveryZone: event.target.value })} maxLength="100" /></label>
              </>}
              {(directoryFormSection === 'sellers' || directoryFormSection === 'riders') && <>
                <label>License number<input value={directoryForm.licenseNumber} onChange={(event) => setDirectoryForm({ ...directoryForm, licenseNumber: event.target.value })} maxLength="50" /></label>
                <label>Rating (optional)<input type="number" min="0" max="5" step="0.1" value={directoryForm.rating} onChange={(event) => setDirectoryForm({ ...directoryForm, rating: event.target.value })} /></label>
                <label>Profile picture<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => readDirectoryImage(event, 'profileImage')} />{directoryForm.profileImage && <img className="image-preview" src={directoryForm.profileImage} alt="Profile preview" />}</label>
                {directoryFormSection === 'sellers' && <label>Shop picture<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => readDirectoryImage(event, 'shopImage')} />{directoryForm.shopImage && <img className="image-preview" src={directoryForm.shopImage} alt="Shop preview" />}</label>}
              </>}
              <div className="modal-actions directory-form-actions"><button type="button" className="button secondary" onClick={() => setDirectoryFormSection(null)} disabled={busy}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : `Add ${detailSections[directoryFormSection].title.slice(0, -1).toLowerCase()}`}</button></div>
            </form>
          </section>
        </div>
      )}

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
