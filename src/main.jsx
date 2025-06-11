import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { PersistGate } from 'redux-persist/integration/react'
import { Provider } from 'react-redux'
import { persistor, store } from './Redux/store.js'



ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode> 
      <PersistGate loading={null} persistor={persistor}>
        <Provider store={store}>
         <App />
        </Provider> 
      </PersistGate>
  </React.StrictMode>,
)