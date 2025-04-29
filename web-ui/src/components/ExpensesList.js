import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress } from '@mui/material';

const ExpensesList = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState({});

    // Fetch rules from the backend
    useEffect(() => {
        axios.get('http://127.0.0.1:8000/rules') // Assuming an endpoint to fetch rules
            .then(response => {
                const rulesMap = response.data.reduce((acc, rule) => {
                    acc[rule.name] = rule.colors || {};
                    return acc;
                }, {});
                setRules(rulesMap);
            })
            .catch(error => {
                console.error('Error fetching rules:', error);
            });
    }, []);

    // Fetch expenses from the backend
    useEffect(() => {
        axios.get('http://127.0.0.1:8000/expenses')
            .then(response => {
                setExpenses(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('There was an error fetching the expenses!', error);
                setLoading(false);
            });
    }, []);

    return (
        <div style={{
            padding: '5px',
            borderRadius: '5px',
            border: '1px solid #a970ff',
            height: '60vh', // Full vertical height
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h2 style={{
            color: '#ffffff',
            fontFamily: 'Space Grotesk',
            fontSize: '2rem',
            margin: '0 0 10px 0',
          }}>Expenses</h2>
            {loading ? (
                <CircularProgress style={{ color: '#a970ff', margin: 'auto' }} />
            ) : (
                <TableContainer style={{ flex: 1, overflowY: 'auto'}}>
                    <Table stickyHeade>
                        <TableHead >
                            <TableRow >
                                <TableCell style={{ color: '#a970ff', fontWeight: 'bold' }}>Date</TableCell>
                                <TableCell style={{ color: '#a970ff', fontWeight: 'bold' }}>Description</TableCell>
                                <TableCell style={{ color: '#a970ff', fontWeight: 'bold' }}>Colones</TableCell>
                                <TableCell style={{ color: '#a970ff', fontWeight: 'bold' }}>Dolares</TableCell>
                                <TableCell style={{ color: '#a970ff', fontWeight: 'bold' }}>Category</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {expenses.map((expense) => {
                                const ruleColors = rules[expense.category] || {};
                                const textColor = ruleColors.text || '#ffffff'; // Use rule's text color if defined
                                const hasCustomColor = !!ruleColors.text; // Check if a custom color is applied
                                return (
                                    <TableRow key={expense._id}>
                                        <TableCell style={{ color: '#ffffff' }}>{new Date(expense.date).toLocaleDateString()}</TableCell>
                                        <TableCell style={{ color: '#ffffff' }}>{expense.description}</TableCell>
                                        <TableCell style={{ color: '#ffffff' }}>
                                            {expense.currency === 'CRC' ? expense.amount.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' }) : ''}
                                        </TableCell>
                                        <TableCell style={{ color: '#ffffff' }}>
                                            {expense.currency === 'USD' ? expense.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : ''}
                                        </TableCell>
                                        <TableCell>
                                            <span style={{
                                                display: 'inline-block',
                                                
                                                border: hasCustomColor ? `2px solid ${textColor}` : 'none',
                                                borderRadius: '5px',
                                                padding: '5px 10px',
                                                textAlign: 'center',
                                            }}>
                                                {expense.category || 'N/A'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </div>
    );
};

export default ExpensesList;