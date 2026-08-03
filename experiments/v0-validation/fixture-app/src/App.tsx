import { Navigate, Route, Routes } from 'react-router-dom';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { InvoiceListPage } from './pages/InvoiceListPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/invoices" replace />} />
      <Route path="/invoices" element={<InvoiceListPage />} />
      <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
    </Routes>
  );
}

export default App;
