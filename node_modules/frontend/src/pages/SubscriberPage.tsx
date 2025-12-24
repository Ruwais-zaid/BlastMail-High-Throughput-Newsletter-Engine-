import { useState, useEffect } from 'react'
import { apiClient, type Subscriber } from '../lib/api'
import { Upload, Trash2, Mail, User, Calendar, Download, Search } from 'lucide-react'
import { format, isValid } from 'date-fns'

export function SubscriberPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')

  const loadSubscribers = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getSubscribers(page, limit)
      setSubscribers(response.data)
      setTotal(response.pagination?.total || 0)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load subscribers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscribers()
  }, [page])

  const formatDate = (dateString: string): string => {
    if (!dateString) {
      return 'N/A'
    }

    try {
      const date = new Date(dateString)
      if (isValid(date)) {
        return format(date, 'MMM dd, yyyy')
      }
      return 'N/A'
    } catch {
      return 'N/A'
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }
    try {
      setUploading(true)
      setError(null)
      const result = await apiClient.uploadSubscriber(file)
      if (result.success) {
        alert(
          `${result.message}\n\nInserted: ${result.stats.inserted}\nDuplicates: ${result.stats.duplicateEmail}`
        )
      }
      loadSubscribers()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload Failed')
      console.error('Upload error: ', error)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this Subscriber')) return

    try {
      await apiClient.deleteSubscriber(id)
      setSubscribers(prev => prev.filter(sub => sub.id !== id))
      setTotal(prev => prev - 1)
    } catch (err) {
      alert('Failed to delete Subscriber. Please try again')
      console.error('Delete error: ', err)
    }
  }

  const handleExportCSV = async () => {
    const header = ['ID', 'Email', 'Status', 'Created At']

    const rows = subscribers.map(sub => [sub.id, sub.email, sub.status, formatDate(sub.createdAt)])

    const csvContent = [
      header.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const filteredSubscriber = subscribers.filter(sub => {
    if (search) {
      const searchLower = search.toLowerCase()
      return sub.email.toLowerCase().includes(searchLower)
    }
    return true
  })

  const totalPage = Math.ceil(total / limit)

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Subscribers</h1>
          <p className='text-gray-600 mt-1'>
            {total} Total Subscribers • {subscribers.filter(s => s.status === 'subscribed').length}{' '}
            active
          </p>
        </div>

        <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
            <input
              type='text'
              placeholder='Search Subscribers...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            />
          </div>

          <button
            onClick={handleExportCSV}
            className='flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            <Download className='w-4 h-4' />
            Export CSV
          </button>

          <label className='flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer'>
            <Upload className='w-4 h-4' />
            {uploading ? 'Uploading...' : 'Upload CSV'}
            <input
              type='file'
              accept='.csv'
              onChange={handleFileUpload}
              disabled={uploading}
              className='hidden'
            />
          </label>
        </div>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg'>
          {error}
        </div>
      )}

      {loading ? (
        <div className='flex justify-center items-center h-64'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
        </div>
      ) : (
        <>
          <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Subscriber
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Created
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {filteredSubscriber.length === 0 ? (
                    <tr>
                      <td colSpan={4} className='px-6 py-8 text-center text-gray-500'>
                        <Mail className='w-12 h-12 mx-auto text-gray-300 mb-3' />
                        <p className='text-lg font-medium'>No subscribers found</p>
                        <p className='mt-1'>Upload a CSV file to get started</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriber.map(subscriber => (
                      <tr key={subscriber.id} className='hover:bg-gray-50 transition-colors'>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center'>
                            <div className='flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center'>
                              <User className='h-5 w-5 text-blue-600' />
                            </div>
                            <div className='ml-4'>
                              <div className='text-sm font-medium text-gray-900'>
                                {subscriber.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              subscriber.status === 'subscribed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {subscriber.status}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          <div className='flex items-center'>
                            <Calendar className='w-4 h-4 mr-2 text-gray-400' />
                            {formatDate(subscriber.createdAt)}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                          <div className='flex items-center gap-2'>
                            <button
                              onClick={() => handleDelete(subscriber.id)}
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
            {totalPage > 1 && (
              <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
                <div className='text-sm text-gray-700'>
                  Showing <span className='font-medium'>{(page - 1) * limit + 1}</span> to{' '}
                  <span className='font-medium'>{Math.min(page * limit, total)}</span> of{' '}
                  <span className='font-medium'>{total}</span> results
                </div>
                <div className='flex items-center space-x-2'>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className='px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPage) }, (_, i) => {
                    let pageNum
                    if (totalPage <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPage - 2) {
                      pageNum = totalPage - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPage, p + 1))}
                    disabled={page === totalPage}
                    className='px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Upload Instructions */}
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-6'>
            <h3 className='text-lg font-semibold text-blue-900 mb-2'>How to upload subscribers</h3>
            <ol className='list-decimal list-inside space-y-2 text-blue-800'>
              <li>Prepare a CSV file with columns: email, status (optional)</li>
              <li>
                Status should be either "subscribed" or "unsubscribed" (defaults to subscribed)
              </li>
              <li>Click "Upload CSV" button above to select your file</li>
              <li>Duplicates will be automatically skipped</li>
            </ol>
            <div className='mt-4 p-4 bg-white rounded border border-blue-100'>
              <pre className='text-sm text-gray-700'>
                {`email,status
john@example.com,subscribed
jane@example.com,unsubscribed
bob@example.com,subscribed`}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
