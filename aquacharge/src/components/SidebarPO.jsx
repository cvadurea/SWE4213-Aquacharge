import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailIcon from '@mui/icons-material/Mail';

const drawerWidth = 250;

export default function SidebarPO() {
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
            <ListItemButton>
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
              onClick={text === 'Logout' ? () => {
                localStorage.removeItem('user');
                window.location.href = '/login';
              } : undefined}
            >
              <ListItemText
                primary={text}
                slotProps={{ primary: { sx: text === 'Logout' ? { color: 'error.main' } : {} } }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>s
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
