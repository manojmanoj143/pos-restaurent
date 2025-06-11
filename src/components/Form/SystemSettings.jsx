import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import './SystemSettings.css';

const SystemSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Login');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    phoneNumber: '',
    roleProfile: 'User',
    password: '',
  });
  const [settings, setSettings] = useState({
    country: 'United Arab Emirates',
    language: 'English',
    timeZone: 'Asia/Dubai',
    currency: '',
    enableOnboarding: false,
    disableDocumentSharing: false,
    dateFormat: 'dd-mm-yyyy',
    timeFormat: 'HH:mm:ss',
    numberFormat: '#,##,###.##',
    useNumberFormatFromCurrency: false,
    firstDayOfWeek: 'Monday',
    floatPrecision: 3,
    currencyPrecision: '',
    roundingMethod: '',
    applyStrictUserPermissions: false,
    allowOlderWebViewLinks: false,
    numberOfBackups: 5,
    sessionExpiry: '06:00',
    documentShareKeyExpiry: 30,
    denyMultipleSessions: false,
    disableUserPassLogin: false,
    allowLoginUsingMobileNumber: false,
    allowLoginUsingUserName: false,
    loginWithEmailLink: false,
    allowConsecutiveLoginAttempts: 0,
    allowLoginAfterFail: 60,
    enableTwoFactorAuth: false,
    logoutOnPasswordReset: false,
    forceUserToResetPassword: 0,
    resetPasswordLinkExpiryDuration: '24:00',
    passwordResetLimit: 3,
    enablePasswordPolicy: false,
    minimumPasswordScore: 2,
  });
  const [clickCount, setClickCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(
        data.map((user) => ({
          fullName: user.firstName || 'Unknown',
          status: user.status || 'Active',
          userType: user.role,
          phoneNumber: user.phone_number || 'N/A',
          id: user.email,
        }))
      );
    } catch (error) {
      console.error('Error fetching users:', error);
      setWarningMessage('Failed to fetch users');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings((prev) => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      setWarningMessage('Failed to fetch settings');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSettings();
    const storedSettings = JSON.parse(localStorage.getItem('systemSettings'));
    if (storedSettings) setSettings((prev) => ({ ...prev, ...storedSettings }));
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleGoBack = () => navigate('/admin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      localStorage.setItem('systemSettings', JSON.stringify(settings));
      setWarningMessage('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      setWarningMessage(`Failed to save settings: ${error.message}`);
    }
  };

  const handleTriggerBackup = async () => {
    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    if (newClickCount === 4) {
      try {
        const response = await fetch('http://localhost:5000/api/trigger-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to trigger backup');
        const data = await response.json();
        setWarningMessage(data.message);
        setClickCount(0);
      } catch (error) {
        console.error('Error triggering backup:', error);
        setWarningMessage(`Failed: ${error.message}`);
      }
    } else {
      setWarningMessage(`Click ${4 - newClickCount} more time(s)!`);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowDropdown(value.length > 0);
  };

  const handleDropdownClick = () => {
    setShowUserList(true);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async () => {
    if (newUser.email && newUser.firstName && newUser.phoneNumber && newUser.password) {
      const newUserData = {
        email: newUser.email,
        firstName: newUser.firstName,
        phoneNumber: newUser.phoneNumber,
        role: newUser.roleProfile.toLowerCase(),
        password: newUser.password,
        status: 'Active',
        company: 'POS 8',
        pos_profile: 'POS-001',
      };
      try {
        const response = await fetch('http://localhost:5000/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUserData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to add user');
        }
        await fetchUsers();
        setNewUser({ email: '', firstName: '', phoneNumber: '', roleProfile: 'User', password: '' });
        setShowAddUserForm(false);
        setWarningMessage('User added successfully! You can now login with these credentials.');
      } catch (error) {
        console.error('Error adding user:', error);
        setWarningMessage(`Failed to add user: ${error.message}`);
      }
    } else {
      setWarningMessage('Please fill in all required fields.');
    }
  };

  const handleDeleteUser = (email) => {
    setUserToDelete(email);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      await fetchUsers();
      setWarningMessage('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      setWarningMessage(`Failed to delete user: ${error.message}`);
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const dateFormatOptions = ['dd-mm-yyyy', 'mm-dd-yyyy', 'yyyy-mm-dd', 'dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy/mm/dd'];
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const passwordScoreOptions = [
    { value: 1, label: 'Weak' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'Strong' },
    { value: 4, label: 'Very Strong' },
  ];
  const roleProfileOptions = ['User', 'Admin', 'Bearer'];

  const renderUserList = () => (
    <div className="user-list-container">
      <div className="sidebar">
        <h3>Filters</h3>
        <div>
          <label>Filter By</label>
          <input type="text" placeholder="Begin typing" />
        </div>
        <button className="edit-filters-btn">Edit Filters</button>
        <label>
          <input type="checkbox" /> Show Tags
        </label>
        <div>
          <label>Save Filter</label>
          <input type="text" placeholder="Filter Name" />
        </div>
      </div>
      <div className="main-content">
        <div className="user-list-header">
          <h3>User List</h3>
          <button className="add-user-btn" onClick={() => setShowAddUserForm(true)}>Add User</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Status</th>
              <th>User Type</th>
              <th>Phone Number</th>
              <th>ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={index}>
                <td>{user.fullName}</td>
                <td>{user.status}</td>
                <td>{user.userType}</td>
                <td>{user.phoneNumber}</td>
                <td>{user.id}</td>
                <td>
                  <button className="delete-btn" onClick={() => handleDeleteUser(user.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">{users.length} of {users.length}</div>
        {showAddUserForm && (
          <div className="add-user-form">
            <h3>Add New User</h3>
            <div className="form-content">
              <div>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleNewUserChange}
                  placeholder="e.g., test@example.com"
                  required
                />
              </div>
              <div>
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={newUser.firstName}
                  onChange={handleNewUserChange}
                  placeholder="e.g., Test"
                  required
                />
              </div>
              <div>
                <label>Phone Number</label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={newUser.phoneNumber}
                  onChange={handleNewUserChange}
                  placeholder="e.g., 1234567890"
                  required
                />
              </div>
              <div>
                <label>Role Profile</label>
                <select name="roleProfile" value={newUser.roleProfile} onChange={handleNewUserChange}>
                  {roleProfileOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleNewUserChange}
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>
            <div className="form-buttons">
              <button className="cancel-btn" onClick={() => setShowAddUserForm(false)}>Cancel</button>
              <button className="save-btn" onClick={handleAddUser}>Save</button>
            </div>
          </div>
        )}
        <button className="back-btn" onClick={() => setShowUserList(false)}>Back to Settings</button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (showUserList) return renderUserList();

    switch (activeTab) {
      case 'Details':
        return (
          <form onSubmit={handleSubmit} className="settings-form">
            <div>
              <label htmlFor="country">Country</label>
              <input type="text" id="country" name="country" value={settings.country} onChange={handleInputChange} />
            </div>
            <div>
              <label htmlFor="language">Language</label>
              <input type="text" id="language" name="language" value={settings.language} onChange={handleInputChange} />
            </div>
            <div>
              <label htmlFor="timeZone">Time Zone</label>
              <input type="text" id="timeZone" name="timeZone" value={settings.timeZone} onChange={handleInputChange} />
            </div>
            <div>
              <label htmlFor="currency">Currency</label>
              <input type="text" id="currency" name="currency" value={settings.currency} onChange={handleInputChange} />
            </div>
            <div>
              <label>
                <input type="checkbox" name="enableOnboarding" checked={settings.enableOnboarding} onChange={handleInputChange} />
                Enable Onboarding
              </label>
            </div>
            <div>
              <label>
                <input type="checkbox" name="disableDocumentSharing" checked={settings.disableDocumentSharing} onChange={handleInputChange} />
                Disable Document Sharing
              </label>
            </div>
            <div>
              <label htmlFor="dateFormat">Date Format</label>
              <select id="dateFormat" name="dateFormat" value={settings.dateFormat} onChange={handleInputChange}>
                {dateFormatOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="timeFormat">Time Format</label>
              <input type="text" id="timeFormat" name="timeFormat" value={settings.timeFormat} onChange={handleInputChange} />
            </div>
            <div>
              <label htmlFor="numberFormat">Number Format</label>
              <input type="text" id="numberFormat" name="numberFormat" value={settings.numberFormat} onChange={handleInputChange} />
            </div>
            <div>
              <label>
                <input type="checkbox" name="useNumberFormatFromCurrency" checked={settings.useNumberFormatFromCurrency} onChange={handleInputChange} />
                Use Number Format from Currency
              </label>
            </div>
            <div>
              <label htmlFor="firstDayOfWeek">First Day of the Week</label>
              <select id="firstDayOfWeek" name="firstDayOfWeek" value={settings.firstDayOfWeek} onChange={handleInputChange}>
                {daysOfWeek.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="floatPrecision">Float Precision</label>
              <input type="number" id="floatPrecision" name="floatPrecision" value={settings.floatPrecision} onChange={handleInputChange} min="1" max="10" />
            </div>
            <div>
              <label htmlFor="currencyPrecision">Currency Precision</label>
              <input type="number" id="currencyPrecision" name="currencyPrecision" value={settings.currencyPrecision} onChange={handleInputChange} placeholder="Depends on number format" />
            </div>
            <div>
              <label htmlFor="roundingMethod">Rounding Method</label>
              <input type="text" id="roundingMethod" name="roundingMethod" value={settings.roundingMethod} onChange={handleInputChange} />
            </div>
            <div>
              <label>
                <input type="checkbox" name="applyStrictUserPermissions" checked={settings.applyStrictUserPermissions} onChange={handleInputChange} />
                Apply Strict User Permissions
              </label>
            </div>
            <div>
              <label>
                <input type="checkbox" name="allowOlderWebViewLinks" checked={settings.allowOlderWebViewLinks} onChange={handleInputChange} />
                Allow Older Web View Links
              </label>
            </div>
            <button type="submit" className="save-settings-btn">Save Settings</button>
          </form>
        );
      case 'Login':
        return (
          <form onSubmit={handleSubmit} className="settings-form">
            <div>
              <label htmlFor="sessionExpiry">Session Expiry (HH:MM)</label>
              <input type="text" id="sessionExpiry" name="sessionExpiry" value={settings.sessionExpiry} onChange={handleInputChange} placeholder="e.g., 24:00" />
              <small>Example: 24:00 logs out after 24 hours of inactivity</small>
            </div>
            <div>
              <label htmlFor="documentShareKeyExpiry">Document Share Key Expiry (Days)</label>
              <input type="number" id="documentShareKeyExpiry" name="documentShareKeyExpiry" value={settings.documentShareKeyExpiry} onChange={handleInputChange} min="1" />
              <small>Days until Web View link expires</small>
            </div>
            <div>
              <label>
                <input type="checkbox" name="denyMultipleSessions" checked={settings.denyMultipleSessions} onChange={handleInputChange} />
                Allow Only One Session Per User
              </label>
              <small>Multiple sessions allowed on mobile</small>
            </div>
            <div>
              <label>
                <input type="checkbox" name="disableUserPassLogin" checked={settings.disableUserPassLogin} onChange={handleInputChange} />
                Disable Username/Password Login
              </label>
              <small>Configure Social Login first</small>
            </div>
            <div>
              <label>
                <input type="checkbox" name="allowLoginUsingMobileNumber" checked={settings.allowLoginUsingMobileNumber} onChange={handleInputChange} />
                Allow Login Using Mobile Number
              </label>
            </div>
            <div>
              <label>
                <input type="checkbox" name="allowLoginUsingUserName" checked={settings.allowLoginUsingUserName} onChange={handleInputChange} />
                Allow Login Using User Name
              </label>
            </div>
            <div>
              <label>
                <input type="checkbox" name="loginWithEmailLink" checked={settings.loginWithEmailLink} onChange={handleInputChange} />
                Login with Email Link
              </label>
              <small>Passwordless login via email</small>
            </div>
            <div>
              <label htmlFor="allowConsecutiveLoginAttempts">Allow Consecutive Login Attempts</label>
              <input type="number" id="allowConsecutiveLoginAttempts" name="allowConsecutiveLoginAttempts" value={settings.allowConsecutiveLoginAttempts} onChange={handleInputChange} min="0" />
            </div>
            <div>
              <label htmlFor="allowLoginAfterFail">Allow Login After Fail (Seconds)</label>
              <input type="number" id="allowLoginAfterFail" name="allowLoginAfterFail" value={settings.allowLoginAfterFail} onChange={handleInputChange} min="0" />
            </div>
            <div>
              <label>
                <input type="checkbox" name="enableTwoFactorAuth" checked={settings.enableTwoFactorAuth} onChange={handleInputChange} />
                Enable Two Factor Authentication
              </label>
            </div>
            <button type="submit" className="save-settings-btn">Save Settings</button>
          </form>
        );
      case 'Password':
        return (
          <form onSubmit={handleSubmit} className="settings-form">
            <div>
              <label>
                <input type="checkbox" name="logoutOnPasswordReset" checked={settings.logoutOnPasswordReset} onChange={handleInputChange} />
                Logout All Sessions on Password Reset
              </label>
            </div>
            <div>
              <label htmlFor="forceUserToResetPassword">Force User to Reset Password (Days)</label>
              <input type="number" id="forceUserToResetPassword" name="forceUserToResetPassword" value={settings.forceUserToResetPassword} onChange={handleInputChange} min="0" />
            </div>
            <div>
              <label htmlFor="resetPasswordLinkExpiryDuration">Reset Password Link Expiry (HH:MM)</label>
              <input type="text" id="resetPasswordLinkExpiryDuration" name="resetPasswordLinkExpiryDuration" value={settings.resetPasswordLinkExpiryDuration} onChange={handleInputChange} placeholder="e.g., 24:00" />
            </div>
            <div>
              <label htmlFor="passwordResetLimit">Password Reset Link Generation Limit</label>
              <input type="number" id="passwordResetLimit" name="passwordResetLimit" value={settings.passwordResetLimit} onChange={handleInputChange} min="1" />
              <small>Hourly rate limit for generating links</small>
            </div>
            <div>
              <label>
                <input type="checkbox" name="enablePasswordPolicy" checked={settings.enablePasswordPolicy} onChange={handleInputChange} />
                Enable Password Policy
              </label>
              <small>Enforces password strength based on score</small>
            </div>
            <div>
              <label htmlFor="minimumPasswordScore">Minimum Password Score</label>
              <select id="minimumPasswordScore" name="minimumPasswordScore" value={settings.minimumPasswordScore} onChange={handleInputChange}>
                {passwordScoreOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label} ({option.value})</option>
                ))}
              </select>
              <small>2 = Medium, 4 = Very Strong</small>
            </div>
            <button type="submit" className="save-settings-btn">Save Settings</button>
          </form>
        );
      case 'Email':
        return <div className="coming-soon">Email settings coming soon...</div>;
      case 'Files':
        return <div className="coming-soon">File settings coming soon...</div>;
      case 'App':
        return <div className="coming-soon">App settings coming soon...</div>;
      case 'Updates':
        return <div className="coming-soon">Update settings coming soon...</div>;
      case 'Backups':
        return (
          <div className="settings-form">
            <div>
              <label htmlFor="numberOfBackups">Number of Backups to Keep</label>
              <input
                type="number"
                id="numberOfBackups"
                name="numberOfBackups"
                value={settings.numberOfBackups}
                onChange={(e) => setSettings((prev) => ({ ...prev, numberOfBackups: Math.min(10, Math.max(1, e.target.value)) }))}
                min="1"
                max="10"
              />
            </div>
            <button className="trigger-backup-btn" onClick={handleTriggerBackup}>Trigger Backup (Click 4 times)</button>
            <button type="submit" className="save-settings-btn" onClick={handleSubmit}>Save Settings</button>
          </div>
        );
      case 'Advanced':
        return <div className="coming-soon">Advanced settings coming soon...</div>;
      default:
        return <div className="coming-soon">Coming soon...</div>;
    }
  };

  const tabs = ['Details', 'Login', 'Password', 'Email', 'Files', 'App', 'Updates', 'Backups', 'Advanced'];

  return (
    <div className="system-settings">
      <div className="header">
        <button className="back-to-admin-btn" onClick={handleGoBack}>
          <FaArrowLeft /> Back to Admin
        </button>
        <h2>System Settings</h2>
      </div>
      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search (e.g., userlist)"
        />
        {showDropdown && (
          <div className="dropdown">
            <div className="dropdown-item" onClick={handleDropdownClick}>User List</div>
          </div>
        )}
      </div>
      {warningMessage && (
        <div className="warning-box">
          <p className="warning-text">{warningMessage}</p>
          <button className="close-warning" onClick={() => setWarningMessage('')}>
            ×
          </button>
        </div>
      )}
      {!showUserList && (
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? 'active-tab' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      )}
      <div className="content">{renderTabContent()}</div>

      {showDeleteConfirm && (
        <>
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)} />
          <div className="confirm-modal">
            <p className="confirm-text">Are you sure you want to delete user {userToDelete}?</p>
            <div className="modal-button-group">
              <button className="confirm-delete-btn" onClick={confirmDelete}>
                Yes, Delete
              </button>
              <button className="cancel-delete-btn" onClick={() => setShowDeleteConfirm(false)}>
                No, Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemSettings;