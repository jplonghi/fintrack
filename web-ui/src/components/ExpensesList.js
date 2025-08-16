import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    CircularProgress,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    ListItemText,
    OutlinedInput,
    Box,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormLabel,
    Snackbar,
    Alert
} from '@mui/material';

const ExpensesList = ({ selectedPeriod, onTotalsChange, refreshTrigger }) => {
    const [expenses, setExpenses] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState({});
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);
    
    // Dialog states
    const [openDialog, setOpenDialog] = useState(false);
    const [newExpense, setNewExpense] = useState({
        date: new Date().toISOString().slice(0, 10),
        description: '',
        amount: '',
        currency: 'CRC',
        category: '',
        period: ''
    });
    const [dialogLoading, setDialogLoading] = useState(false);
    
    // Import dialog states
    const [openImportDialog, setOpenImportDialog] = useState(false);
    const [importText, setImportText] = useState('');
    const [importLoading, setImportLoading] = useState(false);
    
    // Notification states
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    
    // Notification helper functions
    const showNotification = (message, severity = 'success') => {
        setNotification({
            open: true,
            message,
            severity
        });
    };

    const hideNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    // Fetch rules from the backend for the selected period
    useEffect(() => {
        if (!selectedPeriod) return;
        
        axios.get(`http://127.0.0.1:8000/rules/${selectedPeriod}`)
            .then(response => {
                const rulesMap = response.data.rules.reduce((acc, rule) => {
                    acc[rule.name] = rule.colors || {};
                    return acc;
                }, {});
                setRules(rulesMap);
            })
            .catch(error => {
                console.error('Error fetching rules:', error);
            });
    }, [selectedPeriod]);

    // Fetch available categories from the backend
    useEffect(() => {
        axios.get('http://127.0.0.1:8000/categories')
            .then(response => {
                const categories = ['N/A', ...response.data.categories];
                setAvailableCategories(categories);
            })
            .catch(error => {
                console.error('Error fetching categories:', error);
            });
    }, []);

    // Fetch expenses from the backend based on selected period
    useEffect(() => {
        if (!selectedPeriod) return;
        
        setLoading(true);
        const url = `http://127.0.0.1:8000/expenses?period=${selectedPeriod}`;
        
        axios.get(url)
            .then(response => {
                // Sort expenses by date (most recent first)
                const sortedExpenses = response.data.sort((a, b) => 
                    new Date(b.date) - new Date(a.date)
                );
                
                setExpenses(sortedExpenses);
                setFilteredExpenses(sortedExpenses);
                setLoading(false);
            })
            .catch(error => {
                console.error('There was an error fetching the expenses!', error);
                setLoading(false);
            });
    }, [selectedPeriod]);

    // Refresh expenses when refreshTrigger changes (after recalculation)
    useEffect(() => {
        if (!selectedPeriod || refreshTrigger === 0) return;
        
        const url = `http://127.0.0.1:8000/expenses?period=${selectedPeriod}`;
        
        axios.get(url)
            .then(response => {
                // Sort expenses by date (most recent first)
                const sortedExpenses = response.data.sort((a, b) => 
                    new Date(b.date) - new Date(a.date)
                );
                
                setExpenses(sortedExpenses);
                setFilteredExpenses(sortedExpenses);
            })
            .catch(error => {
                console.error('There was an error refreshing the expenses!', error);
            });
    }, [refreshTrigger, selectedPeriod]);

    // Filter expenses based on selected categories
    useEffect(() => {
        let filtered = expenses;

        // Filter by categories
        if (selectedCategories.length > 0) {
            filtered = filtered.filter(expense => {
                const expenseCategory = expense.category || 'N/A';
                return selectedCategories.includes(expenseCategory);
            });
        }

        // Sort filtered expenses by date (most recent first)
        filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        setFilteredExpenses(filtered);
    }, [expenses, selectedCategories]);

    // Calculate and send totals whenever filtered expenses change
    useEffect(() => {
        const totalCRC = filteredExpenses
            .filter(expense => expense.currency === 'CRC')
            .reduce((sum, expense) => sum + expense.amount, 0);
        const totalUSD = filteredExpenses
            .filter(expense => expense.currency === 'USD')
            .reduce((sum, expense) => sum + expense.amount, 0);
        
        if (onTotalsChange) {
            onTotalsChange({ CRC: totalCRC, USD: totalUSD });
        }
    }, [filteredExpenses, onTotalsChange]);

    const handleCategoryChange = (event) => {
        const value = event.target.value;
        setSelectedCategories(typeof value === 'string' ? value.split(',') : value);
    };

    const clearFilters = () => {
        setSelectedCategories([]);
    };

    const handleOpenDialog = () => {
        setOpenDialog(true);
        // Reset form with current selected period
        setNewExpense({
            date: new Date().toISOString().slice(0, 10),
            description: '',
            amount: '',
            currency: 'CRC',
            category: '',
            period: selectedPeriod || new Date().toISOString().slice(0, 7) // Use selected period or current YYYY-MM
        });
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleExpenseChange = (field, value) => {
        setNewExpense(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddExpense = async () => {
        // Validate form
        if (!newExpense.date || !newExpense.description || !newExpense.amount || !newExpense.category || !newExpense.period) {
            showNotification('Please fill in all fields', 'warning');
            return;
        }

        setDialogLoading(true);
        try {
            const expenseData = {
                date: new Date(newExpense.date).toISOString(),
                description: newExpense.description,
                amount: parseFloat(newExpense.amount),
                currency: newExpense.currency,
                category: newExpense.category,
                period: newExpense.period
            };

            await axios.post('http://127.0.0.1:8000/expenses', expenseData);
            
            // Refresh expenses list
            const url = `http://127.0.0.1:8000/expenses?period=${selectedPeriod}`;
            const response = await axios.get(url);
            
            // Sort expenses by date (most recent first)
            const sortedExpenses = response.data.sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            );
            
            setExpenses(sortedExpenses);
            setFilteredExpenses(sortedExpenses);
            
            showNotification('Expense added successfully!', 'success');
            handleCloseDialog();
        } catch (error) {
            console.error('Error adding expense:', error);
            showNotification('Error adding expense. Please try again.', 'error');
        } finally {
            setDialogLoading(false);
        }
    };

    const handleOpenImportDialog = () => {
        setOpenImportDialog(true);
        setImportText('');
    };

    const handleCloseImportDialog = () => {
        setOpenImportDialog(false);
        setImportText('');
    };

    const handleImportExpenses = async () => {
        if (!importText.trim()) {
            showNotification('Please paste some text to import', 'warning');
            return;
        }

        if (!selectedPeriod) {
            showNotification('Please select a period first', 'warning');
            return;
        }

        setImportLoading(true);
        try {
            // Convert text to base64
            const base64Text = btoa(unescape(encodeURIComponent(importText)));
            
            const importData = {
                period_identifier: selectedPeriod,
                raw_text: base64Text
            };

            const response = await axios.post('http://127.0.0.1:8000/import', importData);
            
            // Refresh expenses list
            const url = `http://127.0.0.1:8000/expenses?period=${selectedPeriod}`;
            const expensesResponse = await axios.get(url);
            
            // Sort expenses by date (most recent first)
            const sortedExpenses = expensesResponse.data.sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            );
            
            setExpenses(sortedExpenses);
            setFilteredExpenses(sortedExpenses);
            
            showNotification(response.data.message || 'Expenses imported successfully!', 'success');
            handleCloseImportDialog();
        } catch (error) {
            console.error('Error importing expenses:', error);
            showNotification('Error importing expenses. Please check the format and try again.', 'error');
        } finally {
            setImportLoading(false);
        }
    };

    return (
        <div style={{
            padding: '5px',
            borderRadius: '5px',
            border: '1px solid #a970ff',
            height: '60vh', // Full vertical height
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
            }}>
                <h2 style={{
                    color: '#ffffff',
                    fontFamily: 'Space Grotesk',
                    fontSize: '2rem',
                    margin: '0',
                }}>Expenses</h2>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button
                        onClick={handleOpenImportDialog}
                        style={{
                            backgroundColor: 'transparent',
                            color: '#a970ff',
                            border: '1px solid #a970ff',
                            minWidth: '80px',
                            height: '40px',
                            fontSize: '0.875rem',
                            fontWeight: 'bold'
                        }}
                        title="Import Expenses"
                    >
                        Import
                    </Button>
                    
                    <Button
                        onClick={handleOpenDialog}
                        style={{
                            backgroundColor: '#a970ff',
                            color: '#ffffff',
                            border: '1px solid #a970ff',
                            minWidth: '80px',
                            height: '40px',
                            fontSize: '0.875rem',
                            fontWeight: 'bold'
                        }}
                        title="Add New Expense"
                    >
                        ADD
                    </Button>
                </div>
            </div>
          
          {/* Filters */}
          <Box style={{ 
              display: 'flex', 
              gap: '15px', 
              marginBottom: '15px', 
              flexWrap: 'wrap',
              alignItems: 'center'
          }}>
              {/* Category Filter */}
              <FormControl size="small" style={{ minWidth: 200 }}>
                  <InputLabel style={{ color: '#a970ff' }}>Categories</InputLabel>
                  <Select
                      multiple
                      value={selectedCategories}
                      onChange={handleCategoryChange}
                      input={<OutlinedInput label="Categories" />}
                      renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                  <Chip 
                                      key={value} 
                                      label={value} 
                                      size="small" 
                                      style={{ 
                                          backgroundColor: '#a970ff', 
                                          color: '#ffffff',
                                          fontSize: '0.75rem'
                                      }} 
                                  />
                              ))}
                          </Box>
                      )}
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
                      {availableCategories.map((category) => (
                          <MenuItem key={category} value={category}>
                              <Checkbox 
                                  checked={selectedCategories.indexOf(category) > -1} 
                                  style={{ color: '#a970ff' }}
                              />
                              <ListItemText primary={category} />
                          </MenuItem>
                      ))}
                  </Select>
              </FormControl>

              {/* Clear Filters Button */}
              {selectedCategories.length > 0 && (
                  <button
                      onClick={clearFilters}
                      style={{
                          backgroundColor: 'transparent',
                          border: '1px solid #a970ff',
                          color: '#a970ff',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                      }}
                  >
                      Clear Filters
                  </button>
              )}
          </Box>
            {loading ? (
                <CircularProgress style={{ color: '#a970ff', margin: 'auto' }} />
            ) : (
                <TableContainer style={{ flex: 1, overflowY: 'auto'}}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ 
                                    color: '#a970ff', 
                                    fontWeight: 'bold',
                                    backgroundColor: '#1a1a1a',
                                    borderBottom: '2px solid #a970ff'
                                }}>Date</TableCell>
                                <TableCell style={{ 
                                    color: '#a970ff', 
                                    fontWeight: 'bold',
                                    backgroundColor: '#1a1a1a',
                                    borderBottom: '2px solid #a970ff'
                                }}>Description</TableCell>
                                <TableCell style={{ 
                                    color: '#a970ff', 
                                    fontWeight: 'bold',
                                    backgroundColor: '#1a1a1a',
                                    borderBottom: '2px solid #a970ff'
                                }}>Period</TableCell>
                                <TableCell style={{ 
                                    color: '#a970ff', 
                                    fontWeight: 'bold',
                                    backgroundColor: '#1a1a1a',
                                    borderBottom: '2px solid #a970ff'
                                }}>Colones</TableCell>
                                <TableCell style={{ 
                                    color: '#a970ff', 
                                    fontWeight: 'bold',
                                    backgroundColor: '#1a1a1a',
                                    borderBottom: '2px solid #a970ff'
                                }}>Dolares</TableCell>
                                <TableCell style={{ 
                                    color: '#a970ff', 
                                    fontWeight: 'bold',
                                    backgroundColor: '#1a1a1a',
                                    borderBottom: '2px solid #a970ff'
                                }}>Category</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredExpenses.map((expense) => {
                                const ruleColors = rules[expense.category] || {};
                                const textColor = ruleColors.text || '#ffffff'; // Use rule's text color if defined
                                const hasCustomColor = !!ruleColors.text; // Check if a custom color is applied
                                
                                // Format date as "14 Aug" with purple day and month
                                const formatDate = (dateString) => {
                                    const date = new Date(dateString);
                                    const day = date.getDate();
                                    const month = date.toLocaleDateString('en-US', { month: 'short' });
                                    
                                    return { day, month };
                                };
                                
                                const { day, month } = formatDate(expense.date);
                                
                                return (
                                    <TableRow key={expense._id}>
                                        <TableCell style={{ color: '#ffffff' }}>
                                            <span>
                                                <span style={{ color: '#a970ff' }}>{day} {month}</span>
                                            </span>
                                        </TableCell>
                                        <TableCell style={{ color: '#ffffff' }}>{expense.description}</TableCell>
                                        <TableCell style={{ color: '#ffffff' }}>
                                            {expense.period || new Date(expense.date).toISOString().slice(0, 7)}
                                        </TableCell>
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
            
            {/* Add Expense Dialog */}
            <Dialog 
                open={openDialog} 
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    style: {
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #a970ff'
                    }
                }}
            >
                <DialogTitle style={{ color: '#ffffff', borderBottom: '1px solid #a970ff' }}>
                    Add New Expense
                </DialogTitle>
                <DialogContent style={{ padding: '20px' }}>
                    <Box style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                        {/* Date Field */}
                        <TextField
                            label="Date"
                            type="date"
                            value={newExpense.date}
                            onChange={(e) => handleExpenseChange('date', e.target.value)}
                            InputLabelProps={{
                                shrink: true,
                                style: { color: '#a970ff' }
                            }}
                            InputProps={{
                                style: { color: '#ffffff' }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                },
                            }}
                            fullWidth
                        />
                        
                        {/* Description Field */}
                        <TextField
                            label="Description"
                            value={newExpense.description}
                            onChange={(e) => handleExpenseChange('description', e.target.value)}
                            InputLabelProps={{
                                style: { color: '#a970ff' }
                            }}
                            InputProps={{
                                style: { color: '#ffffff' }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                },
                            }}
                            fullWidth
                        />
                        
                        {/* Period Field */}
                        <TextField
                            label="Period (YYYY-MM)"
                            value={newExpense.period}
                            onChange={(e) => handleExpenseChange('period', e.target.value)}
                            placeholder="e.g., 2025-08"
                            InputLabelProps={{
                                style: { color: '#a970ff' }
                            }}
                            InputProps={{
                                style: { color: '#ffffff' }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                },
                            }}
                            fullWidth
                        />
                        
                        {/* Amount Field */}
                        <TextField
                            label="Amount"
                            type="number"
                            value={newExpense.amount}
                            onChange={(e) => handleExpenseChange('amount', e.target.value)}
                            InputLabelProps={{
                                style: { color: '#a970ff' }
                            }}
                            InputProps={{
                                style: { color: '#ffffff' }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                },
                            }}
                            fullWidth
                        />
                        
                        {/* Currency Selection */}
                        <FormControl component="fieldset">
                            <FormLabel component="legend" style={{ color: '#a970ff', marginBottom: '10px' }}>
                                Currency
                            </FormLabel>
                            <RadioGroup
                                row
                                value={newExpense.currency}
                                onChange={(e) => handleExpenseChange('currency', e.target.value)}
                            >
                                <FormControlLabel
                                    value="CRC"
                                    control={<Radio style={{ color: '#a970ff' }} />}
                                    label={<span style={{ color: '#ffffff' }}>₡ Colones</span>}
                                />
                                <FormControlLabel
                                    value="USD"
                                    control={<Radio style={{ color: '#a970ff' }} />}
                                    label={<span style={{ color: '#ffffff' }}>$ Dollars</span>}
                                />
                            </RadioGroup>
                        </FormControl>
                        
                        {/* Category Selection */}
                        <FormControl fullWidth>
                            <InputLabel style={{ color: '#a970ff' }}>Category</InputLabel>
                            <Select
                                value={newExpense.category}
                                onChange={(e) => handleExpenseChange('category', e.target.value)}
                                input={<OutlinedInput label="Category" />}
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
                                {availableCategories.filter(cat => cat !== 'N/A').map((category) => (
                                    <MenuItem key={category} value={category}>
                                        {category}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions style={{ padding: '20px', borderTop: '1px solid #a970ff' }}>
                    <Button 
                        onClick={handleCloseDialog}
                        style={{ 
                            color: '#a970ff',
                            border: '1px solid #a970ff'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAddExpense}
                        disabled={dialogLoading}
                        style={{ 
                            backgroundColor: '#a970ff',
                            color: '#ffffff'
                        }}
                    >
                        {dialogLoading ? 'Adding...' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Import Expenses Dialog */}
            <Dialog 
                open={openImportDialog} 
                onClose={handleCloseImportDialog}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    style: {
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #a970ff'
                    }
                }}
            >
                <DialogTitle style={{ color: '#ffffff', borderBottom: '1px solid #a970ff' }}>
                    Import Expenses for Period: {selectedPeriod}
                </DialogTitle>
                <DialogContent style={{ padding: '20px' }}>
                    <Box style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                        <div style={{ color: '#a970ff', fontSize: '0.9rem' }}>
                            <p>Paste your bank statement or expense data below. The text will be automatically converted to the required format.</p>
                            <p><strong>Format example:</strong> Date, Description, Amount, Currency (tab-separated)</p>
                        </div>
                        
                        <TextField
                            label="Expense Data"
                            multiline
                            rows={12}
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder="Paste your expense data here...
Example:
26/07/2025	CITYMALL COMPASS	3,000.00 CRC
27/07/2025	CENTRO DE CONVENCIONES COMPASS	1,700.00 CRC
..."
                            InputLabelProps={{
                                style: { color: '#a970ff' }
                            }}
                            InputProps={{
                                style: { 
                                    color: '#ffffff',
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem'
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#a970ff',
                                    },
                                },
                            }}
                            fullWidth
                        />
                        
                        {importText && (
                            <div style={{ 
                                color: '#a970ff', 
                                fontSize: '0.8rem', 
                                backgroundColor: 'rgba(169, 112, 255, 0.1)',
                                padding: '10px',
                                borderRadius: '5px',
                                border: '1px dashed #a970ff'
                            }}>
                                <strong>Preview:</strong> {importText.split('\n').length} lines detected
                            </div>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions style={{ padding: '20px', borderTop: '1px solid #a970ff' }}>
                    <Button 
                        onClick={handleCloseImportDialog}
                        style={{ 
                            color: '#a970ff',
                            border: '1px solid #a970ff'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleImportExpenses}
                        disabled={importLoading || !importText.trim()}
                        style={{ 
                            backgroundColor: '#a970ff',
                            color: '#ffffff'
                        }}
                    >
                        {importLoading ? 'Importing...' : 'Import'}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Notification Snackbar */}
            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={hideNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    onClose={hideNotification} 
                    severity={notification.severity}
                    sx={{ width: '100%' }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default ExpensesList;