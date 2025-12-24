import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiClient, type Campaign } from '../lib/api'
import { Trash2, Edit, Mail, Calendar, Clock, Send, Eye, Plus, Loader } from 'lucide-react'

export function CampaignPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getCampaigns()
      setCampaigns(response.data)
    } catch (error) {
      console.error('Failed to load campaigns', error)
      setError('Failed to load campaigns. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      await apiClient.deleteCampaignById(id)
      setCampaigns(prev => prev.filter(campaign => campaign.id !== id))
    } catch (error) {
      console.error('Failed to delete campaign', error)
      alert('Failed to delete campaign')
    }
  }

  const getStatusColor = (status: Campaign['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      sending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    return colors[status]
  }

  const getStatusIcon = (status: Campaign['status']) => {
    const icons = {
      draft: <Edit className='w-4 h-4' />,
      scheduled: <Calendar className='w-4 h-4' />,
      sending: <Clock className='w-4 h-4' />,
      sent: <Send className='w-4 h-4' />,
      failed: <Trash2 className='w-4 h-4' />,
    }
    return icons[status]
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'

      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  const stats = {
    total: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    sent: campaigns.filter(c => c.status === 'sent').length,
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Campaigns</h1>
          <p className='text-gray-600 mt-1'>Manage your email campaigns</p>
        </div>

        <Link
          to='/campaigns/new'
          className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        >
          <Plus className='w-4 h-4' />
          New Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-white p-4 rounded-lg border border-gray-200'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-600'>Total Campaigns</p>
              <p className='text-2xl font-bold mt-1'>{stats.total}</p>
            </div>
            <Mail className='w-8 h-8 text-gray-400' />
          </div>
        </div>

        <div className='bg-white p-4 rounded-lg border border-gray-200'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-600'>Drafts</p>
              <p className='text-2xl font-bold mt-1'>{stats.draft}</p>
            </div>
            <Edit className='w-8 h-8 text-gray-400' />
          </div>
        </div>

        <div className='bg-white p-4 rounded-lg border border-gray-200'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-600'>Scheduled</p>
              <p className='text-2xl font-bold mt-1'>{stats.scheduled}</p>
            </div>
            <Calendar className='w-8 h-8 text-gray-400' />
          </div>
        </div>

        <div className='bg-white p-4 rounded-lg border border-gray-200'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-gray-600'>Sent</p>
              <p className='text-2xl font-bold mt-1'>{stats.sent}</p>
            </div>
            <Send className='w-8 h-8 text-gray-400' />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg'>
          {error}
        </div>
      )}

      {/* Campaigns Table */}
      <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  ID
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Subject
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Scheduled
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {loading ? (
                <tr>
                  <td colSpan={5} className='px-6 py-8 text-center'>
                    <div className='flex justify-center items-center'>
                      <Loader className='w-6 h-6 animate-spin text-blue-600 mr-2' />
                      <span className='text-gray-500'>Loading campaigns...</span>
                    </div>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-6 py-8 text-center text-gray-500'>
                    <Mail className='w-12 h-12 mx-auto text-gray-300 mb-3' />
                    <p className='text-lg font-medium'>No campaigns found</p>
                    <p className='mt-1'>Create your first campaign to get started!</p>
                  </td>
                </tr>
              ) : (
                campaigns.map(campaign => (
                  <tr key={campaign.id} className='hover:bg-gray-50 transition-colors'>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                      #{campaign.id}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex flex-col'>
                        <div className='text-sm font-medium text-gray-900'>{campaign.subject}</div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='mr-2'>{getStatusIcon(campaign.status)}</div>
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(campaign.status)}`}
                        >
                          {campaign.status}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {formatDate(campaign.scheduled_at)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <div className='flex items-center gap-2'>
                        <Link
                          to={`/campaigns/${campaign.id}/edit`}
                          className='text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded'
                          title='Edit'
                        >
                          <Edit className='w-4 h-4' />
                        </Link>

                        <Link
                          to={`/campaigns/${campaign.id}/preview`}
                          className='text-purple-600 hover:text-purple-900 p-2 hover:bg-purple-50 rounded'
                          title='Preview'
                        >
                          <Eye className='w-4 h-4' />
                        </Link>

                        <button
                          onClick={() => handleDelete(campaign.id)}
                          className='text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded'
                          title='Delete'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className='bg-blue-50 border border-blue-200 rounded-lg p-6'>
        <h3 className='text-lg font-semibold text-blue-900 mb-2'>Campaign Tips</h3>
        <ul className='list-disc list-inside space-y-2 text-blue-800'>
          <li>Create drafts to save your progress</li>
          <li>Schedule campaigns to send at optimal times</li>
          <li>Use the preview feature to check how emails will look</li>
          <li>Duplicate successful campaigns to save time</li>
        </ul>
      </div>
    </div>
  )
}

export default CampaignPage
