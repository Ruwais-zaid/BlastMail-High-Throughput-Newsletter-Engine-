import { Users, Mail, Send, PlusCircle, Upload } from 'lucide-react'

export function DashboardPage() {
  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Dashboard</h1>
        <p className='text-gray-600 mt-1'>Welcome to BlastMail</p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        {/* Total Subscribers */}
        <div className='bg-white p-4 rounded-lg border border-gray-200'>
          <div className='flex items-center'>
            <div className='p-2 bg-blue-100 rounded-lg'>
              <Users className='w-5 h-5 text-blue-600' />
            </div>
            <div className='ml-4'>
              <p className='text-sm text-gray-600'>Total Subscribers</p>
              <p className='text-2xl font-bold mt-1'>0</p>
              <p className='text-xs text-gray-500 mt-1'>+0 this week</p>
            </div>
          </div>
        </div>

        {/* Total Campaigns */}
        <div className='bg-white p-4 rounded-lg border border-gray-200'>
          <div className='flex items-center'>
            <div className='p-2 bg-green-100 rounded-lg'>
              <Mail className='w-5 h-5 text-green-600' />
            </div>
            <div className='ml-4'>
              <p className='text-sm text-gray-600'>Total Campaigns</p>
              <p className='text-2xl font-bold mt-1'>0</p>
              <p className='text-xs text-gray-500 mt-1'>0 scheduled</p>
            </div>
          </div>
        </div>

        {/* Emails Sent */}
        <div className='bg-white p-4 rounded-lg border border-gray-200'>
          <div className='flex items-center'>
            <div className='p-2 bg-purple-100 rounded-lg'>
              <Send className='w-5 h-5 text-purple-600' />
            </div>
            <div className='ml-4'>
              <p className='text-sm text-gray-600'>Emails Sent</p>
              <p className='text-2xl font-bold mt-1'>0</p>
              <p className='text-xs text-gray-500 mt-1'>This month</p>
            </div>
          </div>
        </div>
      </div>
      <div className='bg-white p-6 rounded-lg border border-gray-200'>
        <h2 className='text-lg font-semibold text-gray-900 mb-4'>Quick Start</h2>
        <ol className='space-y-4'>
          <li className='flex items-center gap-3'>
            <div className='w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold'>
              1
            </div>
            <div className='flex items-center gap-3'>
              <Upload className='w-4 h-4 text-gray-400' />
              <p className='text-gray-700'>Upload your subscriber list (CSV file)</p>
            </div>
          </li>
          <li className='flex items-center gap-3'>
            <div className='w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold'>
              2
            </div>
            <div className='flex items-center gap-3'>
              <PlusCircle className='w-4 h-4 text-gray-400' />
              <p className='text-gray-700'>Create your first email campaign</p>
            </div>
          </li>
          <li className='flex items-center gap-3'>
            <div className='w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold'>
              3
            </div>
            <p className='text-gray-700'>Schedule or send immediately</p>
          </li>
          <li className='flex items-center gap-3'>
            <div className='w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold'>
              4
            </div>
            <p className='text-gray-700'>Track open rates and engagement</p>
          </li>
        </ol>
      </div>
    </div>
  )
}

export default DashboardPage
