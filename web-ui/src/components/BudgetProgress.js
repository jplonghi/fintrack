import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LinearProgress, Typography, Box } from '@mui/material';

const BudgetProgress = () => {
  const [budgetData, setBudgetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const period = "2025-04"; // Replace with dynamic period if needed

  useEffect(() => {
    axios.get(`http://127.0.0.1:8000/budget/${period}`)
      .then(response => {
        setBudgetData(response.data.summary);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching budget data:', error);
        setLoading(false);
      });
  }, [period]);

  return (
    <div style={{
      padding: '5px',
      borderRadius: '5px',
      border: '1px solid #a970ff',
    }}>
      <h2 style={{
        color: '#ffffff',
        fontFamily: 'Space Grotesk',
        fontSize: '2rem',
        margin: '0 0 10px 0',
      }}>Budget Progress</h2>
      {loading ? (
        <Typography style={{ color: '#ffffff' }}>Loading...</Typography>
      ) : (
        budgetData.map((item) => {
          const { category, budget_amount, total_expenses, remaining } = item;
          const isOverBudget = remaining < 0;
          const totalSum = isOverBudget ? total_expenses : budget_amount;
          const consumedPercentage = (Math.min(total_expenses, budget_amount) / totalSum) * 100;
          const overBudgetPercentage = isOverBudget
            ? (Math.abs(remaining) / totalSum) * 100
            : 0;

          return (
            <Box key={category} style={{ marginBottom: '15px' }}>
              <Typography style={{ color: '#ffffff', fontWeight: 'bold' }}>
                {category} - ₡{budget_amount.toLocaleString('es-CR')}
              </Typography>
              <Box style={{ position: 'relative', height: '10px', borderRadius: '5px', backgroundColor: '#444' }}>
                <LinearProgress
                  variant="determinate"
                  value={consumedPercentage} // Cap at 100%
                  style={{
                    height: '10px',
                    borderRadius: '5px',
                  }}
                  sx={{
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#a970ff',
                    },
                  }}
                />
                {isOverBudget && (
                  <Box
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: `${consumedPercentage}%`,
                      height: '10px',
                      width: `${overBudgetPercentage}%`,
                      backgroundColor: '#ff4500',
                      borderRadius: '0 5px 5px 0',
                    }}
                  />
                )}
              </Box>
              <Typography style={{ color: isOverBudget ? '#ff4500' : '#ffffff', fontSize: '0.9rem' }}>
                Consumed: ₡{total_expenses.toLocaleString('es-CR')} | Remaining: ₡{remaining.toLocaleString('es-CR')}
              </Typography>
            </Box>
          );
        })
      )}
    </div>
  );
};

export default BudgetProgress;
