import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const RecordPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [soldRecords, setSoldRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSalesAndItems();
  }, []);

  const fetchSalesAndItems = async () => {
    try {
      const itemsResponse = await fetch('/api/items');
      if (!itemsResponse.ok) throw new Error('Failed to fetch items');
      const itemsData = await itemsResponse.json();

      const salesResponse = await fetch('http://localhost:5000/api/sales');
      if (!salesResponse.ok) throw new Error('Failed to fetch sales');
      const salesData = await salesResponse.json();

      const soldItems = processSoldItems(salesData, itemsData);
      setSoldRecords(soldItems);
      setItems(itemsData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const processSoldItems = (salesData, itemsData) => {
    const soldRecords = {};
    const itemMap = {};
    itemsData.forEach(item => {
      itemMap[item.item_name] = {
        variant_prices: item.variant_prices || {},
        variant_quantities: item.variant_quantities || {},
        addons: item.addons || [],
        combos: item.combos || []
      };
    });

    salesData.forEach(sale => {
      sale.items.forEach(item => {
        const itemKey = `${item.item_name}`;
        const size = item.selectedSize || 'M';
        
        if (!soldRecords[itemKey]) {
          const itemDetails = itemMap[item.item_name] || {};
          soldRecords[itemKey] = {
            name: item.item_name,
            type: 'Item',
            sizes: {
              S: {
                price: itemDetails.variant_prices?.small_price || 0,
                pieces: itemDetails.variant_quantities?.small_quantity || 0,
                sold: 0,
                soldPrice: 0,
                totalPrice: (itemDetails.variant_prices?.small_price || 0) * (itemDetails.variant_quantities?.small_quantity || 0)
              },
              M: {
                price: itemDetails.variant_prices?.medium_price || 0,
                pieces: itemDetails.variant_quantities?.medium_quantity || 0,
                sold: 0,
                soldPrice: 0,
                totalPrice: (itemDetails.variant_prices?.medium_price || 0) * (itemDetails.variant_quantities?.medium_quantity || 0)
              },
              L: {
                price: itemDetails.variant_prices?.large_price || 0,
                pieces: itemDetails.variant_quantities?.large_quantity || 0,
                sold: 0,
                soldPrice: 0,
                totalPrice: (itemDetails.variant_prices?.large_price || 0) * (itemDetails.variant_quantities?.large_quantity || 0)
              }
            }
          };
        }
        
        soldRecords[itemKey].sizes[size].sold += item.quantity;
        // Use the price from sizes object instead of basePrice
        soldRecords[itemKey].sizes[size].soldPrice = soldRecords[itemKey].sizes[size].price * soldRecords[itemKey].sizes[size].sold;

        if (item.addons && item.addons.length > 0) {
          item.addons.forEach(addon => {
            if (addon.addon_quantity > 0) {
              const addonKey = `${addon.addon_name}`;
              const addonSize = addon.size || 'M';
              
              if (!soldRecords[addonKey]) {
                const itemDetails = itemMap[item.item_name];
                const addonDetails = itemDetails?.addons?.find(a => a.name1 === addon.addon_name) || {};
                soldRecords[addonKey] = {
                  name: addon.addon_name,
                  type: 'Addon',
                  sizes: {
                    S: {
                      price: addonDetails.variant_prices?.small_price || 0,
                      pieces: addonDetails.variant_quantities?.small_quantity || 0,
                      sold: 0,
                      soldPrice: 0,
                      totalPrice: (addonDetails.variant_prices?.small_price || 0) * (addonDetails.variant_quantities?.small_quantity || 0)
                    },
                    M: {
                      price: addonDetails.variant_prices?.medium_price || 0,
                      pieces: addonDetails.variant_quantities?.medium_quantity || 0,
                      sold: 0,
                      soldPrice: 0,
                      totalPrice: (addonDetails.variant_prices?.medium_price || 0) * (addonDetails.variant_quantities?.medium_quantity || 0)
                    },
                    L: {
                      price: addonDetails.variant_prices?.large_price || 0,
                      pieces: addonDetails.variant_quantities?.large_quantity || 0,
                      sold: 0,
                      soldPrice: 0,
                      totalPrice: (addonDetails.variant_prices?.large_price || 0) * (addonDetails.variant_quantities?.large_quantity || 0)
                    }
                  }
                };
              }
              soldRecords[addonKey].sizes[addonSize].sold += addon.addon_quantity;
              // Use the price from sizes object for addons
              soldRecords[addonKey].sizes[addonSize].soldPrice = soldRecords[addonKey].sizes[addonSize].price * soldRecords[addonKey].sizes[addonSize].sold;
            }
          });
        }

        if (item.selectedCombos && item.selectedCombos.length > 0) {
          item.selectedCombos.forEach(combo => {
            const comboKey = `${combo.name1}`;
            const comboSize = combo.size || 'M';
            
            if (!soldRecords[comboKey]) {
              const itemDetails = itemMap[item.item_name];
              const comboDetails = itemDetails?.combos?.find(c => c.name1 === combo.name1) || {};
              soldRecords[comboKey] = {
                name: combo.name1,
                type: 'Combo',
                sizes: {
                  S: {
                    price: comboDetails.variant_prices?.small_price || 0,
                    pieces: comboDetails.variant_quantities?.small_quantity || 0,
                    sold: 0,
                    soldPrice: 0,
                    totalPrice: (comboDetails.variant_prices?.small_price || 0) * (comboDetails.variant_quantities?.small_quantity || 0)
                  },
                  M: {
                    price: comboDetails.variant_prices?.medium_price || 0,
                    pieces: comboDetails.variant_quantities?.medium_quantity || 0,
                    sold: 0,
                    soldPrice: 0,
                    totalPrice: (comboDetails.variant_prices?.medium_price || 0) * (comboDetails.variant_quantities?.medium_quantity || 0)
                  },
                  L: {
                    price: comboDetails.variant_prices?.large_price || 0,
                    pieces: comboDetails.variant_quantities?.large_quantity || 0,
                    sold: 0,
                    soldPrice: 0,
                    totalPrice: (comboDetails.variant_prices?.large_price || 0) * (comboDetails.variant_quantities?.large_quantity || 0)
                  }
                }
              };
            }
            soldRecords[comboKey].sizes[comboSize].sold += 1;
            // Use the price from sizes object for combos
            soldRecords[comboKey].sizes[comboSize].soldPrice = soldRecords[comboKey].sizes[comboSize].price * soldRecords[comboKey].sizes[comboSize].sold;
          });
        }
      });
    });

    return Object.fromEntries(
      Object.entries(soldRecords).filter(([_, record]) => 
        record.sizes.S.sold > 0 || record.sizes.M.sold > 0 || record.sizes.L.sold > 0
      )
    );
  };

  const renderSoldRow = (record, key) => {
    return (
      <tr key={key} style={{ borderBottom: '1px solid #dee2e6' }}>
        <td style={{ padding: '12px', border: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>{`${record.type}: ${record.name}`}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{record.sizes.S.price || 0}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{record.sizes.S.pieces || 0}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{record.sizes.S.totalPrice.toFixed(2)}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6', backgroundColor: '#e6ffe6', fontWeight: 'bold' }}>{record.sizes.S.sold || 0}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6', backgroundColor: '#ccffcc', fontWeight: 'bold' }}>{record.sizes.S.soldPrice.toFixed(2)}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{record.sizes.M.price || 0}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{record.sizes.M.pieces || 0}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{record.sizes.M.totalPrice.toFixed(2)}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6', backgroundColor: '#e6ffe6', fontWeight: 'bold' }}>{record.sizes.M.sold || 0}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6', backgroundColor: '#ccffcc', fontWeight: 'bold' }}>{record.sizes.M.soldPrice.toFixed(2)}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{record.sizes.L.price || 0}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{record.sizes.L.pieces || 0}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{record.sizes.L.totalPrice.toFixed(2)}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6', backgroundColor: '#e6ffe6', fontWeight: 'bold' }}>{record.sizes.L.sold || 0}</td>
        <td style={{ padding: '12px', border: '1px solid #dee2e6', backgroundColor: '#ccffcc', fontWeight: 'bold' }}>{record.sizes.L.soldPrice.toFixed(2)}</td>
      </tr>
    );
  };

  const handleGoBack = () => {
    navigate('/admin');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '50px' }}>
      <button
        onClick={handleGoBack}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '10px 15px',
          borderRadius: '5px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          fontSize: '16px',
          color: '#212529'
        }}
      >
        <FaArrowLeft style={{ fontSize: '24px', marginRight: '5px', color: '#212529' }} /> Back to Admin
      </button>

      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#343a40', fontSize: '28px', fontWeight: 'bold' }}>
        Sold Items Records
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', fontSize: '18px', color: '#343a40' }}>Loading...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', fontSize: '18px', color: '#dc3545' }}>Error: {error}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#343a40', color: 'white' }}>
              <tr>
                <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>S Price (₹)</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>S Pieces</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>S Total Price</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>S Sold</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>S Sold Price</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>M Price (₹)</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>M Pieces</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>M Total Price</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>M Sold</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>M Sold Price</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>L Price (₹)</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>L Pieces</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>L Total Price</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>L Sold</th>
                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>L Sold Price</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(soldRecords).length > 0 ? (
                Object.entries(soldRecords).map(([key, record]) => renderSoldRow(record, key))
              ) : (
                <tr>
                  <td colSpan="16" style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', color: '#6c757d' }}>
                    No sold items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecordPage;