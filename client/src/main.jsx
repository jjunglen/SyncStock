import React from "react";
import ReachDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./App.css"
import App from './App.jsx'

ReachDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
