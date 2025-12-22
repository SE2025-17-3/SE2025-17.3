// map-server/frontend/src/components/PackageSelector.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './PackageSelector.css';

const PackageSelector = ({ onSelectPackage, selectedPackageId }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments/packages', {
        credentials: 'include',
      });

      // Check if user is not authenticated
      if (response.status === 401) {
        setError('Please log in to view payment packages');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setPackages(data.packages);
      } else {
        setError(data.message || 'Failed to load packages');
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDroplets = (amount) => {
    return amount.toLocaleString();
  };

  if (loading) {
    return <div className="package-selector-loading">Loading packages...</div>;
  }

  if (error) {
    return <div className="package-selector-error">{error}</div>;
  }

  return (
    <div className="package-selector">
      <h3>Select a Droplet Package</h3>
      <div className="packages-grid">
        {packages.map((pkg) => {
          const totalDroplets = pkg.baseDroplets + pkg.bonusDroplets;
          const isSelected = selectedPackageId === pkg.id;
          const isBestValue = pkg.bonusPercentage >= 10;

          return (
            <div
              key={pkg.id}
              className={`package-card ${isSelected ? 'selected' : ''} ${isBestValue ? 'best-value' : ''}`}
              onClick={() => onSelectPackage(pkg)}
            >
              {isBestValue && <div className="best-value-badge">Best Value</div>}
              {pkg.bonusPercentage > 0 && (
                <div className="bonus-badge">+{pkg.bonusPercentage}% Bonus</div>
              )}

              <div className="package-price">{formatPrice(pkg.price)}</div>
              <div className="package-droplets">
                <span className="droplet-icon">💧</span>
                <span className="droplet-amount">{formatDroplets(totalDroplets)}</span>
              </div>

              {pkg.bonusDroplets > 0 && (
                <div className="package-breakdown">
                  <div className="breakdown-line">
                    Base: {formatDroplets(pkg.baseDroplets)} 💧
                  </div>
                  <div className="breakdown-line bonus">
                    Bonus: +{formatDroplets(pkg.bonusDroplets)} 💧
                  </div>
                </div>
              )}

              <div className="package-description">{pkg.description}</div>

              <button
                className={`select-package-btn ${isSelected ? 'selected' : ''}`}
                disabled={isSelected}
              >
                {isSelected ? 'Selected' : 'Select'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

PackageSelector.propTypes = {
  onSelectPackage: PropTypes.func.isRequired,
  selectedPackageId: PropTypes.string,
};

export default PackageSelector;
