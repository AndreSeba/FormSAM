import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import PurchaseForm from './components/PurchaseForm'
import AdminPanel from './components/AdminPanel'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PurchaseForm />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  )
}

export default App