import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import './theme/global-theme.css';

const theme = {
  token: {
    colorPrimary: '#5b4b8a',
    colorPrimaryHover: '#4a3d72',
    colorPrimaryActive: '#3d3360',
    colorLink: '#5b4b8a',
    colorLinkHover: '#4a3d72',
    borderRadius: 8,
    fontFamily: 'var(--font-family)',
    controlOutline: 'rgba(91, 75, 138, 0.15)',
  },
  components: {
    Button: {
      primaryShadow: 'none',
      fontWeight: 600,
      contentFontSizeLG: 14,
      paddingBlockLG: 10,
      paddingInlineLG: 20,
    },
    Input: {
      activeBorderColor: '#5b4b8a',
      hoverBorderColor: '#5b4b8a',
      activeShadow: '0 0 0 2px rgba(91, 75, 138, 0.12)',
      paddingBlockLG: 10,
      paddingInlineLG: 14,
      borderRadius: 8,
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
