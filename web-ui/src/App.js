import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import ExpensesList from './components/ExpensesList';
import BudgetProcess from './components/BudgetProgress';
import { ThemeProvider, createTheme, CssBaseline, FormControl, Select, MenuItem, OutlinedInput } from '@mui/material';
import axios from 'axios';

const darkTheme = createTheme({
  typography: {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    h1: {
      fontWeight: 'bold',
      fontSize: '3rem',
    },
    h4: {
      fontWeight: 'bold',
      fontSize: '1.5rem',
    },
  },
  palette: {
    mode: 'dark',
    background: {
    },
    text: {
      primary: '#ffffff',
    },
    primary: {
      main: '#a970ff',
    },
  },
});

function App() {
  const [totals, setTotals] = useState({ CRC: 0, USD: 0 });
  const [selectedPeriod, setSelectedPeriod] = useState('2025-08'); // Default to current period
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger

  // Fetch available periods
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/periods')
      .then(response => {
        const periods = response.data.periods;
        
        setAvailablePeriods(periods);
        
        // Only update selectedPeriod if current one is not in available periods
        if (periods.length > 0 && !periods.includes(selectedPeriod)) {
          setSelectedPeriod(periods[0]);
        }
      })
      .catch(error => {
        console.error('Error fetching periods:', error);
      });
  }, []); // Keep empty dependency array

  // Fetch totals based on selected period
  useEffect(() => {
    // Remove this effect since totals will come from ExpensesList
  }, []);

  const handleTotalsChange = useCallback((newTotals) => {
    setTotals(newTotals);
  }, []);

  const handlePeriodChange = useCallback((event) => {
    setSelectedPeriod(event.target.value);
  }, []);

  // Function to trigger refresh in ExpensesList
  const triggerExpensesRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{
            color: '#ffffff',
            fontFamily: 'Space Grotesk',
            fontWeight: '700',
            textTransform: 'none',
            fontSize: '4rem',
          }}>
            Build. Track. Save.
          </h1>
          <div style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
          }}>
            {/* Period Selector */}
            <div style={{
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #a970ff',
              minWidth: '200px',
              textAlign: 'center',
            }}>
              <h3 style={{ color: '#a970ff', marginBottom: '10px', fontSize: '1.2rem' }}>Period</h3>
              <FormControl size="small" fullWidth>
                <Select
                  value={selectedPeriod}
                  onChange={handlePeriodChange}
                  input={<OutlinedInput />}
                  style={{ color: '#ffffff' }}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#a970ff',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#a970ff',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#a970ff',
                    },
                  }}
                >
                  {availablePeriods.map((period) => (
                    <MenuItem key={period} value={period}>
                      {period}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            
            {/* Total Cards */}
            <div style={{
              color: '#ffffff',
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #a970ff',
              width: '200px',
              textAlign: 'center',
            }}>
              <h3 style={{ color: '#a970ff', marginBottom: '10px', fontSize: '3rem' }}>₡</h3>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                {totals.CRC.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' })}
              </p>
            </div>
            <div style={{
              color: '#ffffff',
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #a970ff',
              width: '200px',
              textAlign: 'center',
            }}>
              <h3 style={{ color: '#a970ff', marginBottom: '10px', fontSize: '3rem' }}>$</h3>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                {totals.USD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: '40px' }}>
          <div style={{ flex: 1, marginRight: '20px' }}>
            <BudgetProcess selectedPeriod={selectedPeriod} onRecalculate={triggerExpensesRefresh} />
          </div>
          <div style={{ flex: 2 }}>
            <ExpensesList selectedPeriod={selectedPeriod} onTotalsChange={handleTotalsChange} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
