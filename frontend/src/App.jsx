import React from 'react';
import Pet from './components/Pet';

const App = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#f0f0f0' }}>
      <h1 style={{ position: 'absolute', top: '20px', left: '20px', margin: 0 }}>Mitthu - Desktop Pet</h1>
      <p style={{ position: 'absolute', top: '100px', left: '20px' }}>Type anywhere or move your mouse to interact!</p>
      <Pet />
    </div>
  );
};

export default App;
