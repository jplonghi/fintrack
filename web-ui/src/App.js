import React, { useEffect, useState } from 'react';
import './App.css';
import ExpensesList from './components/ExpensesList';
import BudgetProcess from './components/BudgetProgress';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
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

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/expenses')
      .then(response => {
        const expenses = response.data;
        const totalCRC = expenses
          .filter(expense => expense.currency === 'CRC')
          .reduce((sum, expense) => sum + expense.amount, 0);
        const totalUSD = expenses
          .filter(expense => expense.currency === 'USD')
          .reduce((sum, expense) => sum + expense.amount, 0);
        setTotals({ CRC: totalCRC, USD: totalUSD });
      })
      .catch(error => {
        console.error('Error fetching totals:', error);
      });
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
          }}>
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
            <BudgetProcess />
          </div>
          <div style={{ flex: 2 }}>
            <ExpensesList />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
