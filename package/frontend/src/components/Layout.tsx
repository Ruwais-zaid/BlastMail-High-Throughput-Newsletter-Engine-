import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Mail, PlusCircle } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path)
  }

  const navigation = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Subscribers', path: '/subscribers', icon: Users },
    { name: 'Campaigns', path: '/campaigns', icon: Mail },
    { name: 'New Campaign', path: '/campaigns/new', icon: PlusCircle },
  ]

  return (
    <div className='flex min-h-screen bg-gray-50'>
      {/* Sidebar */}
      <aside className='w-64 bg-gray-900 text-white flex flex-col'>
        <div className='p-6 border-b border-gray-800'>
          <div className='flex items-center space-x-3'>
            <div className='w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center'>
              <Mail className='w-5 h-5' />
            </div>
            <h1 className='text-xl font-bold'>BlastMail</h1>
          </div>
        </div>
        {/* Navigation */}
        <nav className='flex-1 p-4 space-y-1'>
          {navigation.map(item => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  active
                    ? 'bg-gray-800 text-white border-l-4 border-blue-500'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${active ? 'text-blue-400' : ''}`} />
                {item.name}
                {item.path === '/campaigns/new' && (
                  <span className='ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full'>
                    New
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className='flex-1 flex flex-col'>
        {/* Header */}
        <header className='bg-white border-b border-gray-200 px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-semibold text-gray-800'>
                {navigation.find(item => isActive(item.path))?.name || 'Dashboard'}
              </h2>
              <p className='text-sm text-gray-500 mt-1'>
                Manage your email campaigns and subscribers
              </p>
            </div>
            <div className='flex items-center space-x-4'>
              <button className='relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg'>
                <div className='w-2 h-2 bg-red-500 rounded-full absolute top-2 right-2'></div>
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
                  />
                </svg>
              </button>
              <div className='w-8 h-8 bg-gray-300 rounded-full'></div>
            </div>
          </div>
        </header>
        <main className='flex-1 p-6 overflow-auto'>{children}</main>
      </div>
    </div>
  )
}
