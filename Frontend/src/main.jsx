import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import axios from 'axios'
import { store } from './store/store'
import './index.css'
import App from './App.jsx'

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';
axios.defaults.withCredentials = true;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
