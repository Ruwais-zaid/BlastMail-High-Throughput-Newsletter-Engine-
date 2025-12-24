import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { SubscriberPage } from './pages/SubscriberPage'
import { CampaignPage } from './pages/CampaignPage'
import NewCampaignPage from './pages/NewCampaign'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path='/' element={<DashboardPage />} />
        <Route path='/subscribers' element={<SubscriberPage />} />
        <Route path='/campaigns' element={<CampaignPage />} />
        <Route path='/campaigns/new' element={<NewCampaignPage />} />
      </Routes>
    </Layout>
  )
}
