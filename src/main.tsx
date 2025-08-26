import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { store } from './app/store';
import { setDispatch } from './utils/setStore';
import { Provider } from 'react-redux';

import './i18.ts';

setDispatch(store.dispatch, store.getState);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
    <App />
    </Provider>
  </StrictMode>,
)
