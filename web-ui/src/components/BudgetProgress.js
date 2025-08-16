import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { 
    LinearProgress, 
    Typography, 
    Box, 
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    Select,
    MenuItem,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Grid,
    Card,
    CardContent,
    Snackbar,
    Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const BudgetProgress = ({ selectedPeriod, onRecalculate }) => {
  const [budgetData, setBudgetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [recalculateLoading, setRecalculateLoading] = useState(false);
  
  // Notification states
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' // 'success', 'error', 'warning', 'info'
  });
  
  // Budget states
  const [newBudget, setNewBudget] = useState({
    period: '',
    exchangeRate: 600,
    items: []
  });
  
  // Edit budget states
  const [editBudgetItems, setEditBudgetItems] = useState([]);
  const [editExchangeRate, setEditExchangeRate] = useState(600);
  
  const [availableCategories, setAvailableCategories] = useState([]);

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

  useEffect(() => {
    if (!selectedPeriod) return;
    
    setLoading(true);
    setError(null);
    axios.get(`http://127.0.0.1:8000/budget/${selectedPeriod}`)
      .then(response => {
        setBudgetData(response.data.summary);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching budget data:', error);
        if (error.response && error.response.status === 404) {
          setError(`No budget found for period ${selectedPeriod}`);
        } else {
          setError('Error loading budget data');
        }
        setBudgetData([]);
        setLoading(false);
      });
  }, [selectedPeriod]);

  // Fetch available categories from expenses
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/categories')
      .then(response => {
        setAvailableCategories(response.data.categories);
      })
      .catch(error => {
        console.error('Error fetching categories:', error);
      });
  }, []);

  const handleOpenAddDialog = useCallback(async () => {
    try {
      // Fetch the most recent budget as template
      const response = await axios.get('http://127.0.0.1:8000/budgets');
      const budgets = response.data;
      
      if (budgets.length > 0) {
        const mostRecentBudget = budgets[0];
        setNewBudget({
          period: selectedPeriod,
          exchangeRate: mostRecentBudget.exchangeRate || 600,
          items: mostRecentBudget.items.map(item => ({ ...item, tags: item.tags || [] }))
        });
      } else {
        // If no previous budget, create a default one with available categories
        const defaultItems = availableCategories.map(category => ({
          category,
          amount: 50000,
          currency: 'CRC',
          tags: []
        }));
        
        setNewBudget({
          period: selectedPeriod,
          exchangeRate: 600,
          items: defaultItems
        });
      }
      setAddDialogOpen(true);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      // Fallback to default budget
      const defaultItems = availableCategories.map(category => ({
        category,
        amount: 50000,
        currency: 'CRC',
        tags: []
      }));
      setNewBudget({
        period: selectedPeriod,
        exchangeRate: 600,
        items: defaultItems
      });
      setAddDialogOpen(true);
    }
  }, [selectedPeriod, availableCategories]);

  const handleOpenEditDialog = useCallback(async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/budget/${selectedPeriod}/details`);
      setEditBudgetItems(response.data.items.map(item => ({ 
        ...item, 
        tags: item.tags || [] 
      })));
      setEditExchangeRate(response.data.exchangeRate);
      setEditDialogOpen(true);
    } catch (error) {
      console.error('Error fetching budget details:', error);
      showNotification('Error loading budget details.', 'error');
    }
  }, [selectedPeriod]);

  const handleCloseDialogs = useCallback(() => {
    setAddDialogOpen(false);
    setEditDialogOpen(false);
  }, []);

  const handleBudgetChange = useCallback((field, value) => {
    setNewBudget(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleItemChange = useCallback((index, field, value) => {
    setNewBudget(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  const addBudgetItem = useCallback(() => {
    setNewBudget(prev => ({
      ...prev,
      items: [...prev.items, { category: '', amount: 50000, currency: 'CRC', tags: [] }]
    }));
  }, []);

  const removeBudgetItem = useCallback((index) => {
    setNewBudget(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }, []);

  const handleSaveNewBudget = async () => {
    // Validate
    if (!newBudget.period || newBudget.items.length === 0) {
      showNotification('Please fill in all required fields', 'warning');
      return;
    }

    for (const item of newBudget.items) {
      if (!item.category || !item.amount || !item.currency) {
        showNotification('Please fill in all budget item fields', 'warning');
        return;
      }
    }

    setDialogLoading(true);
    try {
      const budgetData = {
        ...newBudget
      };
      
      await axios.post('http://127.0.0.1:8000/budget', budgetData);
      
      // Refresh budget data
      const response = await axios.get(`http://127.0.0.1:8000/budget/${selectedPeriod}`);
      setBudgetData(response.data.summary);
      setError(null);
      
      showNotification('Budget created successfully!', 'success');
      handleCloseDialogs();
    } catch (error) {
      console.error('Error creating budget:', error);
      showNotification('Error creating budget. Please try again.', 'error');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleUpdateBudget = async () => {
    // Validate
    if (editBudgetItems.length === 0) {
      showNotification('Please add at least one budget item', 'warning');
      return;
    }

    for (const item of editBudgetItems) {
      if (!item.category || !item.amount || !item.currency) {
        showNotification('Please fill in all budget item fields', 'warning');
        return;
      }
    }

    setDialogLoading(true);
    try {
      await axios.put(`http://127.0.0.1:8000/budget/${selectedPeriod}`, {
        exchangeRate: editExchangeRate,
        items: editBudgetItems
      });
      
      // Refresh budget data
      const response = await axios.get(`http://127.0.0.1:8000/budget/${selectedPeriod}`);
      setBudgetData(response.data.summary);
      
      showNotification('Budget updated successfully!', 'success');
      handleCloseDialogs();
    } catch (error) {
      console.error('Error updating budget:', error);
      showNotification('Error updating budget. Please try again.', 'error');
    } finally {
      setDialogLoading(false);
    }
  };

  // Edit Budget Helper Functions
  const handleEditBudgetItemChange = (index, field, value) => {
    const updatedItems = [...editBudgetItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditBudgetItems(updatedItems);
  };

  const handleAddEditBudgetItem = () => {
    setEditBudgetItems([...editBudgetItems, { category: '', amount: 0, currency: 'CRC', tags: [] }]);
  };

  const handleRemoveEditBudgetItem = (index) => {
    const updatedItems = editBudgetItems.filter((_, i) => i !== index);
    setEditBudgetItems(updatedItems);
  };

  // Tags Helper Functions
  const handleAddTag = (itemIndex, tag) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && editBudgetItems[itemIndex]) {
      const updatedItems = [...editBudgetItems];
      if (!updatedItems[itemIndex].tags) {
        updatedItems[itemIndex].tags = [];
      }
      if (!updatedItems[itemIndex].tags.includes(trimmedTag)) {
        updatedItems[itemIndex].tags = [...updatedItems[itemIndex].tags, trimmedTag];
        setEditBudgetItems(updatedItems);
      }
    }
  };

  const handleRemoveTag = (itemIndex, tagIndex) => {
    if (editBudgetItems[itemIndex] && editBudgetItems[itemIndex].tags) {
      const updatedItems = [...editBudgetItems];
      updatedItems[itemIndex].tags = updatedItems[itemIndex].tags.filter((_, i) => i !== tagIndex);
      setEditBudgetItems(updatedItems);
    }
  };

  // Recalculate categories based on tags
  const handleRecalculate = async () => {
    if (!selectedPeriod) {
      showNotification('No period selected', 'warning');
      return;
    }

    setRecalculateLoading(true);
    try {
      const response = await axios.post(`http://127.0.0.1:8000/budget/${selectedPeriod}/recalculate`);
      
      // Refresh budget data after recalculation
      const budgetResponse = await axios.get(`http://127.0.0.1:8000/budget/${selectedPeriod}`);
      setBudgetData(budgetResponse.data.summary);
      
      // Trigger expenses refresh in parent component
      if (onRecalculate) {
        onRecalculate();
      }
      
      showNotification(`${response.data.message} (Total expenses: ${response.data.total_expenses})`, 'success');
    } catch (error) {
      console.error('Error recalculating categories:', error);
      if (error.response && error.response.data && error.response.data.detail) {
        showNotification(`Error: ${error.response.data.detail}`, 'error');
      } else {
        showNotification('Error recalculating categories. Please try again.', 'error');
      }
    } finally {
      setRecalculateLoading(false);
    }
  };

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
      ) : error ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          color: '#a970ff',
          backgroundColor: 'rgba(169, 112, 255, 0.1)',
          borderRadius: '5px',
          border: '1px dashed #a970ff'
        }}>
          <Typography style={{ color: '#a970ff', fontSize: '1.1rem', marginBottom: '10px' }}>
            📊 No Budget Available
          </Typography>
          <Typography style={{ color: '#ffffff', fontSize: '0.9rem' }}>
            {error}
          </Typography>
          <Typography style={{ color: '#999', fontSize: '0.8rem', marginTop: '5px' }}>
            Create a budget for this period to track your progress
          </Typography>
          <Button
            onClick={handleOpenAddDialog}
            style={{
              backgroundColor: '#a970ff',
              color: '#ffffff',
              marginTop: '15px',
              padding: '10px 20px',
              fontSize: '0.9rem'
            }}
          >
            Create Budget
          </Button>
        </div>
      ) : budgetData.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          color: '#a970ff',
          backgroundColor: 'rgba(169, 112, 255, 0.1)',
          borderRadius: '5px',
          border: '1px dashed #a970ff'
        }}>
          <Typography style={{ color: '#a970ff', fontSize: '1.1rem', marginBottom: '10px' }}>
            📊 No Budget Data
          </Typography>
          <Typography style={{ color: '#ffffff', fontSize: '0.9rem' }}>
            No budget items found for period {selectedPeriod}
          </Typography>
          <Button
            onClick={handleOpenAddDialog}
            style={{
              backgroundColor: '#a970ff',
              color: '#ffffff',
              marginTop: '15px',
              padding: '10px 20px',
              fontSize: '0.9rem'
            }}
          >
            Create Budget
          </Button>
        </div>
      ) : (
        <div>
          {/* Budget Actions */}
          <Box style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '20px', 
            justifyContent: 'flex-end'
          }}>
            <Button
              onClick={handleRecalculate}
              disabled={recalculateLoading}
              style={{
                backgroundColor: 'transparent',
                color: '#4CAF50',
                border: '1px solid #4CAF50',
                padding: '8px 16px',
                fontSize: '0.8rem'
              }}
            >
              {recalculateLoading ? 'Recalculating...' : 'Recalculate'}
            </Button>
            <Button
              onClick={handleOpenEditDialog}
              style={{
                backgroundColor: 'transparent',
                color: '#a970ff',
                border: '1px solid #a970ff',
                padding: '8px 16px',
                fontSize: '0.8rem'
              }}
            >
              Edit Budget
            </Button>
          </Box>
          
          {/* Budget Data Display */}
          {budgetData.map((item) => {
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
        })}
        </div>
      )}
      
      {/* Add Budget Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={handleCloseDialogs}
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
          Create Budget for Period: {selectedPeriod}
        </DialogTitle>
        <DialogContent style={{ padding: '20px' }}>
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
            {/* Exchange Rate */}
            <TextField
              label="Exchange Rate (USD to CRC)"
              value={newBudget.exchangeRate ? newBudget.exchangeRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/,/g, '');
                handleBudgetChange('exchangeRate', parseFloat(numericValue) || 0);
              }}
              inputProps={{
                inputMode: 'decimal',
                pattern: '[0-9,]*[.]?[0-9]*'
              }}
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
            
            {/* Budget Items */}
            <Typography style={{ color: '#a970ff', fontSize: '1.1rem', fontWeight: 'bold' }}>
              Budget Categories
            </Typography>
            
            <TableContainer style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell style={{ 
                      color: '#a970ff', 
                      fontWeight: 'bold',
                      backgroundColor: '#1a1a1a',
                      borderBottom: '2px solid #a970ff'
                    }}>Category</TableCell>
                    <TableCell style={{ 
                      color: '#a970ff', 
                      fontWeight: 'bold',
                      backgroundColor: '#1a1a1a',
                      borderBottom: '2px solid #a970ff'
                    }}>Amount (CRC)</TableCell>
                    <TableCell style={{ 
                      color: '#a970ff', 
                      fontWeight: 'bold',
                      backgroundColor: '#1a1a1a',
                      borderBottom: '2px solid #a970ff'
                    }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {newBudget.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={item.category}
                            onChange={(e) => handleItemChange(index, 'category', e.target.value)}
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
                                {category}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={item.amount ? item.amount.toLocaleString('en-US') : ''}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/,/g, '');
                            handleItemChange(index, 'amount', parseFloat(numericValue) || 0);
                          }}
                          size="small"
                          inputProps={{
                            inputMode: 'numeric',
                            pattern: '[0-9,]*'
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
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => removeBudgetItem(index)}
                          style={{
                            color: '#ff4500',
                            border: '1px solid #ff4500',
                            minWidth: '40px',
                            padding: '5px'
                          }}
                          size="small"
                        >
                          ✕
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Button
              onClick={addBudgetItem}
              style={{
                backgroundColor: 'transparent',
                color: '#a970ff',
                border: '1px solid #a970ff',
                padding: '10px',
                fontSize: '0.9rem'
              }}
            >
              + Add Category
            </Button>
          </Box>
        </DialogContent>
        <DialogActions style={{ padding: '20px', borderTop: '1px solid #a970ff' }}>
          <Button 
            onClick={handleCloseDialogs}
            style={{ 
              color: '#a970ff',
              border: '1px solid #a970ff'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveNewBudget}
            disabled={dialogLoading}
            style={{ 
              backgroundColor: '#a970ff',
              color: '#ffffff'
            }}
          >
            {dialogLoading ? 'Creating...' : 'Create Budget'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseDialogs}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: '15px',
            border: '2px solid #a970ff'
          }
        }}
      >
        <DialogTitle style={{ 
          backgroundColor: '#a970ff', 
          color: '#ffffff',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          Edit Budget for {selectedPeriod}
        </DialogTitle>
        <DialogContent style={{ padding: '20px' }}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom style={{ color: '#a970ff' }}>
              Budget Items
            </Typography>
            
            {editBudgetItems.map((item, index) => (
              <Card key={index} style={{ marginBottom: '10px', border: '1px solid #a970ff' }}>
                <CardContent style={{ padding: '16px' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Category"
                        value={item.category}
                        onChange={(e) => handleEditBudgetItemChange(index, 'category', e.target.value)}
                        fullWidth
                        size="small"
                        style={{
                          '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                              borderColor: '#a970ff',
                            },
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#a970ff',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Amount (CRC)"
                        value={item.amount ? item.amount.toLocaleString('en-US') : ''}
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(/,/g, '');
                          handleEditBudgetItemChange(index, 'amount', parseFloat(numericValue) || 0);
                        }}
                        fullWidth
                        size="small"
                        inputProps={{
                          inputMode: 'numeric',
                          pattern: '[0-9,]*'
                        }}
                        style={{
                          '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                              borderColor: '#a970ff',
                            },
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#a970ff',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <IconButton 
                        onClick={() => handleRemoveEditBudgetItem(index)}
                        style={{ color: '#ff4444' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" style={{ color: '#a970ff', marginBottom: '8px' }}>
                        Tags
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                        {(item.tags || []).map((tag, tagIndex) => (
                          <Chip
                            key={tagIndex}
                            label={tag}
                            onDelete={() => handleRemoveTag(index, tagIndex)}
                            size="small"
                            style={{ 
                              backgroundColor: '#a970ff20',
                              color: '#a970ff',
                              border: '1px solid #a970ff'
                            }}
                          />
                        ))}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          label="Add Tag"
                          size="small"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddTag(index, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          style={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              '&.Mui-focused fieldset': {
                                borderColor: '#a970ff',
                              },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#a970ff',
                            },
                          }}
                        />
                        <Button
                          onClick={(e) => {
                            const input = e.target.closest('.MuiBox-root').querySelector('input');
                            handleAddTag(index, input.value);
                            input.value = '';
                          }}
                          variant="outlined"
                          size="small"
                          style={{ 
                            color: '#a970ff',
                            borderColor: '#a970ff'
                          }}
                        >
                          Add
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
            
            <Button 
              onClick={handleAddEditBudgetItem}
              startIcon={<AddIcon />}
              style={{ 
                marginTop: '10px',
                color: '#a970ff',
                border: '1px solid #a970ff'
              }}
            >
              Add Budget Item
            </Button>

            <Typography variant="h6" gutterBottom style={{ color: '#a970ff', marginTop: '20px' }}>
              Exchange Rate
            </Typography>
            <TextField
              label="Exchange Rate (USD to CRC)"
              value={editExchangeRate ? editExchangeRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/,/g, '');
                setEditExchangeRate(parseFloat(numericValue) || 0);
              }}
              inputProps={{
                inputMode: 'decimal',
                pattern: '[0-9,]*[.]?[0-9]*'
              }}
              fullWidth
              margin="normal"
              style={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#a970ff',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#a970ff',
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions style={{ padding: '20px', borderTop: '1px solid #a970ff' }}>
          <Button 
            onClick={handleCloseDialogs}
            style={{ 
              color: '#a970ff',
              border: '1px solid #a970ff'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateBudget}
            disabled={dialogLoading}
            style={{ 
              backgroundColor: '#a970ff',
              color: '#ffffff'
            }}
          >
            {dialogLoading ? 'Updating...' : 'Update Budget'}
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

export default BudgetProgress;
