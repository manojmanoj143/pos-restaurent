import React from 'react';
import './firstTab.css';
import { useNavigate } from 'react-router-dom';

function FirstTab() {
    const navigate = useNavigate();

    const handleNavigation = (path, orderType) => {
        navigate(path, { state: { orderType } });
    };

    const handleBackToLogin = () => {
        navigate('/');
    };

    return (
        <div className="container-fluid main">
            <button
                className="back-button"
                onClick={handleBackToLogin}
                aria-label="Back to Login"
            >
                <i className="bi bi-arrow-left-circle"></i>
            </button>
            
            <div className="content-wrapper">
                <h1 className="title">Choose Your Dining Experience</h1>
                <div className="row justify-content-center align-items-center g-4 button-container">
                    <div className="col-12 col-md-4 d-flex justify-content-center">
                        <button 
                            className="main-button takeaway"
                            onClick={() => handleNavigation('/frontpage', 'Take Away')}
                        >
                            <span className="button-text">Take Away</span>
                            <span className="button-icon">🍔</span>
                        </button>
                    </div>
                    <div className="col-12 col-md-4 d-flex justify-content-center">
                        <button 
                            className="main-button dinein"
                            onClick={() => handleNavigation('/table', 'Dine In')}
                        >
                            <span className="button-text">Dine In</span>
                            <span className="button-icon">🍽️</span>
                        </button>
                    </div>
                    <div className="col-12 col-md-4 d-flex justify-content-center">
                        <button 
                            className="main-button delivery"
                            onClick={() => handleNavigation('/frontpage', 'Online Delivery')}
                        >
                            <span className="button-text">Online Delivery</span>
                            <span className="button-icon">🚚</span>
                        </button>
                    </div>
                    <div className="col-12 col-md-3 d-flex justify-content-center">
                        <button 
                            className="main-button booking"
                            onClick={() => handleNavigation('/booking', 'Booking')}
                        >
                            <span className="button-text">Booking</span>
                            <span className="button-icon">📅</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FirstTab;