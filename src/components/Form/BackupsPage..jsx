import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import axios from 'axios';

function BackupPage() {
  const navigate = useNavigate();
  const [backups, setBackups] = useState([]);
  const [maxBackups, setMaxBackups] = useState(parseInt(localStorage.getItem('numberOfBackups')) || 5);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningType, setWarningType] = useState('warning');
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    fetchBackupInfo();
    const storedMax = parseInt(localStorage.getItem('numberOfBackups')) || 5;
    setMaxBackups(storedMax);
  }, []);

  const handleWarningOk = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setWarningMessage('');
    setWarningType('warning');
  };

  const fetchBackupInfo = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/backup-info');
      const sortedData = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      const limitedData = sortedData.slice(0, maxBackups);
      setBackups(limitedData);
    } catch (error) {
      console.error('Error fetching backup info:', error);
      setWarningMessage(`Failed to fetch backup info: ${error.message}`);
      setWarningType('warning');
    }
  };

  const handleGoBack = () => {
    navigate('/admin');
  };

  const handleBackup = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/backup-to-excel', {
        responseType: 'blob',
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const filename = `backup_restaurant_data_${timestamp}.xlsx`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setWarningMessage('Backup created successfully! Excel file downloaded and sent to configured email.');
      setWarningType('success');
      setPendingAction(() => () => fetchBackupInfo());
    } catch (error) {
      console.error('Backup error:', error);
      let errorMessage = 'Failed to create backup';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setWarningMessage(errorMessage);
      setWarningType('warning');
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      const response = await axios.post('http://localhost:5000/api/download-backup', { filename }, {
        responseType: 'blob',
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setWarningMessage('Backup downloaded successfully!');
      setWarningType('success');
    } catch (error) {
      console.error('Download backup error:', error);
      let errorMessage = 'Failed to download backup';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setWarningMessage(errorMessage);
      setWarningType('warning');
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '1200px' }}>
      {warningMessage && (
        <div className={`alert alert-${warningType} text-center alert-dismissible fade show`} role="alert">
          {warningMessage}
          <button
            type="button"
            className="btn btn-primary ms-3"
            onClick={handleWarningOk}
          >
            OK
          </button>
        </div>
      )}

      <button
        onClick={handleGoBack}
        className="btn btn-outline-secondary"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = '#e0e0e0';
          e.target.style.transform = 'scale(1.1)';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.transform = 'scale(1)';
        }}
      >
        <FaArrowLeft style={{ fontSize: '24px' }} />
      </button>

      <h2
        className="text-center mb-5"
        style={{
          color: '#333',
          fontWeight: '600',
          fontSize: '2.5rem',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        Backup Management
      </h2>

      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="d-flex justify-content-center">
            <button
              className="btn btn-warning"
              onClick={handleBackup}
              style={{
                minWidth: '300px',
                padding: '20px 30px',
                fontSize: '1.3rem',
                fontWeight: '500',
                backgroundColor: '#ffc107',
                borderColor: '#ffc107',
                borderRadius: '10px',
                boxShadow: '0 6px 12px rgba(255, 193, 7, 0.3)',
                transition: 'all 0.3s ease',
                color: '#fff',
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e0a800';
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 8px 16px rgba(255, 193, 7, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ffc107';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 6px 12px rgba(255, 193, 7, 0.3)';
              }}
            >
              Create New Backup
            </button>
          </div>
        </div>

        <div className="col-md-6">
          <h4
            style={{
              color: '#444',
              fontWeight: '500',
              marginBottom: '20px',
              fontSize: '1.5rem',
            }}
          >
            Previous Backups (Latest {maxBackups})
          </h4>
          {backups.length > 0 ? (
            <div className="backup-list">
              {backups.map((backup) => (
                <div
                  key={backup.filename}
                  className="backup-card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '15px 20px',
                    marginBottom: '15px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    border: '1px solid #e0e0e0',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                  }}
                  onClick={() => handleDownloadBackup(backup.filename)}
                >
                  <div style={{ flex: 1 }}>
                    <h6 style={{ margin: 0, fontSize: '1.1rem', color: '#333', fontWeight: '500' }}>
                      Backup - {backup.date}
                    </h6>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#777' }}>
                      Size: {backup.size}
                    </p>
                  </div>
                  <button
                    className="btn btn-outline-primary"
                    style={{
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      border: '2px solid #007bff',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadBackup(backup.filename);
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#007bff';
                      e.target.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#007bff';
                    }}
                  >
                    <FaDownload style={{ fontSize: '18px' }} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No previous backups found</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .alert {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1050;
          min-width: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px;
          font-size: 1rem;
        }
        .alert .btn {
          margin-left: 15px;
          padding: 5px 20px;
          font-size: 0.9rem;
        }
        @media (max-width: 991px) {
          .alert {
            min-width: 80%;
          }
        }
        @media (max-width: 576px) {
          .alert {
            min-width: 90%;
            font-size: 0.9rem;
          }
          .alert .btn {
            padding: 4px 15px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}

export default BackupPage;