import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';


const drawerWidth = 175;

export default function SidebarPO({ onNavigate, onLogout }) {
  const handleNavigation = (text) => {
    if (text === 'Dashboards' && onNavigate) {
      onNavigate('dashboard');
    }

    if (text === 'Bookings' && onNavigate) {
      onNavigate('bookings');
    }

    if (text === 'My Port' && onNavigate) {
      onNavigate('my-port');
    }

    if (text === 'Profile' && onNavigate) {
      onNavigate('profile');
    }
  };

  const list = (
    <Box
      sx={{ 
        width: drawerWidth,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      role="presentation"
    >
      <List>
        {['Dashboards', 'Bookings', 'My Port'].map((text, index) => (
          <ListItem key={text} disablePadding>
            <ListItemButton onClick={() => handleNavigation(text)}>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        {['Profile', 'Logout'].map((text, index) => (
          <ListItem key={text} disablePadding>
            <ListItemButton
              sx={text === 'Logout' ? { color: 'error.main' } : {}}
              onClick={() => {
                if (text === 'Logout' && onLogout) {
                  onLogout();
                } else if (text === 'Profile') {
                  handleNavigation('Profile');
                }
              }}
            >
              <ListItemText
                primary={text}
                slotProps={{ primary: { sx: text === 'Logout' ? { color: 'error.main' } : {} } }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      {list}
    </Drawer>
  );
}
